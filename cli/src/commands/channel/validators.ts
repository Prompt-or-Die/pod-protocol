import {
  validateChannelName,
  validatePositiveInteger,
  validateMessage,
} from "../../utils/validation.js";
import { ChannelData } from "./types.js";

// Local constants to avoid import issues during Web3.js v2 migration
enum ChannelVisibility {
  Public = 0,
  Private = 1,
  Restricted = 2,
}

export class ChannelValidators {
  static validateChannelData(data: ChannelData): void {
    validateChannelName(data.name);
    // Validate enum value (ChannelVisibility.Public = 0, Private = 1, Restricted = 2)
    if (![ChannelVisibility.Public, ChannelVisibility.Private, ChannelVisibility.Restricted].includes(data.visibility)) {
      throw new Error("Invalid channel visibility");
    }
    validatePositiveInteger(data.maxMembers);
    validatePositiveInteger(data.feePerMessage);
  }

  static validateMessage(message: string): void {
    validateMessage(message);
  }

  static parseMessageType(type: string): string {
    const typeMap: { [key: string]: string } = {
      text: "Text",
      data: "Data",
      command: "Command",
      response: "Response",
    };
    return typeMap[type.toLowerCase()] || "Text";
  }
}
