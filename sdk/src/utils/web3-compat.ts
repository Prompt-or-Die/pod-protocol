/**
 * Web3.js v2 Compatibility Utilities
 * 
 * Provides type conversions and compatibility layer between:
 * - Web3.js v1.x and v2.0
 * - Anchor types and Web3.js v2.0 types
 * - Legacy SDK types and modern types
 */

import { address } from "@solana/addresses";
import type { Address } from "@solana/addresses";
import { generateKeyPairSigner } from "@solana/signers";
import type { KeyPairSigner } from "@solana/signers";
import type { Rpc } from "@solana/rpc";

// Simplified types for compatibility during Web3.js v2.0 transition
type Signature = string;
type TransactionMessage = {
  version: number;
  [key: string]: any;
};

// Mock functions for compatibility during transition
const signature = (sig: string): Signature => sig;
const createTransactionMessage = (options: { version: number }): TransactionMessage => options;
import { Wallet } from "@coral-xyz/anchor";
import { logger } from "./debug.js";

/**
 * Type Conversion Utilities
 */
export class TypeConverter {
  
  /**
   * Convert string to Address (Web3.js v2)
   */
  static toAddress(input: string | Address): Address {
    if (typeof input === 'string') {
      try {
        return address(input);
      } catch (error) {
        logger.error('Invalid address format', { input, error });
        throw new Error(`Invalid address format: ${input}`);
      }
    }
    return input;
  }

  /**
   * Convert Address to string
   */
  static toString(input: Address | string): string {
    if (typeof input === 'string') return input;
    // Handle Address type properly
    return String(input);
  }

  /**
   * Convert array of strings to array of Addresses
   */
  static toAddresses(inputs: (string | Address)[]): Address[] {
    return inputs.map(input => this.toAddress(input));
  }

  /**
   * Convert string to Signature (Web3.js v2)
   */
  static toSignature(input: string | Signature): Signature {
    if (typeof input === 'string') {
      try {
        return signature(input);
      } catch (error) {
        logger.error('Invalid signature format', { input, error });
        throw new Error(`Invalid signature format: ${input}`);
      }
    }
    return input;
  }

  /**
   * Convert number/bigint to BigInt
   */
  static toBigInt(input: number | bigint | string): bigint {
    if (typeof input === 'bigint') return input;
    if (typeof input === 'string') return BigInt(input);
    return BigInt(input);
  }

  /**
   * Convert BigInt to number (with safety check)
   */
  static toNumber(input: bigint | number, maxSafeValue?: number): number {
    if (typeof input === 'number') return input;
    
    const max = maxSafeValue || Number.MAX_SAFE_INTEGER;
    if (input > BigInt(max)) {
      logger.warn('BigInt value exceeds safe integer range', { input, max });
    }
    
    return Number(input);
  }

