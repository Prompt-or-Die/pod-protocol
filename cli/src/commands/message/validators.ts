import { address as createAddress, type Address } from "@solana/web3.js";
import { MessageStatus } from "@pod-protocol/sdk";
import {
  validatePublicKey,
  validateMessage,
  validateEnum,
  validatePositiveInteger,
} from "../../utils/validation.js";

// Helper function to validate addresses
function validateAddress(addressString: string, fieldName: string): Address {
  try {
    return createAddress(addressString);
  } catch {
    throw new Error(`Invalid ${fieldName}: must be a valid Solana address`);
  }
}

export class MessageValidators {
  static validateRecipient(recipient: string): Address {
    return validateAddress(recipient, "recipient");
  }

  static validateMessageId(messageId: string): Address {
    return validateAddress(messageId, "message ID");
  }

  static validateAgentAddress(addressString: string): Address {
    return validateAddress(addressString, "agent address");
  }

  static validateMessageContent(payload: string): string {
    return validateMessage(payload);
  }

  static validateMessageStatus(status: string): MessageStatus {
    const validStatuses = ["pending", "delivered", "read", "failed"] as const;
    return validateEnum(status, validStatuses, "status") as MessageStatus;
  }

  static validateLimit(limit: string): number {
    return validatePositiveInteger(limit, "limit");
  }

  static validateCustomValue(customValue: string): number {
    const value = parseInt(customValue, 10);
    if (isNaN(value) || value < 0) {
      throw new Error("Invalid custom value: must be a non-negative number");
    }
    return value;
  }

  static validateRecipientInteractive(input: string): boolean | string {
    try {
      createAddress(input);
      return true;
    } catch {
      return "Please enter a valid Solana address";
    }
  }
}
