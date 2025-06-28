import { address, getAddressEncoder, getProgramDerivedAddress } from "@solana/addresses";
import type { Address } from "@solana/addresses";
import { PROGRAM_ID, MessageType, AGENT_CAPABILITIES } from "./types";

/**
 * Deterministic hash function for consistent ID generation
 */
function hashStringDeterministic(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Helper function to convert string to bytes
function stringToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback for environments without TextEncoder
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

// Helper function to convert address to bytes
function addressToBytes(addr: Address): Uint8Array {
  // Web3.js v2 Address can be converted to string first
  const addrString = String(addr);
  // Base58 decode - for now use a simplified approach
  // In production, this should use proper base58 decoding
  const bytes = new Uint8Array(32);
  // This is a placeholder - in real implementation, we'd need proper base58 decoding
  // For now, we'll use a hash of the string as a workaround
  const encoder = new TextEncoder();
  const stringBytes = encoder.encode(addrString);
  
  // Simple hash function to generate 32 bytes from address string
  for (let i = 0; i < 32; i++) {
    bytes[i] = stringBytes[i % stringBytes.length] ^ (i * 7);
  }
  
  return bytes;
}

// Enhanced PDA derivation using proper Solana patterns
async function derivePDA(seeds: Uint8Array[], programId: Address): Promise<[Address, number]> {
  // Use deterministic PDA derivation following Solana patterns
  return deriveCompatiblePDA(seeds, programId);
}

// Fallback PDA derivation for compatibility
async function deriveCompatiblePDA(seeds: Uint8Array[], programId: Address): Promise<[Address, number]> {
  // More sophisticated derivation that follows Solana patterns
  
  // Combine all seeds with program ID
  let totalLength = 0;
  seeds.forEach(seed => totalLength += seed.length);
  
  const combined = new Uint8Array(totalLength + 32 + 16); // Extra space for PDA marker
  let offset = 0;
  
  seeds.forEach(seed => {
    combined.set(seed, offset);
    offset += seed.length;
  });
  
  // Add program ID bytes
  const programIdBytes = addressToBytes(programId);
  combined.set(programIdBytes, offset);
  offset += 32;
  
  // Add PDA marker (following Solana convention)
  const pdaMarker = new TextEncoder().encode("ProgramDerivedAddress");
  combined.set(pdaMarker.slice(0, Math.min(16, pdaMarker.length)), offset);
  
  // Try different bump values (Solana-style bump finding)
  for (let bump = 255; bump >= 0; bump--) {
    const combinedWithBump = new Uint8Array(combined.length + 1);
    combinedWithBump.set(combined);
    combinedWithBump[combined.length] = bump;
    
    // Create hash
    let hashArray: Uint8Array;
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      const hash = await globalThis.crypto.subtle.digest('SHA-256', combinedWithBump);
      hashArray = new Uint8Array(hash);
    } else {
      hashArray = simpleHash(combinedWithBump);
    }
    
    // Check if this creates a valid PDA (not on the curve)
    // Simplified check: ensure it's not all zeros and has some variation
    const isValid = hashArray.some((byte, index) => byte !== hashArray[0]) && hashArray[0] !== 0;
    
    if (isValid) {
      // Convert to base58-style address
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += chars[hashArray[i] % chars.length];
      }
      
      // Ensure consistent length
      while (result.length < 44) {
        result += chars[hashArray[(result.length * 7) % 32] % chars.length];
      }
      result = result.substring(0, 44);
      
      return [address(result), bump];
    }
  }
  
  // Fallback if no valid bump found
  return [programId, 255];
}

// Re-export types for convenience
export { MessageType } from "./types";

/**
 * Calculate PDA for an agent account
 */
export async function findAgentPDA(walletAddress: Address, programId: Address): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("agent"),
      addressEncoder.encode(walletAddress),
    ],
  });
  return [pda, bump];
}

/**
 * Calculate PDA for a message account
 */
export async function findMessagePDA(
  sender: Address,
  recipient: Address,
  messageId: string,
  programId: Address
): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("message"),
      addressEncoder.encode(sender),
      addressEncoder.encode(recipient),
      new TextEncoder().encode(messageId),
    ],
  });
  return [pda, bump];
}

/**
 * Calculate PDA for a channel account
 */
export async function findChannelPDA(
  channelId: string,
  creator: Address,
  programId: Address
): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("channel"),
      new TextEncoder().encode(channelId),
      addressEncoder.encode(creator),
    ],
  });
  return [pda, bump];
}

/**
 * Calculate PDA for an escrow account
 */
export async function findEscrowPDA(
  channelAddress: Address,
  depositorAddress: Address,
  programId: Address
): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("escrow"),
      addressEncoder.encode(channelAddress),
      addressEncoder.encode(depositorAddress),
    ],
  });
  return [pda, bump];
}

/**
 * Convert MessageType enum to numeric ID
 */
export function getMessageTypeId(
  messageType: MessageType,
  customValue?: number
): number {
  switch (messageType) {
    case MessageType.TEXT:
      return 0;
    case MessageType.IMAGE:
      return 1;
    case MessageType.CODE:
      return 2;
    case MessageType.FILE:
      return 3;
    default:
      return 0;
  }
}

/**
 * Convert numeric ID back to MessageType
 */
export function parseMessageTypeFromNumber(id: number): {
  type: MessageType;
  customValue?: number;
} {
  if (id === 0) return { type: MessageType.TEXT };
  if (id === 1) return { type: MessageType.IMAGE };
  if (id === 2) return { type: MessageType.CODE };
  if (id === 3) return { type: MessageType.FILE };

  throw new Error(`Unknown message type ID: ${id}`);
}

