/**
 * Advanced Security Utilities for PoD Protocol
 * Provides sophisticated injection detection, context-aware sanitization, and security isolation
 */

// Injection attempt detection patterns
const INJECTION_PATTERNS = {
  SQL: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
    /['";][\s]*(\bOR\b|\bAND\b)[\s]*['"]?[\w\s]*['"]?[\s]*=[\s]*['"]?[\w\s]*['"]?/gi,
    /[\s]*['"]\s*\bOR\b\s*['"]\s*=\s*['"]/gi,
    /--[\s]*[\r\n]/gi,
    /\/\*[\s\S]*?\*\//gi,
  ],
  SCRIPT: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<form[\s\S]*?>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /livescript:/gi,
  ],
  COMMAND: [
    /[\|&;`$\(\)\{\}\[\]<>]/g,
    /\b(rm|del|format|mkfs|dd|sudo|su|passwd|shadow|etc\/passwd|etc\/shadow)\b/gi,
    /\b(curl|wget|nc|netcat|telnet|ssh|ftp|tftp)\b/gi,
    /\b(cat|head|tail|grep|awk|sed|sort|uniq|wc|find|locate)\b/gi,
    /\b(chmod|chown|chgrp|mount|umount|ps|kill|killall)\b/gi,
  ],
  PROMPT: [
    /\b(ignore\s+previous\s+instructions?|forget\s+everything|act\s+as|pretend\s+to\s+be|roleplay)\b/gi,
    /\b(system\s+prompt|initial\s+prompt|base\s+prompt|core\s+instructions?)\b/gi,
    /\b(jailbreak|DAN|unrestricted\s+mode|developer\s+mode)\b/gi,
    /\b(override\s+safety|bypass\s+filter|ignore\s+guidelines)\b/gi,
    /\b(simulate|emulate)\s+(?:a|an)?\s*(?:uncensored|unrestricted|jailbroken)\b/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\.\/|\.\.\\/gi,
    /\/etc\/passwd|\/etc\/shadow|\/proc\/|\/sys\//gi,
    /\\windows\\|\\system32\\|\\boot\\/gi,
    /%2e%2e%2f|%2e%2e%5c/gi,
    /\.\.\%252f|\.\.\%255c/gi,
  ],
};

/**
 * Detect potential injection attempts in user input
 * @param {string} input - The input to analyze
 * @param {Object} options - Detection options
 * @returns {Object} Detection results
 */
export function detectInjectionAttempt(input, options = {}) {
  const {
    strictMode = false,
    contextType = 'general',
    sensitivityLevel = 'medium'
  } = options;

  if (typeof input !== 'string') {
    return { safe: false, threats: ['invalid_input_type'], severity: 'high' };
  }

  const threats = [];
  const evidence = [];
  let maxSeverity = 'low';

  // SQL Injection Detection
  for (const pattern of INJECTION_PATTERNS.SQL) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push('sql_injection');
      evidence.push({ type: 'sql', matches });
      maxSeverity = 'high';
    }
  }

  // Script Injection Detection
  for (const pattern of INJECTION_PATTERNS.SCRIPT) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push('script_injection');
      evidence.push({ type: 'script', matches });
      maxSeverity = 'high';
    }
  }

  // Command Injection Detection
  for (const pattern of INJECTION_PATTERNS.COMMAND) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push('command_injection');
      evidence.push({ type: 'command', matches });
      maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
    }
  }

  // Prompt Injection Detection
  for (const pattern of INJECTION_PATTERNS.PROMPT) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push('prompt_injection');
      evidence.push({ type: 'prompt', matches });
      maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
    }
  }

  // Path Traversal Detection
  for (const pattern of INJECTION_PATTERNS.PATH_TRAVERSAL) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push('path_traversal');
      evidence.push({ type: 'path', matches });
      maxSeverity = 'high';
    }
  }

  // Context-specific validation
  if (contextType === 'blockchain') {
    // Additional blockchain-specific patterns
    const blockchainThreats = detectBlockchainThreats(input);
    threats.push(...blockchainThreats.threats);
    evidence.push(...blockchainThreats.evidence);
    if (blockchainThreats.severity === 'high') maxSeverity = 'high';
  }

  // Length-based anomaly detection
  if (input.length > 10000) {
    threats.push('suspicious_length');
    maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
  }

  // Entropy analysis for random-looking strings that might be encoded payloads
  const entropy = calculateEntropy(input);
  if (entropy > 7.5 && input.length > 100) {
    threats.push('high_entropy_payload');
    maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
  }

  return {
    safe: threats.length === 0,
    threats: [...new Set(threats)],
    evidence,
    severity: maxSeverity,
    entropy,
    inputLength: input.length,
    timestamp: Date.now(),
    contextType,
    strictMode
  };
}

/**
 * Context-aware input sanitization
 * @param {string} input - The input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, options = {}) {
  const {
    contextType = 'general',
    preserveStructure = false,
    allowedTags = [],
    maxLength = 10000
  } = options;

  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Context-specific sanitization
  switch (contextType) {
    case 'html':
      sanitized = sanitizeHtml(sanitized, allowedTags, preserveStructure);
      break;
    case 'sql':
      sanitized = sanitizeSql(sanitized);
      break;
    case 'shell':
      sanitized = sanitizeShell(sanitized);
      break;
    case 'blockchain':
      sanitized = sanitizeBlockchain(sanitized);
      break;
    case 'message':
      sanitized = sanitizeMessage(sanitized);
      break;
    case 'url':
      sanitized = sanitizeUrl(sanitized);
      break;
    default:
      sanitized = sanitizeGeneral(sanitized);
  }

  return sanitized;
}

/**
 * Isolate execution context with allowed tools/operations
 * @param {Object} context - The execution context
 * @param {Array} allowedTools - Array of allowed tool/operation names
 * @returns {Object} Isolated context with restricted access
 */
export function isolateContext(context, allowedTools = []) {
  const isolatedContext = {};
  
  // Create a whitelist-based isolated environment
  const allowedContextKeys = [
    'user', 'session', 'network', 'wallet', 'agent', 'message', 'channel'
  ];

  // Only allow whitelisted context properties
  for (const key of allowedContextKeys) {
    if (context[key] !== undefined) {
      // Deep clone to prevent reference-based data leakage
      isolatedContext[key] = JSON.parse(JSON.stringify(context[key]));
    }
  }

  // Create restricted tool access
  const allowedOperations = {};
  const toolWhitelist = new Set(allowedTools);

  // Define available tools with their safety levels
  const availableTools = {
    'read_account': { level: 'safe', category: 'blockchain' },
    'send_transaction': { level: 'dangerous', category: 'blockchain' },
    'sign_message': { level: 'medium', category: 'crypto' },
    'encrypt_data': { level: 'safe', category: 'crypto' },
    'decrypt_data': { level: 'medium', category: 'crypto' },
    'validate_address': { level: 'safe', category: 'blockchain' },
    'get_balance': { level: 'safe', category: 'blockchain' },
    'estimate_fees': { level: 'safe', category: 'blockchain' },
    'swap_tokens': { level: 'dangerous', category: 'defi' },
    'provide_liquidity': { level: 'dangerous', category: 'defi' },
    'stake_sol': { level: 'dangerous', category: 'staking' },
    'bridge_message': { level: 'dangerous', category: 'bridge' }
  };

  // Only allow explicitly permitted tools
  for (const tool of allowedTools) {
    if (availableTools[tool]) {
      allowedOperations[tool] = {
        ...availableTools[tool],
        enabled: true,
        lastUsed: null,
        usageCount: 0
      };
    }
  }

  // Add usage tracking wrapper
  const trackUsage = (toolName, originalFunction) => {
    return async (...args) => {
      if (!allowedOperations[toolName]) {
        throw new Error(`Tool '${toolName}' is not allowed in this context`);
      }
      
      allowedOperations[toolName].lastUsed = Date.now();
      allowedOperations[toolName].usageCount++;
      
      // Rate limiting for dangerous operations
      if (availableTools[toolName].level === 'dangerous') {
        const rateLimitKey = `${toolName}_${context.user?.id || 'anonymous'}`;
        if (!rateLimitCheck(rateLimitKey, 5, 60000)) { // 5 per minute
          throw new Error(`Rate limit exceeded for ${toolName}`);
        }
      }
      
      return await originalFunction(...args);
    };
  };

  return {
    context: isolatedContext,
    allowedOperations,
    trackUsage,
    isToolAllowed: (toolName) => toolWhitelist.has(toolName),
    getToolInfo: (toolName) => availableTools[toolName] || null,
    getAllowedTools: () => Array.from(toolWhitelist),
    getUsageStats: () => ({ ...allowedOperations }),
    timestamp: Date.now(),
    isolationLevel: 'strict'
  };
}

// Helper functions
function detectBlockchainThreats(input) {
  const threats = [];
  const evidence = [];
  let severity = 'low';

  // Private key patterns
  const privateKeyPattern = /[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{87,88}/g;
  if (privateKeyPattern.test(input)) {
    threats.push('exposed_private_key');
    evidence.push({ type: 'blockchain', pattern: 'private_key' });
    severity = 'high';
  }

  // Seed phrase patterns
  const seedPhrasePattern = /\b(?:\w+\s+){11,23}\w+\b/g;
  if (seedPhrasePattern.test(input)) {
    threats.push('exposed_seed_phrase');
    evidence.push({ type: 'blockchain', pattern: 'seed_phrase' });
    severity = 'high';
  }

  // Suspicious transaction patterns
  const suspiciousTxPattern = /\b0x[a-fA-F0-9]{64}\b/g;
  if (suspiciousTxPattern.test(input) && input.includes('transfer')) {
    threats.push('suspicious_transaction');
    evidence.push({ type: 'blockchain', pattern: 'transaction' });
    severity = severity === 'high' ? 'high' : 'medium';
  }

  return { threats, evidence, severity };
}

function calculateEntropy(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  const len = str.length;
  let entropy = 0;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

function sanitizeHtml(input, allowedTags, preserveStructure) {
  // Remove script tags and dangerous attributes
  let sanitized = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');

  if (!preserveStructure) {
    // Strip all HTML if not preserving structure
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else if (allowedTags.length > 0) {
    // Only allow specific tags
    const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\s*\/?>)[^>]+>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '');
  }

  return sanitized;
}

function sanitizeSql(input) {
  return input
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/`/g, '\\`')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/--/g, '\\--')
    .replace(/\/\*/g, '\\/\\*')
    .replace(/\*\//g, '\\*\\/');
}

function sanitizeShell(input) {
  // Remove dangerous shell characters
  return input
    .replace(/[|&;`$(){}[\]<>]/g, '')
    .replace(/\$\{[^}]*\}/g, '')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/`[^`]*`/g, '');
}

function sanitizeBlockchain(input) {
  // Preserve valid addresses but remove potential exploits
  return input
    .replace(/[^\w\s\-_.]/g, '')
    .replace(/\b0x[a-fA-F0-9]{40}\b/g, (match) => match) // Keep Ethereum addresses
    .replace(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g, (match) => match); // Keep Solana addresses
}

function sanitizeMessage(input) {
  // Basic message sanitization
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function sanitizeUrl(input) {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

function sanitizeGeneral(input) {
  // General-purpose sanitization
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Simple rate limiting for dangerous operations
const rateLimitStore = new Map();

function rateLimitCheck(key, maxRequests, windowMs) {
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

// Export the advanced security functions
export { detectInjectionAttempt, sanitizeInput, isolateContext }; 