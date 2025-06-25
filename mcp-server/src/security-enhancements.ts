/**
 * Security Enhancements for PoD Protocol MCP Server
 * Based on latest MCP security research (2024-2025)
 */

import { createHash, randomBytes } from 'crypto';
import winston from 'winston';

export interface SecurityConfig {
  enableInputValidation: boolean;
  enableRateLimiting: boolean;
  enableToolSigning: boolean;
  maxRequestSize: number;
  allowedOrigins: string[];
  requireAuthentication: boolean;
}

export interface ToolSignature {
  toolName: string;
  signature: string;
  timestamp: number;
  nonce: string;
}

export interface RateLimitState {
  requests: number[];
  windowStart: number;
}

export class MCPSecurityManager {
  private logger: winston.Logger;
  private config: SecurityConfig;
  private rateLimitStore: Map<string, RateLimitState> = new Map();
  private trustedToolSignatures: Map<string, ToolSignature> = new Map();
  private nonceStore: Set<string> = new Set();

  constructor(config: SecurityConfig, logger: winston.Logger) {
    this.config = config;
    this.logger = logger;
  }

  // Input validation and sanitization
  public validateToolInput(toolName: string, input: any): { valid: boolean; sanitized?: any; error?: string } {
    if (!this.config.enableInputValidation) {
      return { valid: true, sanitized: input };
    }

    try {
      // Check for common injection patterns
      if (this.detectInjectionAttempt(input)) {
        this.logger.warn('Injection attempt detected', { toolName, input: this.sanitizeForLogging(input) });
        return { valid: false, error: 'Invalid input detected' };
      }

      // Sanitize input
      const sanitized = this.sanitizeInput(input);
      
      // Validate against tool-specific schemas
      const schemaValidation = this.validateAgainstSchema(toolName, sanitized);
      if (!schemaValidation.valid) {
        return { valid: false, error: schemaValidation.error };
      }

      return { valid: true, sanitized };
    } catch (error) {
      this.logger.error('Input validation error', { error, toolName });
      return { valid: false, error: 'Validation failed' };
    }
  }

