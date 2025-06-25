/**
 * Advanced Security Validation Utilities for PoD Protocol
 * Comprehensive protection against injection attacks and data leakage
 */

import { createHash } from 'crypto';
import { BRAND_COLORS, ICONS } from './branding.js';
import { ValidationError } from './validation.js';

/**
 * Injection attack patterns and detection
 */
const INJECTION_PATTERNS = {
  // Command injection patterns
  COMMAND_INJECTION: [
    /[;&|`$(){}[\]\\]/g,
    /\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\b/gi,
    /\b(rm|del|format|shutdown|reboot|halt)\b/gi,
    /\$\{.*\}/g, // Parameter expansion
    /`[^`]*`/g,  // Backtick command substitution
    /\$\([^)]*\)/g, // Command substitution
  ],

  // SQL injection patterns
  SQL_INJECTION: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b.*?;)/gi,
    /(\bunion\b.*?\bselect\b)/gi,
    /(\bor\b.*?=.*?=|\band\b.*?=.*?=)/gi,
    /('.*?'|".*?")\s*[=<>!]+\s*('.*?'|".*?")/gi,
    /(\bexec\b|\bsp_\w+)/gi,
    /-{2,}.*$/gm, // SQL comments
  ],

  // Script injection patterns
  SCRIPT_INJECTION: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=\s*['"]/gi,
    /data:text\/html/gi,
    /data:application\/x-javascript/gi,
  ],

  // Prompt injection patterns (for AI models)
  PROMPT_INJECTION: [
    /\b(ignore|forget|disregard)\b.*?\b(previous|above|earlier|prior)\b/gi,
    /\b(act|behave|pretend|role[\s-]?play)\b.*?\b(as|like)\b/gi,
    /\b(jailbreak|bypass|override|circumvent)\b/gi,
    /\b(system|admin|root|developer)\b.*?\b(mode|prompt|instruction)\b/gi,
    /\b(tell|show|reveal|expose|leak)\b.*?\b(password|secret|key|token|credential)/gi,
  ],

  // Path traversal patterns
  PATH_TRAVERSAL: [
    /\.\.\/|\.\.\\/g,
    /\.\.[\/\\]/g,
    /[\/\\]\.\.$/g,
    /~[\/\\]/g,
    /\$\{[^}]*\}/g,
    /%2e%2e%2f|%2e%2e%5c/gi,
  ],

  // NoSQL injection patterns
  NOSQL_INJECTION: [
    /\$where.*?\$\w+/gi,
    /\$regex.*?\$options/gi,
    /\$ne.*?\$gt.*?\$lt/gi,
    /\$or.*?\$and/gi,
    /\$eval.*?\$function/gi,
  ],
};

/**
 * Context isolation configuration
 */
interface ContextIsolationConfig {
  allowedTools: string[];
  maxDataSize: number;
  allowedDomains: string[];
  enableSandbox: boolean;
  logLevel: 'none' | 'basic' | 'detailed';
}

/**
 * Injection detection result
 */
interface InjectionDetectionResult {
  isInjection: boolean;
  injectionType: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedPatterns: string[];
  recommendations: string[];
}

/**
 * Context isolation result
 */
interface ContextIsolationResult {
  isIsolated: boolean;
  allowedOperations: string[];
  blockedOperations: string[];
  dataLeakageRisk: 'none' | 'low' | 'medium' | 'high';
  warnings: string[];
}

/**
 * Advanced injection detection engine
 */
export class InjectionDetector {
  private static readonly SEVERITY_WEIGHTS = {
    COMMAND_INJECTION: 10,
    SQL_INJECTION: 8,
    SCRIPT_INJECTION: 9,
    PROMPT_INJECTION: 7,
    PATH_TRAVERSAL: 6,
    NOSQL_INJECTION: 5,
  };

