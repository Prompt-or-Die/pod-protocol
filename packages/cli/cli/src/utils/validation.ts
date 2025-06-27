import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import chalk from "chalk";

/**
 * Validation error class for CLI operations
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate a Solana address
 */
export function validateAddress(
  addressString: string,
  fieldName: string = "address",
): Address {
  try {
    return address(addressString);
  } catch {
    throw new ValidationError(`Invalid ${fieldName}: ${addressString}`);
  }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use validateAddress instead
 */
export function validatePublicKey(
  addressString: string,
  fieldName: string = "address",
): Address {
  return validateAddress(addressString, fieldName);
}

/**
 * Validate SOL amount (must be positive)
 */
export function validateSolAmount(
  amount: string | number,
  fieldName: string = "amount",
): number {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a number`);
  }

  if (numAmount <= 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be positive`);
  }

  if (numAmount > 1000000) {
    throw new ValidationError(`Invalid ${fieldName}: amount too large`);
  }

  return numAmount;
}

/**
 * Validate capabilities bitmask
 */
export function validateCapabilities(capabilities: string | number): number {
  const numCaps =
    typeof capabilities === "string"
      ? parseInt(capabilities, 10)
      : capabilities;

  if (isNaN(numCaps)) {
    throw new ValidationError("Invalid capabilities: must be a number");
  }

  if (numCaps < 0) {
    throw new ValidationError("Invalid capabilities: must be non-negative");
  }

  if (numCaps > 255) {
    throw new ValidationError("Invalid capabilities: value too large");
  }

  return numCaps;
}

/**
 * Validate URI format
 */
export function validateUri(uri: string, fieldName: string = "URI"): string {
  // Ensure uri is a string
  if (typeof uri !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (!uri.trim()) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  try {
    new URL(uri);
    return uri.trim();
  } catch {
    // Allow relative paths and simple strings for metadata URIs
    if (uri.length > 500) {
      throw new ValidationError(`${fieldName} too long (max 500 characters)`);
    }
    return uri.trim();
  }
}

/**
 * Validate channel name
 */
export function validateChannelName(name: string): string {
  // Ensure name is a string
  if (typeof name !== "string") {
    throw new ValidationError("Channel name must be a string");
  }

  if (!name.trim()) {
    throw new ValidationError("Channel name cannot be empty");
  }

  if (name.length > 32) {
    throw new ValidationError("Channel name too long (max 32 characters)");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new ValidationError(
      "Channel name can only contain letters, numbers, underscores, and hyphens",
    );
  }

  return name.trim();
}

/**
 * Validate message content
 */
export function validateMessage(content: string): string {
  // Ensure content is a string
  if (typeof content !== "string") {
    throw new ValidationError("Message content must be a string");
  }

  if (!content.trim()) {
    throw new ValidationError("Message content cannot be empty");
  }

  if (content.length > 10000) {
    throw new ValidationError("Message too long (max 10,000 characters)");
  }

  return content.trim();
}

/**
 * Validate network name
 */
export function validateNetwork(network: string): string {
  const validNetworks = ["devnet", "testnet", "mainnet-beta", "localnet"];

  if (!validNetworks.includes(network)) {
    throw new ValidationError(
      `Invalid network: ${network}. Must be one of: ${validNetworks.join(", ")}`,
    );
  }

  return network;
}

/**
 * Validate file path exists and is readable
 */
export function validateFilePath(
  filePath: string,
  fieldName: string = "file",
): string {
  // Ensure filePath is a string
  if (typeof filePath !== "string") {
    throw new ValidationError(`${fieldName} path must be a string`);
  }

  if (!filePath.trim()) {
    throw new ValidationError(`${fieldName} path cannot be empty`);
  }

  // Basic path validation - more thorough checks should be done with fs
  if (filePath.includes("..") && !filePath.startsWith("~/")) {
    console.warn(
      chalk.yellow(
        `Warning: ${fieldName} path contains '..' - ensure this is intentional`,
      ),
    );
  }

  return filePath.trim();
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(
  value: string | number,
  fieldName: string = "value",
): number {
  const num = typeof value === "string" ? parseInt(value, 10) : value;

  if (isNaN(num) || !Number.isInteger(num)) {
    throw new ValidationError(`Invalid ${fieldName}: must be an integer`);
  }

  if (num <= 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be positive`);
  }

  return num;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  fieldName: string = "value",
): T {
  if (!validValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${value}. Must be one of: ${validValues.join(
        ", ",
      )}`,
    );
  }

  return value as T;
}

/**
 * Safe validation wrapper that catches and formats errors
 */
export function safeValidate<T>(
  validator: () => T,
  onError?: (error: ValidationError) => void,
): T | null {
  try {
    return validator();
  } catch (error) {
    if (error instanceof ValidationError) {
      if (onError) {
        onError(error);
      } else {
        console.error(chalk.red("Validation Error:"), error.message);
      }
      return null;
    }
    throw error;
  }
}
