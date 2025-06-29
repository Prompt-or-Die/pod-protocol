import { Address } from '@solana/addresses';
import { KeyPairSigner } from '@solana/signers';
import { BaseService } from "./base";
import { CreateChannelOptions, ChannelAccount, ChannelVisibility, BroadcastMessageOptions } from "../types";
/**
 * Channel service for managing group communication
 */
export declare class ChannelService extends BaseService {
    /**
     * Create a new channel
     */
    createChannel(wallet: KeyPairSigner, options: CreateChannelOptions): Promise<string>;
    /**
     * Get channel data
     */
    getChannel(channelPDA: Address): Promise<ChannelAccount | null>;
    /**
     * Get all channels with optional filtering
     */
    getAllChannels(limit?: number, visibilityFilter?: ChannelVisibility): Promise<ChannelAccount[]>;
    /**
     * Get channels created by a specific user
     */
    getChannelsByCreator(creator: Address, limit?: number): Promise<ChannelAccount[]>;
    /**
     * Join a channel
     */
    joinChannel(wallet: KeyPairSigner, channelPDA: Address): Promise<string>;
    /**
     * Leave a channel
     */
    leaveChannel(wallet: KeyPairSigner, channelPDA: Address): Promise<string>;
    /**
     * Broadcast a message to a channel
     */
    broadcastMessage(wallet: KeyPairSigner, options: BroadcastMessageOptions): Promise<string>;
    /**
     * Invite a user to a channel
     */
    inviteToChannel(wallet: KeyPairSigner, channelPDA: Address, invitee: Address): Promise<string>;
    /**
     * Get channel participants
     */
    getChannelParticipants(channelPDA: Address, limit?: number): Promise<Array<any>>;
    /**
     * Get channel messages
     */
    getChannelMessages(channelPDA: Address, limit?: number): Promise<Array<any>>;
    private convertChannelVisibility;
    private convertChannelVisibilityFromProgram;
    private convertMessageType;
    private convertChannelAccountFromProgram;
    private findParticipantPDA;
}
//# sourceMappingURL=channel.d.ts.map