  /**
   * Detect potential injection attempts in input
   */
  static detectInjectionAttempt(input: string): InjectionDetectionResult {
    if (typeof input !== 'string') {
      return {
        isInjection: false,
        injectionType: [],
        riskLevel: 'low',
        detectedPatterns: [],
        recommendations: []
      };
    }

    const results: InjectionDetectionResult = {
      isInjection: false,
      injectionType: [],
      riskLevel: 'low',
      detectedPatterns: [],
      recommendations: []
    };

    let totalSeverity = 0;

    // Check each injection pattern type
    Object.entries(INJECTION_PATTERNS).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = input.match(pattern);
        if (matches) {
          results.isInjection = true;
          results.injectionType.push(type);
          results.detectedPatterns.push(...matches);
          
          const severity = this.SEVERITY_WEIGHTS[type as keyof typeof this.SEVERITY_WEIGHTS] || 1;
          totalSeverity += severity * matches.length;
        }
      });
    });

    // Determine risk level
    if (totalSeverity >= 20) {
      results.riskLevel = 'critical';
    } else if (totalSeverity >= 10) {
      results.riskLevel = 'high';
    } else if (totalSeverity >= 5) {
      results.riskLevel = 'medium';
    } else if (totalSeverity > 0) {
      results.riskLevel = 'low';
    }

    // Generate recommendations
    if (results.isInjection) {
      results.recommendations = this.generateRecommendations(results.injectionType);
    }

    return results;
  }

  private static generateRecommendations(injectionTypes: string[]): string[] {
    const recommendations: string[] = [];
    
    if (injectionTypes.includes('COMMAND_INJECTION')) {
      recommendations.push('Use parameterized commands and avoid shell execution');
      recommendations.push('Implement command whitelisting');
    }
    
    if (injectionTypes.includes('SQL_INJECTION')) {
      recommendations.push('Use prepared statements and parameterized queries');
      recommendations.push('Implement input validation before database operations');
    }
    
    if (injectionTypes.includes('SCRIPT_INJECTION')) {
      recommendations.push('Sanitize HTML and JavaScript content');
      recommendations.push('Use Content Security Policy (CSP) headers');
    }
    
    if (injectionTypes.includes('PROMPT_INJECTION')) {
      recommendations.push('Implement role-based access controls');
      recommendations.push('Use system-level prompt protection');
    }

    return recommendations;
  }
}

/**
 * Context-aware input sanitizer
 */
export class InputSanitizer {
  private static readonly SANITIZATION_RULES = {
    // HTML context
    HTML: {
      allowedTags: ['p', 'b', 'i', 'em', 'strong', 'br'],
      allowedAttributes: [],
      stripScripts: true,
      stripEvents: true,
    },
    
    // Command context
    COMMAND: {
      allowedChars: /^[a-zA-Z0-9\-_./\s]+$/,
      maxLength: 1000,
      stripMetaChars: true,
    },
    
    // Blockchain context
    BLOCKCHAIN: {
      allowedChars: /^[a-zA-Z0-9]+$/,
      maxLength: 44, // Solana address length
      checksum: true,
    },
    
    // Message content
    MESSAGE: {
      maxLength: 10000,
      stripHtml: true,
      preserveFormatting: false,
    }
  };

  /**
   * Sanitize input based on context
   */
  static sanitizeInput(
    input: string, 
    context: 'HTML' | 'COMMAND' | 'BLOCKCHAIN' | 'MESSAGE' | 'GENERAL' = 'GENERAL'
  ): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    let sanitized = input;

    // Apply context-specific sanitization
    switch (context) {
      case 'HTML':
        sanitized = this.sanitizeHtml(sanitized);
        break;
      case 'COMMAND':
        sanitized = this.sanitizeCommand(sanitized);
        break;
      case 'BLOCKCHAIN':
        sanitized = this.sanitizeBlockchainData(sanitized);
        break;
      case 'MESSAGE':
        sanitized = this.sanitizeMessage(sanitized);
        break;
      case 'GENERAL':
        sanitized = this.sanitizeGeneral(sanitized);
        break;
    }

