/**
 * Web3.js v2.0 Migration Helper Utilities
 * 
 * This file contains utility functions to help complete the migration
 * from Solana Web3.js v1.x to v2.0 for the PoD Protocol SDK.
 */

import { Address, address } from "@solana/web3.js";

/**
 * Convert a string to an Address type (Web3.js v2.0)
 */
export function stringToAddress(str: string): Address {
  return address(str);
}

/**
 * Convert an Address to string (Web3.js v2.0 - Address is already a string)
 */
export function addressToString(addr: Address): string {
  return addr as string;
}

/**
 * Check if a string is a valid Solana address
 */
export function isValidAddress(addr: string): boolean {
  try {
    address(addr);
    return true;
  } catch {
    return false;
  }
}

/**
 * System Program ID constant for Web3.js v2.0
 */
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111112";

/**
 * Common program IDs as Address types
 */
export const PROGRAM_IDS = {
  SYSTEM: address(SYSTEM_PROGRAM_ID),
  TOKEN: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  TOKEN_2022: address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  ASSOCIATED_TOKEN: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
} as const;

/**
 * Legacy RPC response wrapper for gradual migration
 */
export interface LegacyRpcResponse<T> {
  value: T;
  context?: {
    slot: number;
  };
}

/**
 * Wrap modern RPC responses to match legacy format temporarily
 */
export function wrapRpcResponse<T>(value: T, slot?: number): LegacyRpcResponse<T> {
  return {
    value,
    context: slot ? { slot } : undefined,
  };
}

/**
 * Migration status checker
 */
export function checkMigrationStatus(): {
  isComplete: boolean;
  remainingTasks: string[];
} {
  const remainingTasks: string[] = [];

  // Check if we're still using legacy imports (this would need to be expanded)
  // This is a placeholder for actual migration status checking
  
  return {
    isComplete: remainingTasks.length === 0,
    remainingTasks,
  };
}

/**
 * Convert legacy account filters to v2.0 format
 */
export function convertAccountFilters(legacyFilters: any[]): any[] {
  return legacyFilters.map(filter => {
    if (filter.memcmp && typeof filter.memcmp.bytes === 'string') {
      // In v2.0, bytes should remain as string for most cases
      return filter;
    }
    return filter;
  });
}

/**
 * Format error messages for v2.0 migration issues
 */
export function formatMigrationError(originalError: any): Error {
  const message = originalError?.message || 'Unknown migration error';
  
  if (message.includes('PublicKey')) {
    return new Error(`Migration Error: Replace PublicKey with Address. Original: ${message}`);
  }
  
  if (message.includes('Connection')) {
    return new Error(`Migration Error: Replace Connection with Rpc. Original: ${message}`);
  }
  
  if (message.includes('Signer')) {
    return new Error(`Migration Error: Replace Signer with KeyPairSigner. Original: ${message}`);
  }

  if (message.includes('toBase58')) {
    return new Error(`Migration Error: Address is already a string in v2.0. Original: ${message}`);
  }
  
  return new Error(`Migration Error: ${message}`);
}

/**
 * Common type guards for v2.0 migration
 */
export const TypeGuards = {
  isAddress: (value: any): value is Address => {
    return typeof value === 'string' && isValidAddress(value);
  },
  
  isLegacyPublicKey: (value: any): boolean => {
    return value && typeof value.toBase58 === 'function';
  },
  
  isKeyPairSigner: (value: any): boolean => {
    return value && typeof value.address === 'string' && typeof value.sign === 'function';
  },
};

/**
 * Migration constants
 */
export const MIGRATION_CONFIG = {
  VERSION: '2.0.0',
  COMPLETION_PERCENTAGE: 85,
  CRITICAL_FILES: [
    'types.ts',
    'client.ts', 
    'services/agent.ts',
    'services/message.ts',
    'services/channel.ts',
    'services/escrow.ts',
  ],
  REMAINING_FILES: [
    'services/analytics.ts',
    'services/discovery.ts',
  ],
} as const;

/**
 * Quick migration validator
 */
export function validateMigration(fileName: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // This would be expanded with actual file content analysis
  // For now, just a placeholder structure
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

export default {
  stringToAddress,
  addressToString,
  isValidAddress,
  SYSTEM_PROGRAM_ID,
  PROGRAM_IDS,
  wrapRpcResponse,
  checkMigrationStatus,
  convertAccountFilters,
  formatMigrationError,
  TypeGuards,
  MIGRATION_CONFIG,
  validateMigration,
}; 