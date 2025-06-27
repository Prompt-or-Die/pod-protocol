import { address as createAddress } from "@solana/addresses";
// Local constants to avoid import issues during Web3.js v2 migration
enum ChannelVisibility {
  Public = 0,
  Private = 1,
  Restricted = 2,
}
import { createSpinner } from "../../utils/shared.js";
import { BaseChannelHandler } from "./base-handler.js";
import { ChannelDataHandler } from "./data-handler.js";
import { ChannelValidators } from "./validators.js";
import { ChannelDisplayer } from "./displayer.js";
import {
  BroadcastOptions,
  ListOptions,
  ParticipantsOptions,
  MessagesOptions,
  CommandContext,
} from "./types.js";

export class ChannelHandlers extends BaseChannelHandler {
  private displayer: ChannelDisplayer;

  constructor(context: CommandContext) {
    super(context);
    this.displayer = new ChannelDisplayer();
  }

  async handleCreate(options: any): Promise<void> {
    try {
      const channelData = await ChannelDataHandler.prepareChannelData(options);
      const spinner = createSpinner("Creating channel...");

      const result = await this.executeWithSpinner(
        "Creating channel...",
        () =>
          this.context.client.createChannel(this.context.wallet, {
            name: channelData.name,
            description: channelData.description,
            visibility: channelData.visibility,
            maxMembers: channelData.maxMembers,
            feePerMessage: channelData.feePerMessage,
          }),
        {
          Name: channelData.name,
          Description: channelData.description,
          Visibility: ChannelVisibility[channelData.visibility],
          "Max Members": channelData.maxMembers.toString(),
          "Fee per Message": `${channelData.feePerMessage} lamports`,
        },
      );

      if (result !== undefined) {
        this.showSuccessWithTransaction(
          spinner,
          "Channel created successfully!",
          String(result),
          {
            Name: channelData.name,
            Description: channelData.description,
            Visibility: ChannelVisibility[channelData.visibility],
          },
        );
      }
    } catch (error: any) {
      this.handleError("create channel", error);
    }
  }

  async handleInfo(channelId: string): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);
      const spinner = createSpinner("Fetching channel information...");

      const channelData = await this.context.client.getChannel(channelPubkey);

      if (!channelData) {
        spinner.fail("Channel not found");
        return;
      }

      spinner.succeed("Channel information retrieved");
      this.displayer.displayChannelInfo(channelData);
    } catch (error: any) {
      this.handleError("fetch channel info", error);
    }
  }

  async handleList(options: ListOptions): Promise<void> {
    try {
      const spinner = createSpinner("Fetching channels...");
      const limit = parseInt(options.limit, 10) || 10;

      let channels;
      if (options.owner) {
        channels = await this.context.client.getChannelsByCreator(
          this.context.wallet.publicKey,
          limit,
        );
      } else {
        const visibilityFilter = options.visibility
          ? (ChannelVisibility[options.visibility as keyof typeof ChannelVisibility] ?? 
             parseInt(options.visibility) as ChannelVisibility)
          : undefined;
        
        // Get all channels and apply client-side filtering
        const allChannels = await this.context.client.getAllChannels(limit * 2); // Get more to account for filtering
        
        // Apply visibility filter if specified
        channels = visibilityFilter !== undefined 
          ? allChannels.filter(channel => channel.visibility === visibilityFilter).slice(0, limit)
          : allChannels.slice(0, limit);
      }

      if (channels.length === 0) {
        spinner.succeed("No channels found");
        return;
      }

      spinner.succeed(`Found ${channels.length} channel(s)`);
      this.displayer.displayChannelsList(channels);
    } catch (error: any) {
      this.handleError("list channels", error);
    }
  }

  async handleJoin(channelId: string): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);

      const result = await this.executeWithSpinner(
        "Joining channel...",
        () =>
          this.context.client.joinChannel(this.context.wallet, channelPubkey),
        { Channel: channelId },
      );

      if (result !== undefined) {
        const spinner = createSpinner("");
        this.showSuccessWithTransaction(
          spinner,
          "Successfully joined channel!",
          String(result),
        );
      }
    } catch (error: any) {
      this.handleError("join channel", error);
    }
  }

  async handleLeave(channelId: string): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);

      const result = await this.executeWithSpinner(
        "Leaving channel...",
        () =>
          this.context.client.leaveChannel(this.context.wallet, channelPubkey),
        { Channel: channelId },
      );

      if (result !== undefined) {
        const spinner = createSpinner("");
        this.showSuccessWithTransaction(
          spinner,
          "Successfully left channel!",
          String(result),
        );
      }
    } catch (error: any) {
      this.handleError("leave channel", error);
    }
  }

  async handleBroadcast(
    channelId: string,
    message: string,
    options: BroadcastOptions,
  ): Promise<void> {
    try {
      ChannelValidators.validateMessage(message);
      const channelPubkey = createAddress(channelId);
      const messageType = ChannelValidators.parseMessageType(options.type);
      const replyTo = options.replyTo
        ? createAddress(options.replyTo)
        : undefined;

      const dryRunData: Record<string, string> = {
        Channel: channelId,
        Message: message,
        Type: messageType,
      };
      if (replyTo) {
        dryRunData["Reply to"] = String(replyTo);
      }

      const result = await this.executeWithSpinner(
        "Broadcasting message...",
        () =>
          this.context.client.broadcastMessage(
            this.context.wallet,
            channelPubkey,
            message,
            messageType,
            replyTo,
          ),
        dryRunData,
      );

      if (result !== undefined) {
        const spinner = createSpinner("");
        this.showSuccessWithTransaction(
          spinner,
          "Message broadcast successfully!",
          String(result),
        );
      }
    } catch (error: any) {
      this.handleError("broadcast message", error);
    }
  }

  async handleInvite(channelId: string, invitee: string): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);
      const inviteePubkey = createAddress(invitee);

      const result = await this.executeWithSpinner(
        "Sending invitation...",
        () =>
          this.context.client.inviteToChannel(
            this.context.wallet,
            channelPubkey,
            inviteePubkey,
          ),
        {
          Channel: channelId,
          Invitee: invitee,
        },
      );

      if (result !== undefined) {
        const spinner = createSpinner("");
        this.showSuccessWithTransaction(
          spinner,
          "Invitation sent successfully!",
          String(result),
        );
      }
    } catch (error: any) {
      this.handleError("send invitation", error);
    }
  }

  async handleParticipants(
    channelId: string,
    options: ParticipantsOptions,
  ): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);
      const limit = parseInt(options.limit, 10) || 20;
      const spinner = createSpinner("Fetching participants...");

      const participants = await this.context.client.getChannelParticipants(
        channelPubkey,
        limit,
      );

      if (participants.length === 0) {
        spinner.succeed("No participants found");
        return;
      }

      spinner.succeed(`Found ${participants.length} participant(s)`);
      this.displayer.displayParticipantsList(participants);
    } catch (error: any) {
      this.handleError("fetch participants", error);
    }
  }

  async handleMessages(
    channelId: string,
    options: MessagesOptions,
  ): Promise<void> {
    try {
      const channelPubkey = createAddress(channelId);
      const limit = parseInt(options.limit, 10) || 20;
      const spinner = createSpinner("Fetching messages...");

      const messages = await this.context.client.getChannelMessages(
        channelPubkey,
        limit,
      );

      if (messages.length === 0) {
        spinner.succeed("No messages found");
        return;
      }

      spinner.succeed(`Found ${messages.length} message(s)`);
      this.displayer.displayMessagesList(messages);
    } catch (error: any) {
      this.handleError("fetch messages", error);
    }
  }
}