    return sanitized;
  }

  private static sanitizeHtml(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=\s*['"]/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }

  private static sanitizeCommand(input: string): string {
    const rules = this.SANITIZATION_RULES.COMMAND;
    
    let sanitized = input
      .replace(/[;&|`$(){}[\]\\]/g, '') // Remove command injection chars
      .replace(/\$\{.*?\}/g, '') // Remove parameter expansion
      .replace(/`[^`]*`/g, '') // Remove backticks
      .replace(/\$\([^)]*\)/g, '') // Remove command substitution
      .trim();

    if (sanitized.length > rules.maxLength) {
      sanitized = sanitized.substring(0, rules.maxLength);
    }

    if (!rules.allowedChars.test(sanitized)) {
      throw new ValidationError('Command contains invalid characters');
    }

    return sanitized;
  }

  private static sanitizeBlockchainData(input: string): string {
    const rules = this.SANITIZATION_RULES.BLOCKCHAIN;
    
    let sanitized = input
      .replace(/[^a-zA-Z0-9]/g, '') // Only alphanumeric
      .trim();

    if (sanitized.length > rules.maxLength) {
      throw new ValidationError(`Blockchain data too long (max ${rules.maxLength} chars)`);
    }

    return sanitized;
  }

  private static sanitizeMessage(input: string): string {
    const rules = this.SANITIZATION_RULES.MESSAGE;
    
    let sanitized = input;
    
    if (rules.stripHtml) {
      sanitized = this.sanitizeHtml(sanitized);
    }

    if (sanitized.length > rules.maxLength) {
      throw new ValidationError(`Message too long (max ${rules.maxLength} chars)`);
    }

    return sanitized.trim();
  }

  private static sanitizeGeneral(input: string): string {
    return input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

/**
 * Context isolation engine
 */
export class ContextIsolator {
  /**
   * Isolate context and prevent data leakage
   */
  static isolateContext(
    context: any, 
    config: ContextIsolationConfig
  ): ContextIsolationResult {
    const result: ContextIsolationResult = {
      isIsolated: false,
      allowedOperations: [],
      blockedOperations: [],
      dataLeakageRisk: 'none',
      warnings: []
    };

    try {
      // Validate context size
      const contextSize = JSON.stringify(context).length;
      if (contextSize > config.maxDataSize) {
        result.dataLeakageRisk = 'high';
        result.warnings.push(`Context size (${contextSize}) exceeds limit (${config.maxDataSize})`);
      }

      // Analyze context for sensitive data
      const sensitiveDataCheck = this.detectSensitiveData(context);
      if (sensitiveDataCheck.hasSensitiveData) {
        result.dataLeakageRisk = 'high';
        result.warnings.push(...sensitiveDataCheck.warnings);
      }

      // Create isolated context
      const isolatedContext = this.createIsolatedContext(context, config);
      
      // Determine allowed operations
      result.allowedOperations = config.allowedTools.filter(tool => 
        this.isToolSafe(tool, isolatedContext)
      );
      
      // Determine blocked operations
      result.blockedOperations = config.allowedTools.filter(tool => 
        !this.isToolSafe(tool, isolatedContext)
      );

      result.isIsolated = true;

      if (config.logLevel !== 'none') {
        this.logIsolationResult(result, config.logLevel);
      }

    } catch (error) {
      result.warnings.push(`Context isolation failed: ${error}`);
      result.dataLeakageRisk = 'high';
    }

    return result;
  }

  private static detectSensitiveData(context: any): { hasSensitiveData: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const sensitivePatterns = [
      /password|secret|key|token|credential/i,
      /\b[A-Za-z0-9]{64}\b/, // Potential private keys
      /\b[A-Za-z0-9]{44}\b/, // Potential Solana addresses
      /\bmnemonic|seed\b/i,
      /\bapi[_-]?key\b/i,
    ];

    const contextStr = JSON.stringify(context);
    
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(contextStr)) {
        warnings.push(`Potential sensitive data detected: ${pattern.source}`);
      }
    });

    return {
      hasSensitiveData: warnings.length > 0,
      warnings
    };
  }

  private static createIsolatedContext(context: any, config: ContextIsolationConfig): any {
    // Create a deep copy to avoid reference issues
    const isolated = JSON.parse(JSON.stringify(context));
    
    // Remove sensitive fields
    this.removeSensitiveFields(isolated);
    
    // Add isolation metadata
    isolated.__isolation = {
      timestamp: Date.now(),
      config: {
        allowedTools: config.allowedTools,
        enableSandbox: config.enableSandbox,
      }
    };

    return isolated;
  }

  private static removeSensitiveFields(obj: any): void {
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'credential', 'mnemonic', 'seed'];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          this.removeSensitiveFields(obj[key]);
        }
      }
    }
  }

  private static isToolSafe(tool: string, context: any): boolean {
    // Define unsafe tools
    const unsafeTools = ['eval', 'exec', 'system', 'shell', 'file_write', 'network_access'];
    
    if (unsafeTools.includes(tool)) {
      return false;
    }

    // Check if tool has been marked as unsafe in context
    if (context.__isolation?.unsafeTools?.includes(tool)) {
      return false;
    }

    return true;
  }

  private static logIsolationResult(result: ContextIsolationResult, level: 'basic' | 'detailed'): void {
    if (level === 'basic') {
      console.log(`${ICONS.shield} Context isolated: ${result.isIsolated ? 'Success' : 'Failed'}`);
    } else {
      console.log(`${ICONS.shield} ${BRAND_COLORS.accent('Context Isolation Report:')}`);
      console.log(`  Status: ${result.isIsolated ? BRAND_COLORS.success('✓ Isolated') : BRAND_COLORS.error('✗ Failed')}`);
      console.log(`  Data Leakage Risk: ${BRAND_COLORS.warning(result.dataLeakageRisk.toUpperCase())}`);
      console.log(`  Allowed Operations: ${result.allowedOperations.length}`);
      console.log(`  Blocked Operations: ${result.blockedOperations.length}`);
      
      if (result.warnings.length > 0) {
        console.log(`  Warnings:`);
        result.warnings.forEach(warning => {
          console.log(`    ${BRAND_COLORS.warning('⚠')} ${warning}`);
        });
      }
    }
  }
}

