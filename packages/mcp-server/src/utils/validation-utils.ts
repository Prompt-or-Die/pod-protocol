import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { createLogger } from './logger';

const logger = createLogger('validation-utils');

/**
 * Validates an email address
 * @param email - The email address to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates a URL
 * @param url - The URL to validate
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns True if valid, false otherwise
 */
export function isValidUrl(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return allowedProtocols.includes(urlObj.protocol.slice(0, -1));
  } catch {
    return false;
  }
}

/**
 * Validates a Solana address
 * @param address - The Solana address to validate
 * @returns True if valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a JSON string
 * @param jsonString - The JSON string to validate
 * @returns True if valid JSON, false otherwise
 */
export function isValidJson(jsonString: string): boolean {
  if (!jsonString || typeof jsonString !== 'string') {
    return false;
  }
  
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates data against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validation result with success flag and data/errors
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Validates data against a Zod schema and returns only the result
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Parsed data if valid, throws error if invalid
 */
export function parseWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates data against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Parsed data if valid, undefined if invalid
 */
export function safeParseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | undefined {
  try {
    return schema.parse(data);
  } catch {
    return undefined;
  }
}

/**
 * Validates a port number
 * @param port - The port number to validate
 * @returns True if valid port (1-65535), false otherwise
 */
export function isValidPort(port: number | string): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validates an IPv4 address
 * @param ip - The IP address to validate
 * @returns True if valid IPv4, false otherwise
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validates an IPv6 address
 * @param ip - The IP address to validate
 * @returns True if valid IPv6, false otherwise
 */
export function isValidIPv6(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

/**
 * Validates a UUID (v4)
 * @param uuid - The UUID to validate
 * @returns True if valid UUID v4, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates a hex string
 * @param hex - The hex string to validate
 * @param expectedLength - Expected length of the hex string (optional)
 * @returns True if valid hex, false otherwise
 */
export function isValidHex(hex: string, expectedLength?: number): boolean {
  if (!hex || typeof hex !== 'string') {
    return false;
  }
  
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Check if it's valid hex
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(cleanHex)) {
    return false;
  }
  
  // Check length if specified
  if (expectedLength !== undefined) {
    return cleanHex.length === expectedLength;
  }
  
  return true;
}

/**
 * Validates a base64 string
 * @param base64 - The base64 string to validate
 * @returns True if valid base64, false otherwise
 */
export function isValidBase64(base64: string): boolean {
  if (!base64 || typeof base64 !== 'string') {
    return false;
  }
  
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(base64) && base64.length % 4 === 0;
}

/**
 * Validates a timestamp (ISO 8601 format)
 * @param timestamp - The timestamp to validate
 * @returns True if valid ISO 8601 timestamp, false otherwise
 */
export function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }
  
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
}

/**
 * Validates a semantic version string
 * @param version - The version string to validate
 * @returns True if valid semver, false otherwise
 */
export function isValidSemver(version: string): boolean {
  if (!version || typeof version !== 'string') {
    return false;
  }
  
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Validates a JWT token format (not signature)
 * @param token - The JWT token to validate
 * @returns True if valid JWT format, false otherwise
 */
export function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Check if each part is valid base64
  return parts.every(part => {
    try {
      // JWT uses base64url encoding, which may not have padding
      const padded = part + '='.repeat((4 - part.length % 4) % 4);
      return isValidBase64(padded.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return false;
    }
  });
}

/**
 * Validates a phone number (basic international format)
 * @param phone - The phone number to validate
 * @returns True if valid phone format, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Basic international phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  return phoneRegex.test(cleanPhone);
}

/**
 * Validates a domain name
 * @param domain - The domain name to validate
 * @returns True if valid domain, false otherwise
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(xn--[a-zA-Z0-9]+|[a-zA-Z]{2,})$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Validates a file path
 * @param path - The file path to validate
 * @param allowAbsolute - Whether to allow absolute paths (default: true)
 * @returns True if valid path, false otherwise
 */
export function isValidFilePath(path: string, allowAbsolute: boolean = true): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\.[/\\]/, // Directory traversal
    /^[/\\]/, // Absolute path (if not allowed)
    /[<>:"|?*]/, // Invalid characters on Windows
    /[\0]/, // Null bytes
  ];
  
  if (!allowAbsolute && dangerousPatterns[1].test(path)) {
    return false;
  }
  
  return !dangerousPatterns.some((pattern, index) => {
    if (index === 1 && allowAbsolute) return false; // Skip absolute path check if allowed
    return pattern.test(path);
  });
}

