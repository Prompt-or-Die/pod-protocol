import chalk from "chalk";
import { BRAND_COLORS, ICONS, infoBox, statusMessage } from "./branding.js";

/**
 * Enhanced Error Handling System for PoD CLI
 * Provides structured error codes, detailed diagnostics, and helpful suggestions
 */

export enum ErrorCode {
  // Network & Connection Errors (1000-1099)
  NETWORK_CONNECTION_FAILED = 1001,
  NETWORK_TIMEOUT = 1002,
  NETWORK_INVALID_URL = 1003,
  RPC_ENDPOINT_UNREACHABLE = 1004,

  // Authentication & Wallet Errors (1100-1199)
  WALLET_NOT_FOUND = 1101,
  WALLET_INVALID_KEYPAIR = 1102,
  WALLET_INSUFFICIENT_FUNDS = 1103,
  WALLET_UNAUTHORIZED = 1104,
  KEYPAIR_FILE_NOT_FOUND = 1105,

  // Agent Errors (1200-1299)
  AGENT_NOT_FOUND = 1201,
  AGENT_ALREADY_EXISTS = 1202,
  AGENT_INVALID_CAPABILITIES = 1203,
  AGENT_REGISTRATION_FAILED = 1204,
  AGENT_UPDATE_FAILED = 1205,

  // Message Errors (1300-1399)
  MESSAGE_SEND_FAILED = 1301,
  MESSAGE_NOT_FOUND = 1302,
  MESSAGE_INVALID_RECIPIENT = 1303,
  MESSAGE_PAYLOAD_TOO_LARGE = 1304,
  MESSAGE_INVALID_TYPE = 1305,

  // Channel Errors (1400-1499)
  CHANNEL_NOT_FOUND = 1401,
  CHANNEL_ALREADY_EXISTS = 1402,
  CHANNEL_ACCESS_DENIED = 1403,
  CHANNEL_FULL = 1404,
  CHANNEL_CREATION_FAILED = 1405,

  // Escrow Errors (1500-1599)
  ESCROW_INSUFFICIENT_BALANCE = 1501,
  ESCROW_DEPOSIT_FAILED = 1502,
  ESCROW_WITHDRAWAL_FAILED = 1503,
  ESCROW_NOT_FOUND = 1504,

  // Configuration Errors (1600-1699)
  CONFIG_FILE_NOT_FOUND = 1601,
  CONFIG_INVALID_FORMAT = 1602,
  CONFIG_MISSING_REQUIRED_FIELD = 1603,
  CONFIG_WRITE_FAILED = 1604,

  // Validation Errors (1700-1799)
  VALIDATION_INVALID_ADDRESS = 1701,
  VALIDATION_INVALID_AMOUNT = 1702,
  VALIDATION_INVALID_INPUT = 1703,
  VALIDATION_MISSING_REQUIRED_PARAM = 1704,

  // System Errors (1800-1899)
  SYSTEM_COMMAND_NOT_FOUND = 1801,
  SYSTEM_PERMISSION_DENIED = 1802,
  SYSTEM_DISK_FULL = 1803,
  SYSTEM_UNEXPECTED_ERROR = 1804,

  // Program/Contract Errors (1900-1999)
  PROGRAM_NOT_DEPLOYED = 1901,
  PROGRAM_ACCOUNT_NOT_FOUND = 1902,
  PROGRAM_INSTRUCTION_FAILED = 1903,
  PROGRAM_SIMULATION_FAILED = 1904,
}

export interface ErrorDetails {
  code: ErrorCode;
  title: string;
  message: string;
  cause?: string;
  suggestions: string[];
  technicalDetails?: Record<string, any>;
  documentationUrl?: string;
}

export class PodError extends Error {
  public readonly code: ErrorCode;
  public readonly title: string;
  public readonly cause?: string;
  public readonly suggestions: string[];
  public readonly technicalDetails?: Record<string, any>;
  public readonly documentationUrl?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = "PodError";
    this.code = details.code;
    this.title = details.title;
    this.cause = details.cause;
    this.suggestions = details.suggestions;
    this.technicalDetails = details.technicalDetails;
    this.documentationUrl = details.documentationUrl;
  }
}

/**
 * Predefined error templates for common issues
 */
