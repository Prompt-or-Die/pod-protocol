import { Address, address } from "@solana/web3.js";
import { PROGRAM_ID, MessageType, AGENT_CAPABILITIES } from "./types";

// Re-export types for convenience
export { MessageType } from "./types";

/**
 * Calculate PDA for an agent account
 */
export function findAgentPDA(
  wallet: Address,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // Note: In Web3.js v2, PDA finding needs to be implemented differently
  // This is a placeholder that should be updated with the actual v2 implementation
  const seeds = [
    Buffer.from("agent"),
    Buffer.from(wallet), // Address needs to be converted to buffer properly
  ];
  
  // TODO: Implement proper PDA finding with Web3.js v2
  // For now, return a mock address and bump
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Calculate PDA for a message account
 */
export function findMessagePDA(
  messageId: string,
  senderAgent: Address,
  recipient: Address,
  timestamp: number,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // TODO: Implement proper PDA finding with Web3.js v2
  const seeds = [
    Buffer.from("message"),
    Buffer.from(messageId),
    Buffer.from(senderAgent),
    Buffer.from(recipient),
    Buffer.from(timestamp.toString()),
  ];
  
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Calculate PDA for a channel account
 */
export function findChannelPDA(
  channelId: string,
  creator: Address,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // TODO: Implement proper PDA finding with Web3.js v2
  const seeds = [
    Buffer.from("channel"),
    Buffer.from(channelId),
    Buffer.from(creator),
  ];
  
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Calculate PDA for an escrow account
 */
export function findEscrowPDA(
  channel: Address,
  depositor: Address,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // TODO: Implement proper PDA finding with Web3.js v2
  const seeds = [
    Buffer.from("escrow"),
    Buffer.from(channel),
    Buffer.from(depositor),
  ];
  
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Convert MessageType enum to numeric ID
 */
export function getMessageTypeId(
  messageType: MessageType,
  customValue?: number,
): number {
  switch (messageType) {
    case MessageType.Text:
      return 0;
    case MessageType.Data:
      return 1;
    case MessageType.Command:
      return 2;
    case MessageType.Response:
      return 3;
    case MessageType.Custom:
      return 4 + (customValue ?? 0);
    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }
}

/**
 * Convert numeric ID back to MessageType
 */
export function getMessageTypeFromId(id: number): {
  type: MessageType;
  customValue?: number;
} {
  if (id === 0) return { type: MessageType.Text };
  if (id === 1) return { type: MessageType.Data };
  if (id === 2) return { type: MessageType.Command };
  if (id === 3) return { type: MessageType.Response };
  if (id >= 4) return { type: MessageType.Custom, customValue: id - 4 };

  throw new Error(`Unknown message type ID: ${id}`);
}

/**
 * Convert MessageType enum to program format (object with empty record)
 */
export function convertMessageTypeToProgram(
  messageType: MessageType,
  customValue?: number,
): any {
  switch (messageType) {
    case MessageType.Text:
      return { text: {} };
    case MessageType.Data:
      return { data: {} };
    case MessageType.Command:
      return { command: {} };
    case MessageType.Response:
      return { response: {} };
    case MessageType.Custom:
      return { custom: customValue || 0 };
    default:
      return { text: {} };
  }
}

/**
 * Convert program format back to MessageType enum
 */
export function convertMessageTypeFromProgram(programType: any): {
  type: MessageType;
  customValue?: number;
} {
  if (programType.text !== undefined) return { type: MessageType.Text };
  if (programType.data !== undefined) return { type: MessageType.Data };
  if (programType.command !== undefined) return { type: MessageType.Command };
  if (programType.response !== undefined) return { type: MessageType.Response };
  if (programType.custom !== undefined)
    return { type: MessageType.Custom, customValue: programType.custom };
  return { type: MessageType.Text };
}

/**
 * Handle legacy object-based message type format for backward compatibility
 */
export function getMessageTypeIdFromObject(msg: any): number {
  if (msg.text !== undefined) return 0;
  if (msg.data !== undefined) return 1;
  if (msg.command !== undefined) return 2;
  if (msg.response !== undefined) return 3;
  if (typeof msg.custom === "number") return 4 + msg.custom;
  return 0;
}

/**
 * Create a SHA-256 hash of message payload
 */
export async function hashPayload(
  payload: string | Uint8Array,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = typeof payload === "string" ? encoder.encode(payload) : payload;

  // Use Web Crypto API for hashing
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
  }

  // Fallback for Node.js environment
  if (typeof require !== "undefined") {
    try {
      const crypto = require("crypto");
      const hash = crypto.createHash("sha256");
      hash.update(data);
      return new Uint8Array(hash.digest());
    } catch (e) {
      // Fall back to a simple hashing algorithm if crypto is not available
      console.warn(
        "Using fallback hash function. Consider using a proper crypto library.",
      );
      return simpleHash(data);
    }
  }

  // Simple fallback hash (not cryptographically secure)
  return simpleHash(data);
}

/**
 * Simple hash function fallback (not cryptographically secure)
 */
function simpleHash(data: Uint8Array): Uint8Array {
  const hash = new Uint8Array(32);
  let a = 1,
    b = 0;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }

  // Fill the hash array with computed values
  for (let i = 0; i < 32; i++) {
    hash[i] = (a + b + i) % 256;
  }

  return hash;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError!;
}

/**
 * Check if an agent has a specific capability
 */
export function hasCapability(
  capabilities: number,
  capability: number,
): boolean {
  return (capabilities & capability) === capability;
}

/**
 * Add a capability to an agent's capabilities bitmask
 */
export function addCapability(
  capabilities: number,
  capability: number,
): number {
  return capabilities | capability;
}

/**
 * Remove a capability from an agent's capabilities bitmask
 */
export function removeCapability(
  capabilities: number,
  capability: number,
): number {
  return capabilities & ~capability;
}

/**
 * Get capability names from bitmask
 */
export function getCapabilityNames(capabilities: number): string[] {
  const names: string[] = [];
  const capabilityMap = {
    1: "TRADING",
    2: "ANALYSIS",
    4: "DATA_PROCESSING",
    8: "CONTENT_GENERATION",
    16: "CUSTOM_1",
    32: "CUSTOM_2",
    64: "CUSTOM_3",
    128: "CUSTOM_4",
  };

  for (const [bit, name] of Object.entries(capabilityMap)) {
    if (hasCapability(capabilities, parseInt(bit))) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number, decimals: number = 9): number {
  return lamports / Math.pow(10, decimals);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * Math.pow(10, 9));
}

/**
 * Check if a string is a valid Solana public key
 */
export function isValidAddress(addressString: string): boolean {
  try {
    address(addressString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert timestamp to number, handling BN and other formats
 */
export function convertTimestamp(timestamp: any, fallback?: any): number {
  if (timestamp && typeof timestamp.toNumber === "function") {
    return timestamp.toNumber();
  }
  if (fallback && typeof fallback.toNumber === "function") {
    return fallback.toNumber();
  }
  return timestamp || fallback || Date.now();
}

/**
 * Get timestamp from account data
 */
export function getAccountTimestamp(account: any): number {
  return convertTimestamp(account.timestamp, account.createdAt);
}

/**
 * Get creation timestamp from account data
 */
export function getAccountCreatedAt(account: any): number {
  return convertTimestamp(account.createdAt, account.timestamp);
}

/**
 * Get last updated timestamp from account data
 */
export function getAccountLastUpdated(account: any): number {
  return convertTimestamp(account.lastUpdated, account.updatedAt);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a public key for display (show first 4 and last 4 characters)
 */
export function formatAddress(addr: Address | string, short: boolean = true): string {
  const addressStr = typeof addr === 'string' ? addr : String(addr);
  if (!short) return addressStr;
  
  return `${addressStr.slice(0, 4)}...${addressStr.slice(-4)}`;
}

/**
 * Validate and parse a message type string
 */
export function parseMessageType(typeStr: string): MessageType {
  const normalized = typeStr.toLowerCase();
  switch (normalized) {
    case "text":
      return MessageType.Text;
    case "data":
      return MessageType.Data;
    case "command":
      return MessageType.Command;
    case "response":
      return MessageType.Response;
    case "custom":
      return MessageType.Custom;
    default:
      throw new Error(`Invalid message type: ${typeStr}`);
  }
}

/**
 * Generate a unique message ID for tracking
 */
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Calculate the estimated fee for a transaction
 */
export function estimateTransactionFee(
  messageLength: number,
  baseFee: number = 5000,
): number {
  // Base fee + per-byte fee
  const perByteFee = 10;
  return baseFee + messageLength * perByteFee;
}

/**
 * Convert duration to human readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Validate capability combination
 */
export function validateCapabilities(capabilities: number): boolean {
  // Must be non-negative and within valid range (0-255 for 8 bits)
  return capabilities >= 0 && capabilities <= 255;
}

/**
 * Get channel visibility string
 */
export function getVisibilityString(visibility: any): string {
  if (typeof visibility === "object") {
    if (visibility.public !== undefined) return "Public";
    if (visibility.private !== undefined) return "Private";
  }
  return typeof visibility === "string" ? visibility : "Public";
}

/**
 * Calculate PDA for a channel participant
 */
export function findParticipantPDA(
  channel: Address,
  agent: Address,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // TODO: Implement proper PDA finding with Web3.js v2
  const seeds = [
    Buffer.from("participant"),
    Buffer.from(channel),
    Buffer.from(agent),
  ];
  
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Calculate PDA for a channel invitation
 */
export function findInvitationPDA(
  channel: Address,
  invitee: Address,
  programId: Address = PROGRAM_ID,
): [Address, number] {
  // TODO: Implement proper PDA finding with Web3.js v2
  const seeds = [
    Buffer.from("invitation"),
    Buffer.from(channel),
    Buffer.from(invitee),
  ];
  
  return [address("11111111111111111111111111111112"), 0];
}

/**
 * Create a deterministic seed for account derivation
 */
export function createSeed(input: string): Buffer {
  // Truncate or pad to 32 bytes for PDA seeds
  const buffer = Buffer.from(input, "utf8");
  if (buffer.length > 32) {
    return buffer.slice(0, 32);
  }
  if (buffer.length < 32) {
    const padded = Buffer.alloc(32);
    buffer.copy(padded);
    return padded;
  }
  return buffer;
}

/**
 * Wait for transaction confirmation with retry
 */
export async function confirmTransaction(
  connection: any,
  signature: string,
  maxRetries: number = 10,
  delay: number = 1000,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await connection.getTransaction(signature);
      if (result && result.meta && result.meta.err === null) {
        return true;
      }
    } catch (error) {
      // Transaction might not be confirmed yet
    }

    if (i < maxRetries - 1) {
      await sleep(delay);
    }
  }

  return false;
}

/**
 * Convert various address formats to Address type
 */
export function normalizeAddress(addr: string | Address): Address {
  if (typeof addr === 'string') {
    return address(addr);
  }
  return addr;
}

/**
 * Format SOL amounts
 */
export function formatSOL(lamports: number | bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  return `${sol.toFixed(4)} SOL`;
}

/**
 * Validate public key format (for backward compatibility)
 */
export function validatePublicKey(
  pubkey: Address | string,
): boolean {
  try {
    normalizeAddress(typeof pubkey === 'string' ? pubkey : String(pubkey));
    return true;
  } catch {
    return false;
  }
}
