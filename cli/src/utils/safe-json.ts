/**
 * Safe JSON parsing utilities to prevent code injection attacks
 * 
 * SECURITY: This module provides secure alternatives to JSON.parse()
 * that validate input and prevent malicious JSON payloads from executing code.
 */

export interface SafeParseOptions {
  maxDepth?: number;
  maxLength?: number;
  allowedKeys?: string[];
  allowedTypes?: string[];
}

/**
 * Safely parse JSON with validation to prevent injection attacks
 */
export function safeJSONParse<T = any>(
  jsonString: string, 
  options: SafeParseOptions = {}
): T | null {
  const {
    maxDepth = 10,
    maxLength = 1024 * 1024, // 1MB limit
    allowedKeys,
    allowedTypes = ['string', 'number', 'boolean', 'object']
  } = options;

  try {
    // Input validation
    if (typeof jsonString !== 'string') {
      console.warn('safeJSONParse: Input is not a string');
      return null;
    }

    if (jsonString.length === 0) {
      console.warn('safeJSONParse: Empty input string');
      return null;
    }

    if (jsonString.length > maxLength) {
      console.warn(`safeJSONParse: Input too long (${jsonString.length} > ${maxLength})`);
      return null;
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /__proto__/,
      /constructor/,
      /prototype/,
      /function\s*\(/,
      /=\s*>/,
      /\$\{/,
      /`/,
      /eval\s*\(/,
      /require\s*\(/,
      /import\s*\(/,
      /process\s*\./,
      /global\s*\./,
      /window\s*\./,
      /document\s*\./
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(jsonString)) {
        console.warn(`safeJSONParse: Dangerous pattern detected: ${pattern}`);
        return null;
      }
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!validateObject(parsed, 0, maxDepth, allowedKeys, allowedTypes)) {
      console.warn('safeJSONParse: Object validation failed');
      return null;
    }

    return parsed as T;
  } catch (error) {
    console.warn(`safeJSONParse: Parse error - ${error.message}`);
    return null;
  }
}

/**
 * Recursively validate parsed object structure
 */
function validateObject(
  obj: any,
  currentDepth: number,
  maxDepth: number,
  allowedKeys?: string[],
  allowedTypes?: string[]
): boolean {
  if (currentDepth > maxDepth) {
    console.warn(`validateObject: Max depth exceeded (${currentDepth} > ${maxDepth})`);
    return false;
  }

  if (obj === null || obj === undefined) {
    return true;
  }

  const objType = typeof obj;
  
  if (allowedTypes && !allowedTypes.includes(objType)) {
    console.warn(`validateObject: Disallowed type: ${objType}`);
    return false;
  }

  if (objType === 'object') {
    if (Array.isArray(obj)) {
      // Validate array elements
      for (let i = 0; i < obj.length; i++) {
        if (!validateObject(obj[i], currentDepth + 1, maxDepth, allowedKeys, allowedTypes)) {
          return false;
        }
      }
    } else {
      // Validate object properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Check if key is allowed
          if (allowedKeys && !allowedKeys.includes(key)) {
            console.warn(`validateObject: Disallowed key: ${key}`);
            return false;
          }

          // Check for dangerous property names
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            console.warn(`validateObject: Dangerous property name: ${key}`);
            return false;
          }

          // Recursively validate property value
          if (!validateObject(obj[key], currentDepth + 1, maxDepth, allowedKeys, allowedTypes)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

/**
 * Safe wrapper for reading and parsing JSON files
 */
export function safeJSONParseFile(
  filePath: string,
  options: SafeParseOptions = {}
): any | null {
  try {
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      console.warn(`safeJSONParseFile: File does not exist: ${filePath}`);
      return null;
    }

    const stats = fs.statSync(filePath);
    const maxFileSize = options.maxLength || 1024 * 1024; // 1MB default
    
    if (stats.size > maxFileSize) {
      console.warn(`safeJSONParseFile: File too large: ${stats.size} > ${maxFileSize}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return safeJSONParse(content, options);
  } catch (error) {
    console.warn(`safeJSONParseFile: Error reading file ${filePath} - ${error.message}`);
    return null;
  }
}

/**
 * Safe JSON parsing specifically for configuration files
 */
export function safeParseConfig(jsonString: string): any | null {
  return safeJSONParse(jsonString, {
    maxDepth: 5,
    maxLength: 100 * 1024, // 100KB for config files
    allowedTypes: ['string', 'number', 'boolean', 'object'],
    allowedKeys: [
      // Common config keys - this can be extended
      'environment', 'network', 'programId', 'packageManager',
      'installedAt', 'version', 'cluster', 'commitment',
      'skipPreflight', 'preflightCommitment', 'filters',
      'websocket', 'httpHeaders', 'confirmations'
    ]
  });
}

/**
 * Safe JSON parsing for keypair files
 */
export function safeParseKeypair(jsonString: string): number[] | null {
  const parsed = safeJSONParse(jsonString, {
    maxDepth: 2,
    maxLength: 10 * 1024, // 10KB for keypairs
    allowedTypes: ['object', 'number']
  });

  if (!parsed) return null;

  // Validate keypair structure
  if (Array.isArray(parsed)) {
    // Direct array format
    if (parsed.length !== 64) {
      console.warn('safeParseKeypair: Invalid keypair length');
      return null;
    }
    
    if (!parsed.every(item => typeof item === 'number' && item >= 0 && item <= 255)) {
      console.warn('safeParseKeypair: Invalid keypair format');
      return null;
    }
    
    return parsed;
  }

  return null;
} 