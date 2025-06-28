/**
 * Validation utilities for the MCP server
 */

/**
 * Validates if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  // Basic Solana address validation - 32-44 characters, base58
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validates data against a JSON schema
 */
export function validateJsonSchema(data: any, schema: any): boolean {
  if (!schema || !schema.type) return false;
  
  // Basic validation - this is a simplified implementation
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) return false;
    
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) return false;
      }
    }
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in data) {
          const propSchema = prop as any;
          if (propSchema.type === 'string' && typeof data[key] !== 'string') return false;
          if (propSchema.type === 'number' && typeof data[key] !== 'number') return false;
        }
      }
    }
    
    return true;
  }
  
  return typeof data === schema.type;
} 