/**
 * Validates a color hex code
 * @param color - The color hex code to validate
 * @returns True if valid hex color, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validates a MIME type
 * @param mimeType - The MIME type to validate
 * @returns True if valid MIME type, false otherwise
 */
export function isValidMimeType(mimeType: string): boolean {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }
  
  const mimeTypeRegex = /^[a-zA-Z][a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/;
  return mimeTypeRegex.test(mimeType);
}

/**
 * Validates a username (alphanumeric with underscores and hyphens)
 * @param username - The username to validate
 * @param minLength - Minimum length (default: 3)
 * @param maxLength - Maximum length (default: 30)
 * @returns True if valid username, false otherwise
 */
export function isValidUsername(
  username: string,
  minLength: number = 3,
  maxLength: number = 30
): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  if (username.length < minLength || username.length > maxLength) {
    return false;
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
}

/**
 * Validates a password strength
 * @param password - The password to validate
 * @param options - Validation options
 * @returns Validation result with strength score and requirements
 */
export function validatePasswordStrength(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    maxLength?: number;
  } = {}
): {
  isValid: boolean;
  score: number; // 0-100
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
  };
  suggestions: string[];
} {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    maxLength = 128
  } = options;
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      score: 0,
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        numbers: false,
        specialChars: false
      },
      suggestions: ['Password is required']
    };
  }
  
  const requirements = {
    length: password.length >= minLength && password.length <= maxLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    specialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  };
  
  const suggestions: string[] = [];
  
  if (!requirements.length) {
    suggestions.push(`Password must be between ${minLength} and ${maxLength} characters`);
  }
  if (requireUppercase && !requirements.uppercase) {
    suggestions.push('Add at least one uppercase letter');
  }
  if (requireLowercase && !requirements.lowercase) {
    suggestions.push('Add at least one lowercase letter');
  }
  if (requireNumbers && !requirements.numbers) {
    suggestions.push('Add at least one number');
  }
  if (requireSpecialChars && !requirements.specialChars) {
    suggestions.push('Add at least one special character');
  }
  
  // Calculate score
  let score = 0;
  
  // Length score (0-30 points)
  if (password.length >= minLength) {
    score += Math.min(30, (password.length / minLength) * 15);
  }
  
  // Character variety score (0-40 points)
  if (requirements.uppercase) score += 10;
  if (requirements.lowercase) score += 10;
  if (requirements.numbers) score += 10;
  if (requirements.specialChars) score += 10;
  
  // Complexity bonus (0-30 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(20, (uniqueChars / password.length) * 20);
  
  // Pattern penalties
  if (/(..).*\1/.test(password)) score -= 10; // Repeated patterns
  if (/123|abc|qwe/i.test(password)) score -= 10; // Common sequences
  
  score = Math.max(0, Math.min(100, score));
  
  const isValid = requirements.length &&
    (!requireUppercase || requirements.uppercase) &&
    (!requireLowercase || requirements.lowercase) &&
    (!requireNumbers || requirements.numbers) &&
    (!requireSpecialChars || requirements.specialChars);
  
  return {
    isValid,
    score,
    requirements,
    suggestions
  };
}

/**
 * Sanitizes a string by removing or escaping dangerous characters
 * @param input - The input string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    removeNewlines?: boolean;
    trimWhitespace?: boolean;
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  const {
    allowHtml = false,
    maxLength,
    removeNewlines = false,
    trimWhitespace = true
  } = options;
  
  let sanitized = input;
  
  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }
  
  // Remove newlines if requested
  if (removeNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }
  
  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Common Zod schemas for validation
 */
export const commonSchemas = {
  email: z.string().email().max(254),
  url: z.string().url(),
  uuid: z.string().uuid(),
  port: z.number().int().min(1).max(65535),
  ipv4: z.string().ip({ version: 'v4' }),
  ipv6: z.string().ip({ version: 'v6' }),
  timestamp: z.string().datetime(),
  semver: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/),
  hexColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  solanaAddress: z.string().refine(isValidSolanaAddress, {
    message: 'Invalid Solana address'
  }),
  base64: z.string().refine(isValidBase64, {
    message: 'Invalid base64 string'
  }),
  jwt: z.string().refine(isValidJWTFormat, {
    message: 'Invalid JWT format'
  })
};