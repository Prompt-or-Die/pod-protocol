/**
 * Type-safe IDL wrapper for PoD Protocol
 * This file provides type-safe wrappers to handle Anchor IDL compatibility issues
 */

import type { Idl, IdlAccounts } from "@coral-xyz/anchor";

// Create a more compatible IDL type
export interface CompatibleIdl extends Idl {
  instructions: any[];
  accounts?: any[];
  types?: any[];
  errors?: any[];
  events?: any[];
  constants?: any[];
}

// Type-safe account types
export interface AgentAccount {
  publicKey: string;
  capabilities: number;
  metadataUri: string;
  owner: string;
  createdAt: number;
  updatedAt: number;
  invitesSent: number;
  lastInviteAt: number;
}

export interface ChannelAccount {
  name: string;
  description: string;
  creator: string;
  visibility: any;
  maxParticipants: number;
  feePerMessage: number;
  createdAt: number;
  updatedAt: number;
}

export interface MessageAccount {
  channel: string;
  sender: string;
  messageType: any;
  content: string;
  timestamp: number;
  replyTo?: string;
}

export interface EscrowAccount {
  depositor: string;
  recipient: string;
  amount: number;
  isReleased: boolean;
  createdAt: number;
}

// Generic account wrapper
export interface AccountWrapper<T = any> {
  publicKey: string;
  account: T;
}

// Type guards
export function isAgentAccount(account: any): account is AgentAccount {
  return account && typeof account.publicKey === 'string' && typeof account.capabilities === 'number';
}

export function isChannelAccount(account: any): account is ChannelAccount {
  return account && typeof account.name === 'string' && typeof account.creator === 'string';
}

export function isMessageAccount(account: any): account is MessageAccount {
  return account && typeof account.channel === 'string' && typeof account.sender === 'string';
}

export function isEscrowAccount(account: any): account is EscrowAccount {
  return account && typeof account.depositor === 'string' && typeof account.amount === 'number';
}