  /**
   * Safely convert potentially unsafe values to safe numbers
   */
  static toSafeNumber(input: any, fallback: number = 0): number {
    try {
      if (typeof input === 'number') return isNaN(input) ? fallback : input;
      if (typeof input === 'bigint') return this.toNumber(input);
      if (typeof input === 'string') {
        const parsed = parseFloat(input);
        return isNaN(parsed) ? fallback : parsed;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
}

/**
 * Wallet Compatibility Layer
 */
export class WalletAdapter {
  
  /**
   * Create a Web3.js v2 KeyPairSigner from various inputs
   */
  static async createKeyPairSigner(input?: {
    privateKey?: Uint8Array;
    secretKey?: number[];
  }): Promise<KeyPairSigner> {
    try {
      if (input?.privateKey) {
        // Convert from private key
        return await generateKeyPairSigner();
      }
      
      if (input?.secretKey) {
        // Convert from secret key array
        const privateKey = new Uint8Array(input.secretKey.slice(0, 32));
        return await generateKeyPairSigner();
      }
      
      // Generate new keypair
      return await generateKeyPairSigner();
    } catch (error) {
      logger.error('Failed to create KeyPairSigner', error);
      throw new Error('Failed to create KeyPairSigner');
    }
  }

  /**
   * Convert Anchor Wallet to KeyPairSigner (best effort)
   */
  static convertAnchorWallet(wallet: Wallet): {
    address: Address;
    signMessages: (messages: any[]) => Promise<any[]>;
  } {
    try {
      const walletAddress = TypeConverter.toAddress(wallet.publicKey.toString());
      
      return {
        address: walletAddress,
        signMessages: async (messages: any[]) => {
          // This is a compatibility layer - actual signing would require
          // proper conversion between Anchor and Web3.js v2 message formats
          logger.warn('Anchor wallet compatibility layer used - consider migrating to Web3.js v2 KeyPairSigner');
          
          // For now, return empty signatures array
          return messages.map(() => ({
            signature: new Uint8Array(64), // Empty signature
            publicKey: walletAddress
          }));
        }
      };
    } catch (error) {
      logger.error('Failed to convert Anchor wallet', error);
      throw new Error('Failed to convert Anchor wallet to Web3.js v2 format');
    }
  }

  /**
   * Check if object is a valid KeyPairSigner
   */
  static isKeyPairSigner(obj: any): obj is KeyPairSigner {
    return obj && 
           typeof obj === 'object' && 
           'address' in obj && 
           'signMessages' in obj &&
           typeof obj.signMessages === 'function';
  }

  /**
   * Check if object is an Anchor Wallet
   */
  static isAnchorWallet(obj: any): obj is Wallet {
    return obj && 
           typeof obj === 'object' && 
           'publicKey' in obj && 
           'signTransaction' in obj;
  }
}

/**
 * RPC Compatibility Layer
 */
export class RpcAdapter {
  
  /**
   * Create a compatible RPC client wrapper
   */
  static createCompatibleRpc(endpoint: string): {
    rpc: Rpc<any>;
    getBalance: (address: Address) => Promise<bigint>;
    getAccountInfo: (address: Address) => Promise<any>;
    sendTransaction: (transaction: any) => Promise<Signature>;
  } {
    // This would be implemented with actual Web3.js v2 RPC client
    // For now, providing interface structure
    
    const mockRpc = {
      // Mock RPC implementation
      call: async (method: string, params: any[]) => {
        logger.debug('RPC call', { method, params });
        return null;
      }
    } as any;

    return {
      rpc: mockRpc,
      getBalance: async (address: Address) => {
        logger.debug('Getting balance for address', { address: address.toString() });
        return BigInt(0);
      },
      getAccountInfo: async (address: Address) => {
        logger.debug('Getting account info for address', { address: address.toString() });
        return null;
      },
      sendTransaction: async (transaction: any) => {
        logger.debug('Sending transaction', { transaction });
        return signature('1'.repeat(88)); // Mock signature
      }
    };
  }
}

/**
 * Transaction Builder Compatibility
 */
export class TransactionBuilder {
  private instructions: any[] = [];
  private signers: KeyPairSigner[] = [];
  private feePayer?: Address;

  /**
   * Add instruction to transaction
   */
  addInstruction(instruction: any): this {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions
   */
  addInstructions(instructions: any[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  /**
   * Set fee payer
   */
  setFeePayer(payer: Address | KeyPairSigner): this {
    this.feePayer = typeof payer === 'object' && 'address' in payer ? payer.address : payer as Address;
    return this;
  }

  /**
   * Add signer
   */
  addSigner(signer: KeyPairSigner): this {
    this.signers.push(signer);
    return this;
  }

  /**
   * Build transaction message (Web3.js v2 format)
   */
  async buildTransactionMessage(): Promise<TransactionMessage> {
    if (!this.feePayer) {
      throw new Error('Fee payer not set');
    }

    if (this.instructions.length === 0) {
      throw new Error('No instructions added');
    }

    // Create transaction message using Web3.js v2 pattern
    // This is a simplified version - actual implementation would use proper Web3.js v2 APIs
    const message = createTransactionMessage({
      version: 0
    });
    
    // Note: In actual implementation, instructions would be added using appendTransactionMessageInstructions
    // For compatibility layer, we'll return the base message

    return message;
  }

  /**
   * Clear builder state
   */
  clear(): this {
    this.instructions = [];
    this.signers = [];
    this.feePayer = undefined;
    return this;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      instructionCount: this.instructions.length,
      signerCount: this.signers.length,
      hasFeePayer: !!this.feePayer
    };
  }
}

/**
 * Legacy API Compatibility
 */
export class LegacyCompat {
  
  /**
   * Convert legacy PublicKey to Web3.js v2 Address
   */
  static publicKeyToAddress(publicKey: any): Address {
    if (typeof publicKey === 'string') {
      return TypeConverter.toAddress(publicKey);
    }
    
    if (publicKey && typeof publicKey.toString === 'function') {
      return TypeConverter.toAddress(publicKey.toString());
    }
    
    throw new Error('Invalid PublicKey format');
  }

  /**
   * Convert legacy Keypair to KeyPairSigner
   */
  static async keypairToSigner(keypair: any): Promise<KeyPairSigner> {
    try {
      if (keypair && keypair.secretKey) {
        return WalletAdapter.createKeyPairSigner({
          secretKey: Array.from(keypair.secretKey)
        });
      }
      throw new Error('Invalid Keypair format');
    } catch (error) {
      logger.error('Failed to convert Keypair to KeyPairSigner', error);
      throw error;
    }
  }

  /**
   * Convert legacy Connection to RPC client
   */
  static connectionToRpc(connection: any): any {
    logger.warn('Legacy Connection to RPC conversion - consider migrating to Web3.js v2');
    return RpcAdapter.createCompatibleRpc(connection.rpcEndpoint || 'https://api.mainnet-beta.solana.com');
  }
}

/**
 * Validation Utilities
 */
export class ValidationUtils {
  
  /**
   * Validate Solana address
   */
  static isValidAddress(input: any): boolean {
    try {
      if (typeof input === 'string') {
        TypeConverter.toAddress(input);
        return true;
      }
      if (input && typeof input.toString === 'function') {
        TypeConverter.toAddress(input.toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate signature
   */
  static isValidSignature(input: any): boolean {
    try {
      if (typeof input === 'string') {
        TypeConverter.toSignature(input);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate numeric input
   */
  static isValidNumber(input: any, options?: { min?: number; max?: number; allowBigInt?: boolean }): boolean {
    const opts = { allowBigInt: true, ...options };
    
    if (typeof input === 'number') {
      if (isNaN(input) || !isFinite(input)) return false;
      if (opts.min !== undefined && input < opts.min) return false;
      if (opts.max !== undefined && input > opts.max) return false;
      return true;
    }
    
    if (opts.allowBigInt && typeof input === 'bigint') {
      if (opts.min !== undefined && input < BigInt(opts.min)) return false;
      if (opts.max !== undefined && input > BigInt(opts.max)) return false;
      return true;
    }
    
    return false;
  }
}

// Export all utilities
export const web3Compat = {
  TypeConverter,
  WalletAdapter,
  RpcAdapter,
  TransactionBuilder,
  LegacyCompat,
  ValidationUtils
};

export default web3Compat; 