import inquirer from "inquirer";
// Local constants to avoid import issues during Web3.js v2 migration
enum ChannelVisibility {
  Public = 0,
  Private = 1,
  Restricted = 2,
}
import { ChannelData } from "./types.js";
import { ChannelValidators } from "./validators.js";

export class ChannelDataHandler {
  static async prepareChannelData(options: any): Promise<ChannelData> {
    // Ensure all inputs are properly typed and provide defaults
    let name =
      options.name && typeof options.name === "string" ? options.name : "";
    let description =
      options.description && typeof options.description === "string"
        ? options.description
        : "";
    let visibility =
      options.visibility && typeof options.visibility === "string"
        ? options.visibility
        : "public";
    let maxParticipants = parseInt(options.maxParticipants, 10) || 100;
    let feePerMessage = parseInt(options.fee, 10) || 1000;

    if (options.interactive) {
      const answers = await this.promptForChannelData();
      name = answers.name;
      description = answers.description;
      visibility = answers.visibility;
      maxParticipants = answers.maxParticipants;
      feePerMessage = answers.feePerMessage;
    }

    const channelData: ChannelData = {
      name,
      description,
      visibility: visibility as ChannelVisibility,
      maxMembers: maxParticipants,
      maxParticipants, // Legacy alias for compatibility
      feePerMessage,
    };

    ChannelValidators.validateChannelData(channelData);
    return channelData;
  }

  private static async promptForChannelData() {
    return await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Channel name:",
        validate: (input: string) =>
          input.length > 0 ? true : "Channel name is required",
      },
      {
        type: "input",
        name: "description",
        message: "Channel description:",
        default: "",
      },
      {
        type: "list",
        name: "visibility",
        message: "Channel visibility:",
        choices: [
          { name: "Public", value: "public" },
          { name: "Private", value: "private" },
        ],
        default: "public",
      },
      {
        type: "number",
        name: "maxParticipants",
        message: "Maximum participants:",
        default: 100,
        validate: (input: number) =>
          input > 0 ? true : "Must be greater than 0",
      },
      {
        type: "number",
        name: "feePerMessage",
        message: "Fee per message (lamports):",
        default: 1000,
        validate: (input: number) =>
          input >= 0 ? true : "Must be 0 or greater",
      },
    ]);
  }
}
