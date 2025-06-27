import { verify } from '@noble/ed25519';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export interface SolanaAuthMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

export class SolanaAuthUtils {
  /**
   * Verify a Solana wallet signature
   */
  static async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // Validate public key format
      new PublicKey(publicKey);
      
      // Decode signature and public key from base58
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);
      const messageBytes = new TextEncoder().encode(message);
      
      // Verify using tweetnacl (Solana's preferred method)
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Create a Sign-In with Solana (SIWS) message
   */
  static createAuthMessage(
    address: string,
    domain: string,
    nonce: string,
    issuedAt?: string
  ): string {
    const timestamp = issuedAt || new Date().toISOString();
    
    return `${domain} wants you to sign in with your Solana account:
${address}

Welcome to PoD Protocol! Click to sign in and accept the PoD Protocol Terms of Service.

URI: https://${domain}
Version: 1
Chain ID: mainnet
Nonce: ${nonce}
Issued At: ${timestamp}`;
  }

  /**
   * Generate a random nonce for authentication
   */
  static generateNonce(): string {
    return bs58.encode(crypto.getRandomValues(new Uint8Array(32)));
  }

  /**
   * Validate Solana public key format
   */
  static isValidPublicKey(publicKey: string): boolean {
    try {
      new PublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse and validate auth message format
   */
  static parseAuthMessage(message: string): SolanaAuthMessage | null {
    try {
      const lines = message.split('\n');
      if (lines.length < 6) return null;

      const domainMatch = lines[0].match(/^(.+) wants you to sign in/);
      const addressMatch = lines[1];
      const statement = lines[3];
      
      let uri = '', version = '', chainId = '', nonce = '', issuedAt = '';
      
      for (let i = 4; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('URI: ')) uri = line.substring(5);
        else if (line.startsWith('Version: ')) version = line.substring(9);
        else if (line.startsWith('Chain ID: ')) chainId = line.substring(10);
        else if (line.startsWith('Nonce: ')) nonce = line.substring(7);
        else if (line.startsWith('Issued At: ')) issuedAt = line.substring(11);
      }

      if (!domainMatch || !addressMatch || !uri || !version || !nonce || !issuedAt) {
        return null;
      }

      return {
        domain: domainMatch[1],
        address: addressMatch,
        statement,
        uri,
        version,
        chainId,
        nonce,
        issuedAt
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate message expiration
   */
  static isMessageExpired(message: SolanaAuthMessage, maxAgeMinutes: number = 10): boolean {
    const issuedAt = new Date(message.issuedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - issuedAt.getTime()) / (1000 * 60);
    
    return diffMinutes > maxAgeMinutes;
  }
} 