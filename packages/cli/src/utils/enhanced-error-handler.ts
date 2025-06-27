import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';

export interface ErrorContext {
  command?: string;
  args?: string[];
  network?: string;
  timestamp?: Date;
  userId?: string;
}

export class EnhancedErrorHandler {
  private context: ErrorContext = {};

  setContext(context: ErrorContext) {
    this.context = { ...this.context, ...context };
  }

  handleError(error: Error | any, context?: ErrorContext): void {
    const errorContext = { ...this.context, ...context, timestamp: new Date() };
    
    if (process.env.VERBOSE === 'true') {
      this.handleVerboseError(error, errorContext);
    } else {
      this.handleUserFriendlyError(error, errorContext);
    }
    
    this.logError(error, errorContext);
  }

  private handleVerboseError(error: Error | any, context: ErrorContext): void {
    console.error(boxen(
      `${emoji.get('x')} ERROR DETAILS:\n\n` +
      `${emoji.get('warning')} Message: ${chalk.red(error.message || error.toString())}\n` +
      `${emoji.get('clock1')} Time: ${context.timestamp?.toISOString()}\n` +
      `${emoji.get('computer')} Command: ${context.command || 'unknown'}\n` +
      `${emoji.get('gear')} Args: ${context.args?.join(' ') || 'none'}\n` +
      `${emoji.get('globe_with_meridians')} Network: ${context.network || 'unknown'}\n\n` +
      `${emoji.get('scroll')} Stack Trace:\n${chalk.gray(error.stack || 'No stack trace available')}\n\n` +
      `${emoji.get('information_source')} For help: pod help-me debug errors`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: ' Verbose Error Report '
      }
    ));
  }

  private handleUserFriendlyError(error: Error | any, context: ErrorContext): void {
    const friendlyMessage = this.getFriendlyMessage(error);
    const suggestions = this.getSuggestions(error);

    console.error(boxen(
      `${emoji.get('x')} Something went wrong!\n\n` +
      `${emoji.get('speech_balloon')} ${chalk.yellow(friendlyMessage)}\n\n` +
      (suggestions.length > 0 ? 
        `${emoji.get('bulb')} Suggestions:\n${suggestions.map(s => `  • ${s}`).join('\n')}\n\n` : '') +
      `${emoji.get('sos')} Need help? Try:\n` +
      `  • ${chalk.cyan('pod doctor')} - Run system diagnostics\n` +
      `  • ${chalk.cyan('pod help-me')} - Get AI assistance\n` +
      `  • ${chalk.cyan('pod --verbose')} - See detailed error info`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: ' Error '
      }
    ));
  }

  private getFriendlyMessage(error: Error | any): string {
    const message = error.message || error.toString();
    
    // Common error patterns and their friendly messages
    const patterns: Record<string, string> = {
      'ENOENT': 'File or directory not found',
      'EACCES': 'Permission denied - check file permissions',
      'ECONNREFUSED': 'Connection refused - check network settings',
      'ETIMEDOUT': 'Operation timed out - check network connection',
      'MODULE_NOT_FOUND': 'Required module is missing - try running npm install',
      'SyntaxError': 'Invalid syntax in configuration or command',
      'wallet': 'Wallet operation failed - check your keypair and balance',
      'network': 'Network operation failed - check connection and settings',
      'agent': 'Agent operation failed - verify agent exists and is accessible'
    };

    for (const [pattern, friendlyMsg] of Object.entries(patterns)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return friendlyMsg;
      }
    }

    return message.length > 100 ? message.substring(0, 100) + '...' : message;
  }

  private getSuggestions(error: Error | any): string[] {
    const message = error.message || error.toString();
    const suggestions: string[] = [];

    if (message.includes('ENOENT')) {
      suggestions.push('Check if the file path is correct');
      suggestions.push('Ensure the file exists and is accessible');
    }

    if (message.includes('EACCES')) {
      suggestions.push('Run with appropriate permissions');
      suggestions.push('Check file ownership and permissions');
    }

    if (message.includes('network') || message.includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify network settings');
      suggestions.push('Try switching networks (devnet/testnet/mainnet)');
    }

    if (message.includes('wallet') || message.includes('keypair')) {
      suggestions.push('Check if your wallet file exists');
      suggestions.push('Verify keypair path is correct');
      suggestions.push('Ensure you have sufficient balance');
    }

    if (message.includes('MODULE_NOT_FOUND')) {
      suggestions.push('Run: bun install');
      suggestions.push('Check if all dependencies are installed');
    }

    return suggestions;
  }

  private logError(error: Error | any, context: ErrorContext): void {
    // In a real implementation, this would log to a file or external service
    const logEntry = {
      timestamp: context.timestamp?.toISOString(),
      message: error.message || error.toString(),
      stack: error.stack,
      context,
      level: 'error'
    };

    if (process.env.VERBOSE === 'true') {
      console.error(chalk.gray('Error logged:'), JSON.stringify(logEntry, null, 2));
    }
  }

  // Utility methods for different error types
  handleValidationError(field: string, value: any, expected: string): void {
    this.handleError(new Error(`Invalid ${field}: "${value}". Expected: ${expected}`));
  }

  handleNetworkError(operation: string, network: string): void {
    this.handleError(new Error(`Network operation failed: ${operation} on ${network}`), {
      network,
      command: operation
    });
  }

  handleAgentError(agentName: string, operation: string): void {
    this.handleError(new Error(`Agent operation failed: ${operation} for agent "${agentName}"`), {
      command: `agent ${operation}`,
      args: [agentName]
    });
  }
}

// Export singleton instance
export const errorHandler = new EnhancedErrorHandler(); 