  // Detect potential injection attempts
  private detectInjectionAttempt(input: any): boolean {
    const inputStr = JSON.stringify(input).toLowerCase();
    
    const injectionPatterns = [
      // Command injection
      /[;&|`$(){}]/,
      /exec|eval|system|shell/,
      
      // SQL injection  
      /union.*select|drop.*table|insert.*into/,
      
      // Script injection
      /<script|javascript:|data:/,
      
      // Path traversal
      /\.\.[\/\\]/,
      
      // Prompt injection patterns
      /ignore.*previous.*instructions/,
      /system.*prompt|role.*system/,
      /act.*as.*different|pretend.*you.*are/
    ];

    return injectionPatterns.some(pattern => pattern.test(inputStr));
  }

  // Sanitize input to remove dangerous content
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/[<>'"&]/g, '') // Remove HTML/XML characters
        .replace(/[;&|`$(){}]/g, '') // Remove command injection characters
        .trim()
        .substring(0, 10000); // Limit length
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Sanitize both keys and values
        const cleanKey = this.sanitizeInput(key);
        const cleanValue = this.sanitizeInput(value);
        sanitized[cleanKey] = cleanValue;
      }
      return sanitized;
    }
    
    return input;
  }

  // Rate limiting implementation
  public checkRateLimit(clientId: string, limit: number = 60, windowMs: number = 60000): boolean {
    if (!this.config.enableRateLimiting) {
      return true;
    }

    const now = Date.now();
    const clientState = this.rateLimitStore.get(clientId) || { requests: [], windowStart: now };
    
    // Remove old requests outside the window
    clientState.requests = clientState.requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (clientState.requests.length >= limit) {
      this.logger.warn('Rate limit exceeded', { clientId, requests: clientState.requests.length, limit });
      return false;
    }
    
    // Add current request
    clientState.requests.push(now);
    this.rateLimitStore.set(clientId, clientState);
    
    return true;
  }

  // Tool signature verification (for trusted tools)
  public verifyToolSignature(toolName: string, signature: string, payload: any): boolean {
    if (!this.config.enableToolSigning) {
      return true;
    }

    try {
      const trustedSignature = this.trustedToolSignatures.get(toolName);
      if (!trustedSignature) {
        this.logger.warn('No trusted signature found for tool', { toolName });
        return false;
      }

      // Verify signature hasn't expired (5 minutes)
      if (Date.now() - trustedSignature.timestamp > 300000) {
        this.logger.warn('Tool signature expired', { toolName });
        return false;
      }

      // Verify signature matches
      const expectedSignature = this.generateToolSignature(toolName, payload, trustedSignature.nonce);
      if (signature !== expectedSignature) {
        this.logger.warn('Tool signature verification failed', { toolName });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Signature verification error', { error, toolName });
      return false;
    }
  }

  // Generate tool signature
  public generateToolSignature(toolName: string, payload: any, nonce?: string): string {
    const nonceToUse = nonce || randomBytes(16).toString('hex');
    const dataToSign = JSON.stringify({ toolName, payload, nonce: nonceToUse });
    return createHash('sha256').update(dataToSign).digest('hex');
  }

  // Context isolation (prevent cross-tool data leakage)
  public isolateContext(context: any, allowedTools: string[]): any {
    if (!context || typeof context !== 'object') {
      return context;
    }

    const isolated: any = {};
    
    // Only include context fields relevant to allowed tools
    for (const [key, value] of Object.entries(context)) {
      // Check if this context field is safe for the current tool set
      if (this.isContextFieldSafe(key, allowedTools)) {
        isolated[key] = this.sanitizeContextValue(value);
      }
    }

    return isolated;
  }

  private isContextFieldSafe(field: string, allowedTools: string[]): boolean {
    // Define sensitive context fields that should be restricted
    const sensitiveFields = [
      'private_key', 'secret', 'password', 'token', 'signature',
      'wallet_seed', 'mnemonic', 'api_key', 'auth_token'
    ];

    if (sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive))) {
      return false;
    }

    // Tool-specific context restrictions
    const restrictedByTool: Record<string, string[]> = {
      'financial_tools': ['balance', 'transaction_history', 'portfolio'],
      'personal_tools': ['contacts', 'messages', 'location'],
      'system_tools': ['file_paths', 'environment_vars', 'processes']
    };

    for (const [toolCategory, restrictedFields] of Object.entries(restrictedByTool)) {
      if (!allowedTools.some(tool => tool.includes(toolCategory))) {
        if (restrictedFields.some(restricted => field.toLowerCase().includes(restricted))) {
          return false;
        }
      }
    }

    return true;
  }

  private sanitizeContextValue(value: any): any {
    if (typeof value === 'string') {
      // Truncate long strings and remove sensitive patterns
      return value.substring(0, 1000).replace(/[a-fA-F0-9]{64,}/g, '[HASH_REDACTED]');
    }
    
    if (Array.isArray(value)) {
      return value.slice(0, 100).map(item => this.sanitizeContextValue(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeContextValue(val);
      }
      return sanitized;
    }
    
    return value;
  }

  // Authentication verification
  public verifyAuthentication(authToken: string, requiredPermissions: string[]): boolean {
    if (!this.config.requireAuthentication) {
      return true;
    }

    try {
      // In a real implementation, verify JWT or API key
      // For now, basic token validation
      if (!authToken || authToken.length < 32) {
        return false;
      }

      // Check if token has required permissions
      const tokenPermissions = this.getTokenPermissions(authToken);
      const hasRequiredPermissions = requiredPermissions.every(perm => 
        tokenPermissions.includes(perm) || tokenPermissions.includes('admin')
      );

      if (!hasRequiredPermissions) {
        this.logger.warn('Insufficient permissions', { 
          required: requiredPermissions, 
          granted: tokenPermissions 
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Authentication verification error', { error });
      return false;
    }
  }

  private getTokenPermissions(token: string): string[] {
    // Mock implementation - replace with actual JWT parsing
    // or API key permission lookup
    return ['agent_management', 'messaging', 'channel_access'];
  }

  // Validate against tool-specific schemas
  private validateAgainstSchema(toolName: string, input: any): { valid: boolean; error?: string } {
    const schemas: Record<string, any> = {
      'register_agent': {
        required: ['name', 'capabilities'],
        maxNameLength: 50,
        maxCapabilities: 10
      },
      'send_message': {
        required: ['recipient', 'content'],
        maxContentLength: 10000
      },
      'create_escrow': {
        required: ['counterparty', 'amount', 'conditions'],
        minAmount: 0.001,
        maxAmount: 1000
      }
    };

    const schema = schemas[toolName];
    if (!schema) {
      return { valid: true }; // No specific schema defined
    }

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input) || input[field] === null || input[field] === undefined) {
          return { valid: false, error: `Missing required field: ${field}` };
        }
      }
    }

    // Tool-specific validations
    switch (toolName) {
      case 'register_agent':
        if (input.name && input.name.length > schema.maxNameLength) {
          return { valid: false, error: 'Agent name too long' };
        }
        if (input.capabilities && input.capabilities.length > schema.maxCapabilities) {
          return { valid: false, error: 'Too many capabilities' };
        }
        break;
        
      case 'send_message':
        if (input.content && input.content.length > schema.maxContentLength) {
          return { valid: false, error: 'Message content too long' };
        }
        break;
        
      case 'create_escrow':
        if (input.amount < schema.minAmount || input.amount > schema.maxAmount) {
          return { valid: false, error: 'Invalid escrow amount' };
        }
        break;
    }

    return { valid: true };
  }

  // Sanitize data for logging (remove sensitive information)
  private sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return data.length > 100 ? data.substring(0, 100) + '...' : data;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('private') ||
            key.toLowerCase().includes('password')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // Security audit logging
  public logSecurityEvent(event: string, details: any): void {
    this.logger.warn('Security event', {
      event,
      details: this.sanitizeForLogging(details),
      timestamp: new Date().toISOString()
    });
  }

  // Generate security report
  public generateSecurityReport(): any {
    const now = Date.now();
    const windowMs = 3600000; // 1 hour
    
    const recentRateLimits = Array.from(this.rateLimitStore.entries())
      .filter(([_, state]) => now - state.windowStart < windowMs)
      .length;

    return {
      timestamp: new Date().toISOString(),
      config: {
        inputValidation: this.config.enableInputValidation,
        rateLimiting: this.config.enableRateLimiting,
        toolSigning: this.config.enableToolSigning,
        authentication: this.config.requireAuthentication
      },
      metrics: {
        activeRateLimitedClients: recentRateLimits,
        trustedTools: this.trustedToolSignatures.size,
        noncesCached: this.nonceStore.size
      }
    };
  }
} 