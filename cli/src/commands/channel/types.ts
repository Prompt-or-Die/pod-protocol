import { PodComClient, ChannelVisibility } from "@pod-protocol/sdk";
import { GlobalOptions } from "../../utils/shared";

export interface CommandContext {
  client: PodComClient;
  wallet: any;
  globalOpts: GlobalOptions;
}

export interface ChannelData {
  name: string;
  description: string;
  visibility: ChannelVisibility;
  maxMembers: number;
  maxParticipants: number; // Legacy alias for compatibility
  feePerMessage: number;
}

export interface BroadcastOptions {
  type: string;
  replyTo?: string;
}

export interface ListOptions {
  limit: string;
  owner?: boolean;
  visibility?: string;
}

export interface ParticipantsOptions {
  limit: string;
}

export interface MessagesOptions {
  limit: string;
}
