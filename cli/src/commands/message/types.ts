import { PodComClient, MessageType, MessageStatus } from "@pod-protocol/sdk";
import type { KeyPairSigner } from "@solana/web3.js";
import { GlobalOptions } from "../../utils/shared.js";

export interface CommandContext {
  client: PodComClient;
  wallet: KeyPairSigner;
  globalOpts: GlobalOptions;
}

export interface SendMessageOptions {
  recipient?: string;
  payload?: string;
  type?: MessageType;
  customValue?: string;
  interactive?: boolean;
}

export interface MessageInfoOptions {
  messageId: string;
}

export interface MessageStatusOptions {
  message?: string;
  status?: string;
}

export interface MessageListOptions {
  agent?: string;
  limit?: string;
  filter?: MessageStatus;
}

export interface CompressMessageOptions {
  channel?: string;
  content?: string;
  type?: MessageType;
  attachments?: string[];
  metadata?: Record<string, any>;
  replyTo?: string;
}

export interface GetMessagesOptions {
  channel?: string;
  limit?: number;
  offset?: number;
  sender?: string;
  after?: Date;
  before?: Date;
}
