import { Address, address } from '@solana/web3.js';
import anchor from "@coral-xyz/anchor";
import { BaseService } from "./base";
import { ChannelVisibility, } from "../types";
import { findAgentPDA, findChannelPDA } from "../utils";
/**
 * Channel service for managing group communication
 */
export class ChannelService extends BaseService {
    /**
     * Create a new channel
     */
    async createChannel(wallet, options) {
        const program = this.ensureInitialized();
        // Derive agent PDA
        const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Derive channel PDA
        const [channelPDA] = findChannelPDA(wallet.publicKey, options.name, this.programId);
        // Derive participant PDA for creator
        const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);
        const visibilityObj = this.convertChannelVisibility(options.visibility);
        const tx = await program.methods
            .createChannel(options.name, options.description, visibilityObj, options.maxParticipants, new anchor.BN(options.feePerMessage))
            .accounts({
            agentAccount: agentPDA,
            channelAccount: channelPDA,
            participantAccount: participantPDA,
            creator: wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .signers([wallet])
            .rpc({ commitment: this.commitment });
        return tx;
    }
    /**
     * Get channel data
     */
    async getChannel(channelPDA) {
        try {
            const channelAccount = this.getAccount("channelAccount");
            const account = await channelAccount.fetch(channelPDA);
            return this.convertChannelAccountFromProgram(account, channelPDA);
        }
        catch (error) {
            console.warn(`Channel not found: ${channelPDA}`, error);
            return null;
        }
    }
    /**
     * Get all channels with optional filtering
     */
    async getAllChannels(limit = 50, visibilityFilter) {
        try {
            const channelAccount = this.getAccount("channelAccount");
            const filters = [];
            if (visibilityFilter) {
                const visibilityObj = this.convertChannelVisibility(visibilityFilter);
                filters.push({
                    memcmp: {
                        offset: 8 + 32 + 4 + 50 + 4 + 200, // After name and description
                        bytes: anchor.utils.bytes.bs58.encode(Buffer.from([
                            visibilityFilter === ChannelVisibility.Public ? 0 : 1,
                        ])),
                    },
                });
            }
            const accounts = await channelAccount.all(filters);
            return accounts
                .slice(0, limit)
                .map((acc) => this.convertChannelAccountFromProgram(acc.account, acc.publicKey));
        }
        catch (error) {
            console.warn("Error fetching channels:", error);
            return [];
        }
    }
    /**
     * Get channels created by a specific user
     */
    async getChannelsByCreator(creator, limit = 50) {
        try {
            const channelAccount = this.getAccount("channelAccount");
            const filters = [
                {
                    memcmp: {
                        offset: 8, // After discriminator
                        bytes: creator,
                    },
                },
            ];
            const accounts = await channelAccount.all(filters);
            return accounts
                .slice(0, limit)
                .map((acc) => this.convertChannelAccountFromProgram(acc.account, acc.publicKey));
        }
        catch (error) {
            console.warn("Error fetching channels by creator:", error);
            return [];
        }
    }
    /**
     * Join a channel
     */
    async joinChannel(wallet, channelPDA) {
        const program = this.ensureInitialized();
        // Derive agent PDA
        const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Derive participant PDA
        const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);
        // Check if channel requires invitation (for private channels)
        const [invitationPDA] = Address.findProgramAddressSync([
            Buffer.from("invitation"),
            channelPDA.toBuffer(),
            wallet.publicKey.toBuffer(),
        ], this.programId);
        // Check if invitation exists for private channels
        let invitationAccount = null;
        try {
            const invitationAccountType = this.getAccount("channelInvitation");
            invitationAccount = await invitationAccountType.fetch(invitationPDA);
        }
        catch (error) {
            // Invitation doesn't exist, which is fine for public channels
        }
        const tx = await program.methods
            .joinChannel()
            .accounts({
            channelAccount: channelPDA,
            participantAccount: participantPDA,
            agentAccount: agentPDA,
            invitationAccount: invitationAccount ? invitationPDA : null,
            user: wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .signers([wallet])
            .rpc({ commitment: this.commitment });
        return tx;
    }
    /**
     * Leave a channel
     */
    async leaveChannel(wallet, channelPDA) {
        const program = this.ensureInitialized();
        // Derive agent PDA
        const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Derive participant PDA
        const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);
        const tx = await program.methods
            .leaveChannel()
            .accounts({
            channelAccount: channelPDA,
            participantAccount: participantPDA,
            agentAccount: agentPDA,
            user: wallet.publicKey,
        })
            .signers([wallet])
            .rpc({ commitment: this.commitment });
        return tx;
    }
    /**
     * Broadcast a message to a channel
     */
    async broadcastMessage(wallet, options) {
        const program = this.ensureInitialized();
        // Generate unique nonce for message
        const nonce = Date.now();
        // Derive agent PDA
        const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Derive participant PDA
        const [participantPDA] = this.findParticipantPDA(options.channelPDA, agentPDA);
        // Derive message PDA
        const nonceBuffer = Buffer.alloc(8);
        nonceBuffer.writeBigUInt64LE(BigInt(nonce), 0);
        const [messagePDA] = Address.findProgramAddressSync([
            Buffer.from("channel_message"),
            options.channelPDA.toBuffer(),
            wallet.publicKey.toBuffer(),
            nonceBuffer,
        ], this.programId);
        const messageTypeObj = this.convertMessageType(options.messageType || "Text");
        const tx = await program.methods
            .broadcastMessage(options.content, messageTypeObj, options.replyTo || null, new anchor.BN(nonce))
            .accounts({
            channelAccount: options.channelPDA,
            participantAccount: participantPDA,
            agentAccount: agentPDA,
            messageAccount: messagePDA,
            user: wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .signers([wallet])
            .rpc({ commitment: this.commitment });
        return tx;
    }
    /**
     * Invite a user to a channel
     */
    async inviteToChannel(wallet, channelPDA, invitee) {
        const program = this.ensureInitialized();
        // Derive agent PDA
        const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Derive participant PDA (for inviter)
        const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);
        // Derive invitation PDA
        const [invitationPDA] = Address.findProgramAddressSync([Buffer.from("invitation"), channelPDA.toBuffer(), invitee.toBuffer()], this.programId);
        const tx = await program.methods
            .inviteToChannel(invitee)
            .accounts({
            channelAccount: channelPDA,
            participantAccount: participantPDA,
            agentAccount: agentPDA,
            invitationAccount: invitationPDA,
            inviter: wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .signers([wallet])
            .rpc({ commitment: this.commitment });
        return tx;
    }
    /**
     * Get channel participants
     */
    async getChannelParticipants(channelPDA, limit = 50) {
        try {
            const participantAccount = this.getAccount("channelParticipant");
            const filters = [
                {
                    memcmp: {
                        offset: 8, // After discriminator
                        bytes: channelPDA,
                    },
                },
            ];
            const accounts = await participantAccount.all(filters);
            return accounts.slice(0, limit).map((acc) => acc.account);
        }
        catch (error) {
            console.warn("Error fetching channel participants:", error);
            return [];
        }
    }
    /**
     * Get channel messages
     */
    async getChannelMessages(channelPDA, limit = 50) {
        try {
            const messageAccount = this.getAccount("channelMessage");
            const filters = [
                {
                    memcmp: {
                        offset: 8, // After discriminator
                        bytes: channelPDA,
                    },
                },
            ];
            const accounts = await messageAccount.all(filters);
            return accounts.slice(0, limit).map((acc) => acc.account);
        }
        catch (error) {
            console.warn("Error fetching channel messages:", error);
            return [];
        }
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    convertChannelVisibility(visibility) {
        switch (visibility) {
            case ChannelVisibility.Public:
                return { public: {} };
            case ChannelVisibility.Private:
                return { private: {} };
            default:
                return { public: {} };
        }
    }
    convertChannelVisibilityFromProgram(programVisibility) {
        if (programVisibility.public !== undefined)
            return ChannelVisibility.Public;
        if (programVisibility.private !== undefined)
            return ChannelVisibility.Private;
        return ChannelVisibility.Public;
    }
    convertMessageType(messageType) {
        if (typeof messageType === "string") {
            switch (messageType.toLowerCase()) {
                case "text":
                    return { text: {} };
                case "data":
                    return { data: {} };
                case "command":
                    return { command: {} };
                case "response":
                    return { response: {} };
                default:
                    return { text: {} };
            }
        }
        return messageType || { text: {} };
    }
    convertChannelAccountFromProgram(account, publicKey) {
        return {
            pubkey: publicKey,
            creator: account.creator,
            name: account.name,
            description: account.description,
            visibility: this.convertChannelVisibilityFromProgram(account.visibility),
            maxParticipants: account.maxParticipants,
            participantCount: account.currentParticipants,
            currentParticipants: account.currentParticipants,
            feePerMessage: account.feePerMessage?.toNumber() || 0,
            escrowBalance: account.escrowBalance?.toNumber() || 0,
            createdAt: account.createdAt?.toNumber() || Date.now(),
            isActive: true,
            bump: account.bump,
        };
    }
    findParticipantPDA(channelPDA, agentPDA) {
        return Address.findProgramAddressSync([Buffer.from("participant"), channelPDA.toBuffer(), agentPDA.toBuffer()], this.programId);
    }
}
//# sourceMappingURL=channel.js.map