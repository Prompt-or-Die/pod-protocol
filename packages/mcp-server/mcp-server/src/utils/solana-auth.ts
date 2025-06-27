/**
 * Solana Authentication Utilities for MCP Server
 * Handles wallet signature verification and message parsing
 */

import { PublicKey } from '@solana/web3.js';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';

export interface ParsedAuthMessage {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version: string;
  chainId?: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export class SolanaAuthUtils {
  /**
   * Generate a cryptographically secure nonce
   */
  static generateNonce(): string {
    return bs58.encode(randomBytes(32));
  }

  /**
   * Create authentication message following SIWS (Sign-In with Solana) standard
   */
  static createAuthMessage(
    address: string,
    domain: string,
    nonce: string,
    options: {
      statement?: string;
      uri?: string;
      version?: string;
      chainId?: string;
      issuedAt?: string;
      expirationTime?: string;
      notBefore?: string;
      requestId?: string;
      resources?: string[];
    } = {}
  ): string {
    const {
      statement = 'Sign in to PoD Protocol MCP Server',
      uri,
      version = '1',
      chainId,
      issuedAt = new Date().toISOString(),
      expirationTime,
      notBefore,
      requestId,
      resources = []
    } = options;

    let message = `${domain} wants you to sign in with your Solana account:\n`;
    message += `${address}\n`;
    
    if (statement) {
      message += `\n${statement}\n`;
    }
    
    if (uri) {
      message += `\nURI: ${uri}`;
    }
    
    message += `\nVersion: ${version}`;
    
    if (chainId) {
      message += `\nChain ID: ${chainId}`;
    }
    
    message += `\nNonce: ${nonce}`;
    message += `\nIssued At: ${issuedAt}`;
    
    if (expirationTime) {
      message += `\nExpiration Time: ${expirationTime}`;
    }
    
    if (notBefore) {
      message += `\nNot Before: ${notBefore}`;
    }
    
    if (requestId) {
      message += `\nRequest ID: ${requestId}`;
    }
    
    if (resources.length > 0) {
      message += `\nResources:`;
      resources.forEach(resource => {
        message += `\n- ${resource}`;
      });
    }

    return message;
  }

  /**
   * Parse authentication message
   */
  static parseAuthMessage(message: string): ParsedAuthMessage | null {
    try {
      const lines = message.split('\n');
      
      if (lines.length < 6) {
        return null;
      }

      // Extract domain and address from first two lines
      const domain = lines[0].split(' wants you to sign in')[0];
      const address = lines[1];

      if (!domain || !address) {
        return null;
      }

      const result: ParsedAuthMessage = {
        domain,
        address,
        version: '1',
        nonce: '',
        issuedAt: ''
      };

      // Parse key-value pairs
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') continue;
        
        if (line.startsWith('URI: ')) {
          result.uri = line.substring(5);
        } else if (line.startsWith('Version: ')) {
          result.version = line.substring(9);
        } else if (line.startsWith('Chain ID: ')) {
          result.chainId = line.substring(10);
        } else if (line.startsWith('Nonce: ')) {
          result.nonce = line.substring(7);
        } else if (line.startsWith('Issued At: ')) {
          result.issuedAt = line.substring(11);
        } else if (line.startsWith('Expiration Time: ')) {
          result.expirationTime = line.substring(17);
        } else if (line.startsWith('Not Before: ')) {
          result.notBefore = line.substring(12);
        } else if (line.startsWith('Request ID: ')) {
          result.requestId = line.substring(12);
        } else if (line === 'Resources:') {
          result.resources = [];
          // Parse resources list
          for (let j = i + 1; j < lines.length; j++) {
            const resourceLine = lines[j].trim();
            if (resourceLine.startsWith('- ')) {
              result.resources.push(resourceLine.substring(2));
            }
          }
          break;
        } else if (!line.includes(':') && result.statement === undefined) {
          // This might be the statement
          result.statement = line;
        }
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify Solana wallet signature
   */
  static async verifySignature(
    message: string,
    signature: string | number[],
    publicKeyString: string
  ): Promise<boolean> {
    try {
      // Validate public key format
      if (!this.isValidPublicKey(publicKeyString)) {
        return false;
      }

      const publicKey = new PublicKey(publicKeyString);
      
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Convert signature to Uint8Array
      let signatureBytes: Uint8Array;
      if (typeof signature === 'string') {
        try {
          // Try base58 decode first
          signatureBytes = bs58.decode(signature);
        } catch {
          // If that fails, try hex decode
          signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
        }
      } else {
        signatureBytes = new Uint8Array(signature);
      }

      // Verify signature using ed25519
      const isValid = await ed25519.verify(
        signatureBytes,
        messageBytes,
        publicKey.toBytes()
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Validate Solana public key format
   */
  static isValidPublicKey(publicKey: string): boolean {
    try {
      const key = new PublicKey(publicKey);
      return PublicKey.isOnCurve(key.toBytes());
    } catch {
      return false;
    }
  }

  /**
   * Check if authentication message has expired
   */
  static isMessageExpired(parsedMessage: ParsedAuthMessage, maxAgeMinutes: number = 10): boolean {
    if (!parsedMessage.issuedAt) {
      return true;
    }

    try {
      const issuedAt = new Date(parsedMessage.issuedAt);
      const now = new Date();
      const ageMinutes = (now.getTime() - issuedAt.getTime()) / (1000 * 60);
      
      return ageMinutes > maxAgeMinutes;
    } catch {
      return true;
    }
  }

  /**
   * Create OAuth 2.1 compatible JWT token
   */
  static createAuthToken(
    userId: string,
    walletAddress: string,
    publicKey: string,
    permissions: string[],
    secret: string,
    options: {
      expiresIn?: string;
      issuer?: string;
      audience?: string;
    } = {}
  ): string {
    const jwt = require('jsonwebtoken');
    
    const payload = {
      userId,
      walletAddress,
      publicKey,
      scope: permissions.join(' '),
      type: 'access_token',
      iat: Math.floor(Date.now() / 1000)
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || '24h',
      issuer: options.issuer || 'pod-protocol-mcp',
      audience: options.audience || 'pod-protocol-users'
    };

    return jwt.sign(payload, secret, tokenOptions);
  }

  /**
   * Verify and decode JWT token
   */
  static verifyAuthToken(token: string, secret: string): any {
    const jwt = require('jsonwebtoken');
    
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate session ID with entropy
   */
  static generateSessionId(prefix: string = 'pod_mcp'): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }
}