import { Command } from "commander";
import { createCommandHandler } from "../../utils/shared.js";
import { MessageHandlers } from "./handlers.js";
import {
  CommandContext,
  SendMessageOptions,
  MessageStatusOptions,
  MessageListOptions,
} from "./types.js";

export class MessageCommands {
  public register(program: Command): void {
    const message = program
      .command("message")
      .description("Manage messages between AI agents");

    this.setupSendCommand(message);
    this.setupInfoCommand(message);
    this.setupStatusCommand(message);
    this.setupListCommand(message);
  }

  private setupSendCommand(message: Command): void {
    message
      .command("send")
      .description(
        "Send a message to another agent (uncompressed, deprecated; use 'pod zk message broadcast' for cost savings)",
      )
      .option("-r, --recipient <address>", "Recipient agent address")
      .option("-p, --payload <text>", "Message payload/content")
      .option(
        "-t, --type <type>",
        "Message type (text, data, command, response, custom)",
        "text",
      )
      .option(
        "-c, --custom-value <number>",
        "Custom value for custom message types",
      )
      .option("-i, --interactive", "Interactive message creation")
      .action(
        createCommandHandler(
          "send message",
          async (client, wallet, globalOpts, options: SendMessageOptions) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new MessageHandlers(context);
            await handlers.handleSend(options);
          },
        ),
      );
  }

  private setupInfoCommand(message: Command): void {
    message
      .command("info <messageId>")
      .description("Show message information")
      .action(
        createCommandHandler(
          "fetch message info",
          async (client, wallet, globalOpts, messageId: string) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new MessageHandlers(context);
            await handlers.handleInfo(messageId);
          },
        ),
      );
  }

  private setupStatusCommand(message: Command): void {
    message
      .command("status")
      .description("Update message status")
      .option("-m, --message <messageId>", "Message ID")
      .option(
        "-s, --status <status>",
        "New status (pending, delivered, read, failed)",
      )
      .action(
        createCommandHandler(
          "update message status",
          async (client, wallet, globalOpts, options: MessageStatusOptions) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new MessageHandlers(context);
            await handlers.handleStatus(options);
          },
        ),
      );
  }

  private setupListCommand(message: Command): void {
    message
      .command("list")
      .description("List messages for an agent")
      .option(
        "-a, --agent [address]",
        "Agent address (defaults to current wallet)",
      )
      .option(
        "-l, --limit <number>",
        "Maximum number of messages to show",
        "10",
      )
      .option(
        "-f, --filter <status>",
        "Filter by status (pending, delivered, read, failed)",
      )
      .action(
        createCommandHandler(
          "list messages",
          async (client, wallet, globalOpts, options: MessageListOptions) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new MessageHandlers(context);
            await handlers.handleList(options);
          },
        ),
      );
  }
}
