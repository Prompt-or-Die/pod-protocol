import { Command } from "commander";
import { createCommandHandler } from "../../utils/shared.js";
import { ChannelHandlers } from "./handlers.js";
import {
  CommandContext,
  BroadcastOptions,
  ListOptions,
  ParticipantsOptions,
  MessagesOptions,
} from "./types.js";

export class ChannelCommands {
  register(program: Command): void {
    const channel = program
      .command("channel")
      .description("Manage communication channels");

    this.setupCreateCommand(channel);
    this.setupInfoCommand(channel);
    this.setupListCommand(channel);
    this.setupJoinCommand(channel);
    this.setupLeaveCommand(channel);
    this.setupBroadcastCommand(channel);
    this.setupInviteCommand(channel);
    this.setupParticipantsCommand(channel);
    this.setupMessagesCommand(channel);
  }

  private setupCreateCommand(channel: Command): void {
    channel
      .command("create")
      .description("Create a new communication channel")
      .option("-n, --name <name>", "Channel name")
      .option("-d, --description <description>", "Channel description")
      .option(
        "-v, --visibility <visibility>",
        "Channel visibility (public, private)",
        "public",
      )
      .option("-m, --max-participants <number>", "Maximum participants", "100")
      .option("-f, --fee <lamports>", "Fee per message in lamports", "1000")
      .option("-i, --interactive", "Interactive mode")
      .action(
        createCommandHandler(
          "create channel",
          async (client, wallet, globalOpts, options) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleCreate(options);
          },
        ),
      );
  }

  private setupInfoCommand(channel: Command): void {
    channel
      .command("info <channelId>")
      .description("Show channel information")
      .action(
        createCommandHandler(
          "fetch channel info",
          async (client, wallet, globalOpts, channelId) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleInfo(channelId);
          },
        ),
      );
  }

  private setupListCommand(channel: Command): void {
    channel
      .command("list")
      .description("List channels")
      .option(
        "-l, --limit <number>",
        "Maximum number of channels to show",
        "10",
      )
      .option("-o, --owner", "Show only channels owned by you")
      .option(
        "-v, --visibility <visibility>",
        "Filter by visibility (public, private)",
      )
      .action(
        createCommandHandler(
          "list channels",
          async (client, wallet, globalOpts, options) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleList(options as ListOptions);
          },
        ),
      );
  }

  private setupJoinCommand(channel: Command): void {
    channel
      .command("join <channelId>")
      .description("Join a communication channel")
      .action(
        createCommandHandler(
          "join channel",
          async (client, wallet, globalOpts, channelId) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleJoin(channelId);
          },
        ),
      );
  }

  private setupLeaveCommand(channel: Command): void {
    channel
      .command("leave <channelId>")
      .description("Leave a communication channel")
      .action(
        createCommandHandler(
          "leave channel",
          async (client, wallet, globalOpts, channelId) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleLeave(channelId);
          },
        ),
      );
  }

  private setupBroadcastCommand(channel: Command): void {
    channel
      .command("broadcast <channelId> <message>")
      .description("Broadcast a message to a channel")
      .option(
        "-t, --type <type>",
        "Message type (text, data, command, response)",
        "text",
      )
      .option("-r, --reply-to <messageId>", "Reply to message ID")
      .action(
        createCommandHandler(
          "broadcast message",
          async (client, wallet, globalOpts, channelId, message, options) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleBroadcast(
              channelId,
              message,
              options as BroadcastOptions,
            );
          },
        ),
      );
  }

  private setupInviteCommand(channel: Command): void {
    channel
      .command("invite <channelId> <invitee>")
      .description("Invite a user to a private channel")
      .action(
        createCommandHandler(
          "send invitation",
          async (client, wallet, globalOpts, channelId, invitee) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleInvite(channelId, invitee);
          },
        ),
      );
  }

  private setupParticipantsCommand(channel: Command): void {
    channel
      .command("participants <channelId>")
      .description("Show channel participants")
      .option(
        "-l, --limit <number>",
        "Maximum number of participants to show",
        "20",
      )
      .action(
        createCommandHandler(
          "fetch participants",
          async (client, wallet, globalOpts, channelId, options) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleParticipants(
              channelId,
              options as ParticipantsOptions,
            );
          },
        ),
      );
  }

  private setupMessagesCommand(channel: Command): void {
    channel
      .command("messages <channelId>")
      .description("Show channel messages")
      .option(
        "-l, --limit <number>",
        "Maximum number of messages to show",
        "20",
      )
      .action(
        createCommandHandler(
          "fetch messages",
          async (client, wallet, globalOpts, channelId, options) => {
            const context: CommandContext = { client, wallet, globalOpts };
            const handlers = new ChannelHandlers(context);
            await handlers.handleMessages(
              channelId,
              options as MessagesOptions,
            );
          },
        ),
      );
  }
}