export const ERROR_TEMPLATES: Partial<
  Record<ErrorCode, Omit<ErrorDetails, "code">>
> = {
  [ErrorCode.NETWORK_CONNECTION_FAILED]: {
    title: "Network Connection Failed",
    message: "Unable to connect to the Solana network",
    suggestions: [
      "Check your internet connection",
      "Verify the RPC endpoint URL is correct",
      "Try switching to a different network (devnet/mainnet)",
      "Check if the network is experiencing downtime",
    ],
    documentationUrl: "https://docs.solana.com/cluster/rpc-endpoints",
  },

  [ErrorCode.WALLET_NOT_FOUND]: {
    title: "Wallet Not Found",
    message: "No wallet configured or keypair file not found",
    suggestions: [
      "Generate a new keypair with: solana-keygen new",
      "Set your keypair path with: pod config set-keypair <path>",
      "Verify the keypair file exists and is readable",
    ],
    documentationUrl: "https://docs.solana.com/wallet-guide/cli",
  },

  [ErrorCode.WALLET_INSUFFICIENT_FUNDS]: {
    title: "Insufficient Funds",
    message: "Wallet does not have enough SOL for this transaction",
    suggestions: [
      "Check your wallet balance with: pod config wallet-info",
      "For devnet: Get test SOL with: solana airdrop 2",
      "For mainnet: Transfer SOL to your wallet address",
      "Consider reducing the transaction amount",
    ],
  },

  [ErrorCode.AGENT_NOT_FOUND]: {
    title: "Agent Not Found",
    message: "The specified agent does not exist on the network",
    suggestions: [
      "Verify the agent address is correct",
      "Check if the agent is registered with: pod agent info <address>",
      "Register a new agent with: pod agent register",
      "List all agents with: pod agent list",
    ],
  },

  [ErrorCode.AGENT_ALREADY_EXISTS]: {
    title: "Agent Already Exists",
    message: "An agent is already registered for this wallet",
    suggestions: [
      "Update existing agent with: pod agent update",
      "View current agent with: pod agent info <address>",
      "Use a different wallet for a new agent",
    ],
  },

  [ErrorCode.PROGRAM_NOT_DEPLOYED]: {
    title: "Program Not Deployed",
    message: "PoD Protocol program is not deployed on this network",
    suggestions: [
      "Switch to devnet where the program is deployed",
      "Check network status with: pod config get-network",
      "Contact support if program should be available on this network",
    ],
  },

  [ErrorCode.CONFIG_FILE_NOT_FOUND]: {
    title: "Configuration Not Found",
    message: "CLI configuration file does not exist",
    suggestions: [
      "Initialize configuration with: pod config init",
      "Set network with: pod config set-network devnet",
      "Set keypair with: pod config set-keypair <path>",
    ],
  },

  [ErrorCode.VALIDATION_INVALID_ADDRESS]: {
    title: "Invalid Address",
    message: "The provided address is not a valid Solana public key",
    suggestions: [
      "Ensure address is a 44-character base58 string",
      "Check for typos in the address",
      "Use tab completion if available",
      "Verify the address format: 11111111111111111111111111111111",
    ],
  },

  [ErrorCode.MESSAGE_SEND_FAILED]: {
    title: "Message Send Failed",
    message: "Unable to send message to the specified recipient",
    suggestions: [
      "Verify recipient agent exists and is active",
      "Check wallet has sufficient SOL for transaction fees",
      "Ensure message payload is within size limits",
      "Try again in a few moments",
    ],
  },

  [ErrorCode.CHANNEL_NOT_FOUND]: {
    title: "Channel Not Found",
    message: "The specified channel does not exist",
    suggestions: [
      "List available channels with: pod channel list",
      "Create a new channel with: pod channel create",
      "Verify the channel name or address is correct",
    ],
  },

  // Add more error templates as needed...
};

/**
 * Enhanced error handler with rich formatting and suggestions
 */
export class EnhancedErrorHandler {
  private verbose: boolean = false;
  private debugMode: boolean = false;
  private exitOnError: boolean = true;