/**
 * Main security validation interface
 */
export class SecurityValidator {
  /**
   * Comprehensive security validation
   */
  static validateInput(
    input: string,
    context: 'HTML' | 'COMMAND' | 'BLOCKCHAIN' | 'MESSAGE' | 'GENERAL' = 'GENERAL',
    options: {
      detectInjection?: boolean;
      sanitize?: boolean;
      throwOnInjection?: boolean;
    } = {}
  ): { sanitized: string; injectionResult?: InjectionDetectionResult } {
    const { detectInjection = true, sanitize = true, throwOnInjection = true } = options;

    let result: { sanitized: string; injectionResult?: InjectionDetectionResult } = {
      sanitized: input
    };

    // Detect injection attempts
    if (detectInjection) {
      const injectionResult = InjectionDetector.detectInjectionAttempt(input);
      result.injectionResult = injectionResult;

      if (injectionResult.isInjection && throwOnInjection) {
        throw new ValidationError(
          `Injection attempt detected: ${injectionResult.injectionType.join(', ')}`
        );
      }
    }

    // Sanitize input
    if (sanitize) {
      result.sanitized = InputSanitizer.sanitizeInput(input, context);
    }

    return result;
  }
}

// Export main functions for backward compatibility
export const detectInjectionAttempt = InjectionDetector.detectInjectionAttempt;
export const sanitizeInput = InputSanitizer.sanitizeInput;
export const isolateContext = ContextIsolator.isolateContext; 