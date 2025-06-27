import chalk from "chalk";
import { Ora } from "ora";

/**
 * Error codes for different types of CLI errors
 */
export enum ErrorCode {
  VALIDATION_ERROR = 1,
  NETWORK_ERROR = 2,
  WALLET_ERROR = 3,
  SDK_ERROR = 4,
  FILE_ERROR = 5,
  CONFIG_ERROR = 6,
  UNKNOWN_ERROR = 99,
}

/**
 * Standard CLI error class with error codes
 */
export class CliError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    public cause?: Error,
  ) {
    super(message);
    this.name = "CliError";
  }
}

/**
 * Error handler for CLI operations
 */
export class ErrorHandler {
  /**
   * Handle errors with spinner and user-friendly messages
   */
  static handleError(error: Error, spinner?: Ora, context?: string): never {
    const errorMessage = this.getErrorMessage(error, context);
    const suggestions = this.getErrorSuggestions(error);

    if (spinner) {
      spinner.fail(errorMessage);
    } else {
      console.error(chalk.red("Error:"), errorMessage);
    }

    if (suggestions.length > 0) {
      console.log(chalk.yellow("\nSuggestions:"));
      suggestions.forEach((suggestion) => {
        console.log(chalk.yellow(`• ${suggestion}`));
      });
    }

    const exitCode =
      error instanceof CliError ? error.code : ErrorCode.UNKNOWN_ERROR;
    process.exit(exitCode);
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: Error, context?: string): string {
    const baseMessage = context ? `Failed to ${context}` : "Operation failed";

    if (error.message.includes("Non-base58 character")) {
      return "Invalid address format - must be a valid Solana public key";
    }

    if (error.message.includes("Network request failed")) {
      return "Network connection failed - check your internet connection";
    }

    if (error.message.includes("Insufficient funds")) {
      return "Insufficient SOL balance - add funds to your wallet";
    }

    if (error.message.includes("not yet implemented")) {
      return "This feature is not yet implemented";
    }

    return `${baseMessage}: ${error.message}`;
  }

  /**
   * Get helpful suggestions based on error type
   */
  static getErrorSuggestions(error: Error): string[] {
    const suggestions: string[] = [];

    if (error.message.includes("Non-base58")) {
      suggestions.push("Use 'pod agent list' to see valid agent addresses");
      suggestions.push("Ensure the address is 32-44 characters long");
    }

    if (error.message.includes("Network")) {
      suggestions.push("Check your internet connection");
      suggestions.push(
        "Try switching networks with 'pod config set-network <network>'",
      );
    }

    if (error.message.includes("Insufficient funds")) {
      suggestions.push("Get devnet SOL with 'pod config airdrop'");
      suggestions.push("Check your balance with 'pod config show'");
    }

    if (error.message.includes("Keypair")) {
      suggestions.push(
        "Generate a new keypair with 'pod config generate-keypair'",
      );
      suggestions.push("Check your keypair path with 'pod config show'");
    }

    return suggestions;
  }

  /**
   * Create specific error types
   */
  static validationError(message: string): CliError {
    return new CliError(message, ErrorCode.VALIDATION_ERROR);
  }

  static networkError(message: string, cause?: Error): CliError {
    return new CliError(message, ErrorCode.NETWORK_ERROR, cause);
  }

  static walletError(message: string, cause?: Error): CliError {
    return new CliError(message, ErrorCode.WALLET_ERROR, cause);
  }

  static configError(message: string, cause?: Error): CliError {
    return new CliError(message, ErrorCode.CONFIG_ERROR, cause);
  }
}

/**
 * Utility for safely executing async operations with error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext?: string,
  spinner?: Ora,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.handleError(error as Error, spinner, errorContext);
  }
}

/**
 * Display error with context and suggestions
 */
export function displayError(context: string, error: Error): void {
  console.error(chalk.red("Error:"), `${context}: ${error.message}`);
  
  const suggestions = ErrorHandler.getErrorSuggestions(error);
  if (suggestions.length > 0) {
    console.log(chalk.yellow("\nSuggestions:"));
    suggestions.forEach((suggestion) => {
      console.log(chalk.yellow(`• ${suggestion}`));
    });
  }
}