  /**
   * Creates an instance of EnhancedErrorHandler.
   * @param {object} [options={}] - Configuration options for the error handler.
   * @param {boolean} [options.verbose=false] - If true, enables verbose error output.
   * @param {boolean} [options.debug=false] - If true, enables debug mode for more detailed error information.
   * @param {boolean} [options.exitOnError=true] - If true, the process will exit upon encountering an error.
   */
  constructor(
    options: { verbose?: boolean; debug?: boolean; exitOnError?: boolean } = {},
  ) {
    this.verbose = options.verbose || false;
    this.debugMode = options.debug || false;
    this.exitOnError = options.exitOnError ?? true;
  }

  public handleError(error: PodError | Error): void {
    if (error instanceof PodError) {
      this.displayPodError(error);
    } else {
      this.displayGenericError(error);
    }

    if (this.exitOnError) {
      process.exit(1);
    }
  }

  /**
   * Display a formatted PodError
   */
  private displayPodError(error: PodError): void {
    console.log();

    // Error header
    console.log(statusMessage("error", error.title));
    console.log(BRAND_COLORS.muted(`Error Code: ${error.code}`));
    console.log();

    // Main message
    console.log(BRAND_COLORS.error(error.message));

    // Cause if available
    if (error.cause) {
      console.log();
      console.log(BRAND_COLORS.muted("Cause:"));
      console.log(`  ${error.cause}`);
    }

    // Suggestions
    if (error.suggestions.length > 0) {
      console.log();
      console.log(BRAND_COLORS.accent("💡 Suggestions:"));
      error.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // Technical details in verbose mode
    if (this.verbose && error.technicalDetails) {
      console.log();
      console.log(BRAND_COLORS.muted("Technical Details:"));
      Object.entries(error.technicalDetails).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`);
      });
    }

    // Documentation link
    if (error.documentationUrl) {
      console.log();
      console.log(
        BRAND_COLORS.info(`📚 Documentation: ${error.documentationUrl}`),
      );
    }

    // Debug info
    if (this.debugMode) {
      console.log();
      console.log(BRAND_COLORS.muted("Debug Information:"));
      console.log(`  Stack Trace:`);
      console.log(
        error.stack
          ?.split("\n")
          .map((line) => `    ${line}`)
          .join("\n"),
      );
    }

    console.log();
  }

  /**
   * Display a generic error with basic formatting
   */
  private displayGenericError(error: Error): void {
    console.log();
    console.log(statusMessage("error", "Unexpected Error"));
    console.log(BRAND_COLORS.error(error.message));

    if (this.debugMode && error.stack) {
      console.log();
      console.log(BRAND_COLORS.muted("Stack Trace:"));
      console.log(
        error.stack
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }

    console.log();
    console.log(
      BRAND_COLORS.muted("If this error persists, please report it at:"),
    );
    console.log(
      BRAND_COLORS.info("https://github.com/Dexploarer/PoD-Protocol/issues"),
    );
    console.log();
  }

  /**
   * Create a PodError from an error code
   */
  public static createError(
    code: ErrorCode,
    overrides: Partial<ErrorDetails> = {},
  ): PodError {
    const template = ERROR_TEMPLATES[code];
    if (!template) {
      throw new Error(`Unknown error code: ${code}`);
    }

    return new PodError({
      code,
      ...template,
      ...overrides,
    });
  }

  /**
   * Wrap async operations with error handling
   */
  public async safeExecute<T>(
    operation: () => Promise<T>,
    errorCode: ErrorCode,
    errorOverrides: Partial<ErrorDetails> = {},
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const podError = EnhancedErrorHandler.createError(errorCode, {
        cause: error.message,
        technicalDetails: {
          originalError: error.name,
          timestamp: new Date().toISOString(),
        },
        ...errorOverrides,
      });

      this.handleError(podError);
      throw podError; // This won't be reached due to process.exit
    }
  }

  /**
   * Display a warning message
   */
  public displayWarning(message: string, details?: string): void {
    console.log(statusMessage("warning", message, details));
  }

  /**
   * Display a success message
   */
  public displaySuccess(message: string, details?: string): void {
    console.log(statusMessage("success", message, details));
  }

  /**
   * Display an info message
   */
  public displayInfo(message: string, details?: string): void {
    console.log(statusMessage("info", message, details));
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new EnhancedErrorHandler();

/**
 * Convenience function to create common errors
 */
export const createError = EnhancedErrorHandler.createError;
