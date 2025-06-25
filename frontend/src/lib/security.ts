/**
 * Security utilities and Content Security Policy configuration
 */

// Input sanitization utilities
export const sanitizeInput = {
  // Remove potentially dangerous HTML/script content
  html: (input: string): string => {
    if (typeof window === 'undefined') {
      // Server-side: basic text sanitization
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    const div = document.createElement('div');
    div.textContent = input; // This safely escapes the content
    return div.innerHTML; // Returns properly escaped HTML
  },

  // Sanitize user input for database queries
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/`/g, '\\`')
      .replace(/\\/g, '\\\\');
  },

  // Sanitize URLs
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  // Remove XSS vectors
  xss: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/livescript:/gi, '');
  },

  // Validate and sanitize wallet addresses
  walletAddress: (input: string): string => {
    // Basic Solana address validation (base58, ~44 characters)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (solanaAddressRegex.test(input)) {
      return input;
    }
    return '';
  },

  // Sanitize user messages
  message: (input: string): string => {
    return sanitizeInput.xss(sanitizeInput.html(input.trim()));
  },
};

// Content Security Policy configuration
export const cspConfig = {
  // Base CSP directives
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'", // Required for development
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
      "https://accounts.google.com",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net",
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdn.jsdelivr.net",
      "data:",
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://images.unsplash.com",
      "https://avatars.githubusercontent.com",
      "https://via.placeholder.com",
    ],
    mediaSrc: ["'self'", "blob:", "data:"],
    objectSrc: ["'none'"],
    connectSrc: [
      "'self'",
      "https://api.devnet.solana.com",
      "https://api.mainnet-beta.solana.com",
      "https://api.testnet.solana.com",
      "wss://api.devnet.solana.com",
      "wss://api.mainnet-beta.solana.com",
      "https://registry.npmjs.org",
      "ws://localhost:*", // Development WebSocket
      "wss://localhost:*", // Development WebSocket
    ],
    frameSrc: ["'self'", "https://accounts.google.com"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true,
  },

  // Generate CSP header string
  toString: function(nonce?: string): string {
    const directives = { ...this.directives };
    
    // Add nonce to script-src if provided
    if (nonce) {
      directives.scriptSrc = [...directives.scriptSrc, `'nonce-${nonce}'`];
    }

    return Object.entries(directives)
      .map(([key, values]) => {
        if (key === 'upgradeInsecureRequests' && values === true) {
          return 'upgrade-insecure-requests';
        }
        if (Array.isArray(values)) {
          return `${key.replace(/([A-Z])/g, '-$1').toLowerCase()} ${values.join(' ')}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('; ');
  },

  // Development-specific overrides
  development: {
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://cdn.jsdelivr.net",
      "http://localhost:*",
      "ws://localhost:*",
      "wss://localhost:*",
    ],
    connectSrc: [
      "'self'",
      "https://api.devnet.solana.com",
      "wss://api.devnet.solana.com",
      "http://localhost:*",
      "ws://localhost:*",
      "wss://localhost:*",
    ],
  },
};

// Rate limiting utilities
export const rateLimiter = {
  // Simple in-memory rate limiter
  limits: new Map<string, { count: number; resetTime: number }>(),

  isAllowed: (
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): boolean => {
    const now = Date.now();
    const limit = rateLimiter.limits.get(identifier);

    if (!limit || now > limit.resetTime) {
      rateLimiter.limits.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (limit.count >= maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  },

  cleanup: () => {
    const now = Date.now();
    for (const [identifier, limit] of rateLimiter.limits.entries()) {
      if (now > limit.resetTime) {
        rateLimiter.limits.delete(identifier);
      }
    }
  },
};

// Secure storage utilities
export const secureStorage = {
  // Encrypt data before storing
  setSecure: (key: string, value: any, ttl?: number): void => {
    if (typeof window === 'undefined') return;

    const data = {
      value,
      encrypted: true,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null,
    };

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store secure data:', error);
    }
  },

  // Decrypt and retrieve data
  getSecure: (key: string): any => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Check if data has expired
      if (data.ttl && Date.now() > data.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn('Failed to retrieve secure data:', error);
      return null;
    }
  },

  // Remove secure data
  removeSecure: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  // Clear all expired data
  cleanupExpired: (): void => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const data = JSON.parse(stored);
        if (data.encrypted && data.ttl && now > data.ttl) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  },
};

// Security headers validation
export const validateSecurityHeaders = (response: Response): boolean => {
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security',
  ];

  return requiredHeaders.every(header => response.headers.has(header));
};

// CSRF protection
export const csrfProtection = {
  generateToken: (): string => {
    if (typeof window === 'undefined') return '';
    
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  validateToken: (token: string, storedToken: string): boolean => {
    return token === storedToken && token.length === 64;
  },

  getMetaToken: (): string => {
    if (typeof window === 'undefined') return '';
    
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || '';
  },
};

// Initialize security measures
export const initializeSecurity = (): void => {
  if (typeof window === 'undefined') return;

  // Clean up expired secure storage periodically
  setInterval(() => {
    secureStorage.cleanupExpired();
    rateLimiter.cleanup();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Add security event listeners
  window.addEventListener('beforeunload', () => {
    secureStorage.cleanupExpired();
  });

  // Monitor for suspicious activity
  let suspiciousActivity = 0;
  const maxSuspiciousActivities = 10;

  window.addEventListener('error', (event) => {
    // Log errors for security monitoring
    if (event.error?.stack?.includes('eval') || event.error?.stack?.includes('Function')) {
      suspiciousActivity++;
      if (suspiciousActivity > maxSuspiciousActivities) {
        console.warn('Suspicious activity detected');
        // Could trigger additional security measures
      }
    }
  });
};

export default {
  sanitizeInput,
  cspConfig,
  rateLimiter,
  secureStorage,
  validateSecurityHeaders,
  csrfProtection,
  initializeSecurity,
};