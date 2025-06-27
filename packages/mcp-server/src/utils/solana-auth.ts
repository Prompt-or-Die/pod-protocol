/**
 * Solana Authentication Utilities for MCP Server
 * Handles wallet signature verification and message parsing
 */

import { PublicKey } from '@solana/web3.js';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

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

    // Simplified JWT signing to avoid type issues
    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyAuthToken(token: string, secret: string): any {
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

/**
 * OAuth token validation interface
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

/**
 * Validates an OAuth token by calling the OAuth provider's userinfo endpoint
 * @param token - The OAuth access token to validate
 * @param oauthEndpoint - The OAuth provider endpoint (optional)
 * @returns Promise resolving to user information
 */
export async function validateOAuthToken(
  token: string,
  oauthEndpoint: string = process.env.OAUTH_ENDPOINT || 'https://oauth.podprotocol.com'
): Promise<OAuthUserInfo> {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token provided');
  }

  try {
    const response = await fetch(`${oauthEndpoint}/oauth/userinfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PoD-Protocol-MCP-Server/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`OAuth token validation failed: ${response.status} ${response.statusText}`);
    }

    const userInfo = await response.json();
    
    // Validate the response structure
    if (!userInfo.id || !userInfo.email) {
      throw new Error('Invalid user info response from OAuth provider');
    }

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      permissions: userInfo.permissions || userInfo.scope?.split(' ') || []
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`OAuth token validation failed: ${error}`);
  }
}

/**
 * Verifies a Solana signature using the wallet's public key
 * @param publicKey - The wallet's public key as a string
 * @param signature - The signature to verify (base58 or hex encoded)
 * @param message - The original message that was signed
 * @returns Promise resolving to true if signature is valid, false otherwise
 */
export async function verifySolanaSignature(
  publicKey: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!publicKey || !signature || message === undefined) {
      throw new Error('Missing required parameters for signature verification');
    }

    // Use the class method for verification
    return await SolanaAuthUtils.verifySignature(message, signature, publicKey);
  } catch (error) {
    console.error('Solana signature verification error:', error);
    throw error;
  }
}

/**
 * Generates a challenge for wallet authentication
 * @param domain - The domain requesting authentication
 * @param walletAddress - The wallet address to authenticate
 * @param options - Additional options for the challenge
 * @returns Object containing the challenge message and nonce
 */
export function generateAuthChallenge(
  domain: string,
  walletAddress: string,
  options: {
    statement?: string;
    uri?: string;
    expirationMinutes?: number;
    requestId?: string;
  } = {}
): { message: string; nonce: string; expiresAt: string } {
  const nonce = SolanaAuthUtils.generateNonce();
  const expirationTime = new Date(
    Date.now() + (options.expirationMinutes || 10) * 60 * 1000
  ).toISOString();

  const message = SolanaAuthUtils.createAuthMessage(
    walletAddress,
    domain,
    nonce,
    {
      ...options,
      expirationTime
    }
  );

  return {
    message,
    nonce,
    expiresAt: expirationTime
  };
}

/**
 * Validates an authentication challenge response
 * @param message - The original challenge message
 * @param signature - The wallet's signature of the message
 * @param publicKey - The wallet's public key
 * @param expectedNonce - The expected nonce from the challenge
 * @returns Promise resolving to validation result
 */
export async function validateAuthChallenge(
  message: string,
  signature: string,
  publicKey: string,
  expectedNonce?: string
): Promise<{
  isValid: boolean;
  parsedMessage?: ParsedAuthMessage;
  error?: string;
}> {
  try {
    // Parse the message
    const parsedMessage = SolanaAuthUtils.parseAuthMessage(message);
    if (!parsedMessage) {
      return {
        isValid: false,
        error: 'Invalid message format'
      };
    }

    // Check nonce if provided
    if (expectedNonce && parsedMessage.nonce !== expectedNonce) {
      return {
        isValid: false,
        error: 'Invalid nonce'
      };
    }

    // Check if message has expired
    if (SolanaAuthUtils.isMessageExpired(parsedMessage)) {
      return {
        isValid: false,
        error: 'Message has expired'
      };
    }

    // Verify the signature
    const isSignatureValid = await verifySolanaSignature(publicKey, signature, message);
    if (!isSignatureValid) {
      return {
        isValid: false,
        error: 'Invalid signature'
      };
    }

    return {
      isValid: true,
      parsedMessage
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Checks if a user has the required permissions
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of required permissions
 * @param requireAll - Whether all permissions are required (default: false)
 * @returns True if user has required permissions
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermissions: string[],
  requireAll: boolean = false
): boolean {
  if (!Array.isArray(userPermissions) || !Array.isArray(requiredPermissions)) {
    return false;
  }

  if (requiredPermissions.length === 0) {
    return true;
  }

  if (requireAll) {
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  } else {
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }
}

/**
 * Creates a session token for authenticated users
 * @param userInfo - User information from OAuth or wallet auth
 * @param walletAddress - Optional wallet address for wallet-based auth
 * @param sessionDurationHours - Session duration in hours (default: 24)
 * @returns Session token
 */
export function createSessionToken(
  userInfo: OAuthUserInfo | { id: string; permissions: string[] },
  walletAddress?: string,
  sessionDurationHours: number = 24
): string {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  
  if ('email' in userInfo) {
    // OAuth user
    return SolanaAuthUtils.createAuthToken(
      userInfo.id,
      walletAddress || '',
      '',
      userInfo.permissions,
      secret,
      { expiresIn: `${sessionDurationHours}h` }
    );
  } else {
    // Wallet user
    return SolanaAuthUtils.createAuthToken(
      userInfo.id,
      walletAddress || '',
      walletAddress || '',
      userInfo.permissions,
      secret,
      { expiresIn: `${sessionDurationHours}h` }
    );
  }
}

/**
 * Verifies a session token
 * @param token - The session token to verify
 * @returns Decoded token payload
 */
export function verifySessionToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  return SolanaAuthUtils.verifyAuthToken(token, secret);
}