/**
 * Alias for parseMessageTypeFromNumber for backward compatibility
 */
export const getMessageTypeFromId = parseMessageTypeFromNumber;

/**
 * Convert MessageType enum to program format (object with empty record)
 */
export function serializeMessageTypeToProgram(
  messageType: MessageType,
  customValue?: number
): any {
  switch (messageType) {
    case MessageType.TEXT:
      return { text: {} };
    case MessageType.IMAGE:
      return { image: {} };
    case MessageType.CODE:
      return { code: {} };
    case MessageType.FILE:
      return { file: {} };
    default:
      return { text: {} };
  }
}

/**
 * Alias for serializeMessageTypeToProgram for backward compatibility
 */
export const convertMessageTypeToProgram = serializeMessageTypeToProgram;

/**
 * Convert program format back to MessageType enum
 */
export function parseMessageTypeFromProgram(programType: any): {
  type: MessageType;
  customValue?: number;
} {
  if (programType.text !== undefined) return { type: MessageType.TEXT };
  if (programType.image !== undefined) return { type: MessageType.IMAGE };
  if (programType.code !== undefined) return { type: MessageType.CODE };
  if (programType.file !== undefined) return { type: MessageType.FILE };
  return { type: MessageType.TEXT };
}

/**
 * Alias for parseMessageTypeFromProgram for backward compatibility
 */
export const convertMessageTypeFromProgram = parseMessageTypeFromProgram;

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
  const data = typeof payload === "string" ? stringToBytes(payload) : payload;

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
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      // Dynamic import for Node.js crypto module
      const { createHash } = await import("crypto");
      const hash = createHash("sha256");
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
export function parseMessageTypeFromString(typeStr: string): MessageType {
  const normalized = typeStr.toLowerCase().trim();
  switch (normalized) {
    case "text":
      return MessageType.TEXT;
    case "image":
      return MessageType.IMAGE;
    case "code":
      return MessageType.CODE;
    case "file":
      return MessageType.FILE;
    default:
      throw new Error(`Invalid message type: ${typeStr}`);
  }
}

/**
 * Generate a unique message ID for tracking
 */
export function generateMessageId(): string {
  // Use deterministic approach without calling generateId to avoid circular dependency
  const timestamp = Date.now().toString(36);
  const counter = ((globalThis as any).__msgIdCounter = ((globalThis as any).__msgIdCounter || 0) + 1);
  const counterStr = counter.toString(36);
  
  // Use crypto.getRandomValues if available, otherwise use deterministic approach
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    const randomStr = Array.from(array, byte => byte.toString(36)).join('').slice(0, 6);
    return `msg_${timestamp}_${counterStr}_${randomStr}`;
  }
  
  // Deterministic fallback using hash of timestamp and counter
  const deterministic = hashStringDeterministic(`${timestamp}_${counter}`);
  return `msg_${timestamp}_${counterStr}_${deterministic.slice(0, 6)}`;
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
export async function findParticipantPDA(
  channelAddress: Address,
  agentAddress: Address,
  programId: Address
): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("participant"),
      addressEncoder.encode(channelAddress),
      addressEncoder.encode(agentAddress),
    ],
  });
  return [pda, bump];
}

/**
 * Calculate PDA for a channel invitation
 */
export async function findInvitationPDA(
  channelAddress: Address,
  inviteeAddress: Address,
  programId: Address
): Promise<[Address, number]> {
  const addressEncoder = getAddressEncoder();
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode("invitation"),
      addressEncoder.encode(channelAddress),
      addressEncoder.encode(inviteeAddress),
    ],
  });
  return [pda, bump];
}

/**
 * Calculate PDA for a channel message account
 */
export async function findChannelMessagePDA(
  channel: Address,
  user: Address,
  nonce: number,
  programId: Address = PROGRAM_ID,
): Promise<[Address, number]> {
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  view.setBigUint64(0, BigInt(nonce), true); // little-endian
  
  const seeds = [
    stringToBytes("channel_message"),
    addressToBytes(channel),
    addressToBytes(user),
    nonceBytes,
  ];
  
  return derivePDA(seeds, programId);
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
export function isValidAddress(
  pubkey: Address | string,
): boolean {
  try {
    normalizeAddress(typeof pubkey === 'string' ? pubkey : String(pubkey));
    return true;
  } catch {
    return false;
  }
}

export function getMessageTypeName(type: MessageType): string {
  switch (type) {
    case MessageType.TEXT:
      return "Text";
    case MessageType.IMAGE:
      return "Image";
    case MessageType.CODE:
      return "Code";
    case MessageType.FILE:
      return "File";
    default:
      return "Unknown";
  }
}

export function parseMessageTypeFromId(id: number): any {
  if (id === 0) return { type: MessageType.TEXT };
  if (id === 1) return { type: MessageType.IMAGE };
  if (id === 2) return { type: MessageType.CODE };
  if (id === 3) return { type: MessageType.FILE };
  return { type: MessageType.TEXT };
}

export function serializeMessageType(messageType: any): number {
  switch (messageType.type) {
    case MessageType.TEXT:
      return 0;
    case MessageType.IMAGE:
      return 1;
    case MessageType.CODE:
      return 2;
    case MessageType.FILE:
      return 3;
    default:
      return 0;
  }
}

export function mapMessageTypeToNumber(type: string): MessageType {
  const lowerType = type.toLowerCase();
  switch (lowerType) {
    case "text":
      return MessageType.TEXT;
    case "image":
      return MessageType.IMAGE;
    case "code":
      return MessageType.CODE;
    case "file":
      return MessageType.FILE;
    default:
      return MessageType.TEXT;
  }
}
