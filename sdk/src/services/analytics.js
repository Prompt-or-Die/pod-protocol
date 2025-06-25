import { Address, address } from '@solana/web3.js';
import { BaseService } from "./base";
import { MessageStatus, ChannelVisibility, } from "../types";
import { lamportsToSol, formatBytes, getCapabilityNames, } from "../utils";
export class AnalyticsService extends BaseService {
    /**
     * Get comprehensive analytics dashboard
     */
    async getDashboard() {
        const [agents, messages, channels, network] = await Promise.all([
            this.getAgentAnalytics(),
            this.getMessageAnalytics(),
            this.getChannelAnalytics(),
            this.getNetworkAnalytics(),
        ]);
        return {
            agents,
            messages,
            channels,
            network,
            generatedAt: Date.now(),
        };
    }
    /**
     * Get agent ecosystem analytics
     */
    async getAgentAnalytics(limit = 100) {
        try {
            const agents = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: this.getDiscriminator("agentAccount"),
                        },
                    },
                ],
                commitment: this.commitment,
            });
            const agentData = agents.map((acc) => {
                const account = this.ensureInitialized().coder.accounts.decode("agentAccount", acc.account.data);
                return {
                    pubkey: acc.pubkey,
                    capabilities: account.capabilities.toNumber(),
                    metadataUri: account.metadataUri,
                    reputation: account.reputation?.toNumber() || 0,
                    lastUpdated: account.lastUpdated?.toNumber() || Date.now(),
                    bump: account.bump,
                };
            });
            // Calculate capability distribution
            const capabilityDistribution = {};
            agentData.forEach((agent) => {
                const capabilities = getCapabilityNames(agent.capabilities);
                capabilities.forEach((cap) => {
                    capabilityDistribution[cap] = (capabilityDistribution[cap] || 0) + 1;
                });
            });
            // Calculate average reputation
            const averageReputation = agentData.length > 0
                ? agentData.reduce((sum, agent) => sum + agent.reputation, 0) /
                    agentData.length
                : 0;
            // Get top agents by reputation
            const topAgentsByReputation = agentData
                .sort((a, b) => b.reputation - a.reputation)
                .slice(0, 10);
            // Get recently active agents (last 24 hours)
            const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentlyActive = agentData
                .filter((agent) => agent.lastUpdated * 1000 > twentyFourHoursAgo)
                .sort((a, b) => b.lastUpdated - a.lastUpdated)
                .slice(0, 20);
            return {
                totalAgents: agentData.length,
                capabilityDistribution,
                averageReputation,
                topAgentsByReputation,
                recentlyActive,
            };
        }
        catch (error) {
            throw new Error(`Failed to get agent analytics: ${error.message}`);
        }
    }
    /**
     * Get message analytics and patterns
     */
    async getMessageAnalytics(limit = 1000) {
        try {
            const messages = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: this.getDiscriminator("messageAccount"),
                        },
                    },
                ],
                commitment: this.commitment,
            });
            const messageData = messages
                .slice(0, limit)
                .map((acc) => {
                const account = this.ensureInitialized().coder.accounts.decode("messageAccount", acc.account.data);
                return {
                    pubkey: acc.pubkey,
                    sender: account.sender,
                    recipient: account.recipient,
                    payload: account.payload || "",
                    payloadHash: account.payloadHash,
                    messageType: this.convertMessageTypeFromProgram(account.messageType),
                    status: this.convertMessageStatusFromProgram(account.status),
                    timestamp: account.timestamp?.toNumber() || Date.now(),
                    createdAt: account.createdAt?.toNumber() || Date.now(),
                    expiresAt: account.expiresAt?.toNumber() || 0,
                    bump: account.bump,
                };
            });
            // Group messages by status
            const messagesByStatus = {
                [MessageStatus.Pending]: 0,
                [MessageStatus.Delivered]: 0,
                [MessageStatus.Read]: 0,
                [MessageStatus.Failed]: 0,
            };
            messageData.forEach((msg) => {
                messagesByStatus[msg.status]++;
            });
            // Group messages by type
            const messagesByType = {};
            messageData.forEach((msg) => {
                const type = msg.messageType;
                messagesByType[type] = (messagesByType[type] || 0) + 1;
            });
            // Calculate average message size
            const averageMessageSize = messageData.length > 0
                ? messageData.reduce((sum, msg) => sum + msg.payload.length, 0) /
                    messageData.length
                : 0;
            // Calculate messages per day (last 7 days)
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recentMessages = messageData.filter((msg) => msg.timestamp * 1000 > sevenDaysAgo);
            const messagesPerDay = recentMessages.length / 7;
            // Get top senders
            const senderCounts = {};
            messageData.forEach((msg) => {
                const sender = msg.sender;
                senderCounts[sender] = (senderCounts[sender] || 0) + 1;
            });
            const topSenders = Object.entries(senderCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([agent, messageCount]) => ({
                agent: new Address(agent),
                messageCount,
            }));
            return {
                totalMessages: messageData.length,
                messagesByStatus,
                messagesByType,
                averageMessageSize,
                messagesPerDay,
                topSenders,
                recentMessages: messageData.slice(0, 20),
            };
        }
        catch (error) {
            throw new Error(`Failed to get message analytics: ${error.message}`);
        }
    }
    /**
     * Get channel usage analytics
     */
    async getChannelAnalytics(limit = 100) {
        try {
            const channels = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: this.getDiscriminator("channelAccount"),
                        },
                    },
                ],
                commitment: this.commitment,
            });
            const channelData = channels
                .slice(0, limit)
                .map((acc) => {
                const account = this.ensureInitialized().coder.accounts.decode("channelAccount", acc.account.data);
                return {
                    pubkey: acc.pubkey,
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
            });
            // Group channels by visibility
            const channelsByVisibility = {
                [ChannelVisibility.Public]: 0,
                [ChannelVisibility.Private]: 0,
            };
            channelData.forEach((channel) => {
                channelsByVisibility[channel.visibility]++;
            });
            // Calculate average participants
            const averageParticipants = channelData.length > 0
                ? channelData.reduce((sum, channel) => sum + channel.participantCount, 0) / channelData.length
                : 0;
            // Get most popular channels by participant count
            const mostPopularChannels = channelData
                .sort((a, b) => b.participantCount - a.participantCount)
                .slice(0, 10);
            // Calculate total escrow value
            const totalEscrowValue = channelData.reduce((sum, channel) => sum + channel.escrowBalance, 0);
            // Calculate average channel fee
            const averageChannelFee = channelData.length > 0
                ? channelData.reduce((sum, channel) => sum + channel.feePerMessage, 0) / channelData.length
                : 0;
            return {
                totalChannels: channelData.length,
                channelsByVisibility,
                averageParticipants,
                mostPopularChannels,
                totalEscrowValue,
                averageChannelFee,
            };
        }
        catch (error) {
            throw new Error(`Failed to get channel analytics: ${error.message}`);
        }
    }
    /**
     * Get network-wide analytics
     */
    async getNetworkAnalytics() {
        try {
            // Get recent block performance for network health
            const recentSlots = await this.connection.getRecentPerformanceSamples(10);
            const averageTps = recentSlots.length > 0
                ? recentSlots.reduce((sum, slot) => sum + slot.numTransactions, 0) /
                    recentSlots.reduce((sum, slot) => sum + slot.samplePeriodSecs, 0)
                : 0;
            // Determine network health based on TPS
            let networkHealth = "healthy";
            if (averageTps < 1000) {
                networkHealth = "congested";
            }
            else if (averageTps < 2000) {
                networkHealth = "moderate";
            }
            // Get total value locked (from escrow accounts)
            const escrows = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: this.getDiscriminator("escrowAccount"),
                        },
                    },
                ],
                commitment: this.commitment,
            });
            const totalValueLocked = escrows.reduce((sum, acc) => {
                try {
                    const account = this.ensureInitialized().coder.accounts.decode("escrowAccount", acc.account.data);
                    return sum + (account.balance?.toNumber() || 0);
                }
                catch {
                    return sum;
                }
            }, 0);
            // Historical metrics: query Photon indexer for last 24h
            const since = Date.now() - 24 * 60 * 60 * 1000;
            const rpcReq = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'getCompressedMessagesByTimeRange',
                params: [since, Date.now()],
            };
            const rpcResp = await fetch(this.config.photonIndexerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rpcReq),
            });
            if (!rpcResp.ok) {
                throw new Error(`Indexer RPC failed: ${rpcResp.statusText}`);
            }
            const rpcJson = await rpcResp.json();
            if (rpcJson.error) {
                throw new Error(`Indexer RPC error: ${rpcJson.error?.message || 'Unknown error'}`);
            }
            const msgs24h = rpcJson.result || [];
            const messageVolume24h = msgs24h.length;
            const activeAgents24h = Array.from(new Set(msgs24h.map(m => m.sender))).length;
            // Compute hours with activity in the last 24h
            const counts = Array(24).fill(0);
            msgs24h.forEach(m => {
                const hour = new Date(m.createdAt).getUTCHours();
                counts[hour] = (counts[hour] || 0) + 1;
            });
            const peakUsageHours = counts
                .map((count, hour) => (count > 0 ? hour : -1))
                .filter(hour => hour >= 0);
            return {
                totalTransactions: recentSlots.reduce((sum, slot) => sum + slot.numTransactions, 0),
                totalValueLocked,
                activeAgents24h,
                messageVolume24h,
                networkHealth,
                peakUsageHours,
            };
        }
        catch (error) {
            throw new Error(`Failed to get network analytics: ${error.message}`);
        }
    }
    /**
     * Generate analytics report
     */
    async generateReport() {
        const dashboard = await this.getDashboard();
        let report = "# PoD Protocol Analytics Report\n\n";
        report += `Generated: ${new Date(dashboard.generatedAt).toISOString()}\n\n`;
        // Agent Analytics
        report += "## Agent Analytics\n";
        report += `- Total Agents: ${dashboard.agents.totalAgents}\n`;
        report += `- Average Reputation: ${dashboard.agents.averageReputation.toFixed(2)}\n`;
        report += `- Recently Active (24h): ${dashboard.agents.recentlyActive.length}\n`;
        report += "\n### Capability Distribution\n";
        Object.entries(dashboard.agents.capabilityDistribution).forEach(([cap, count]) => {
            report += `- ${cap}: ${count} agents\n`;
        });
        // Message Analytics
        report += "\n## Message Analytics\n";
        report += `- Total Messages: ${dashboard.messages.totalMessages}\n`;
        report += `- Average Message Size: ${formatBytes(dashboard.messages.averageMessageSize)}\n`;
        report += `- Messages per Day: ${dashboard.messages.messagesPerDay.toFixed(1)}\n`;
        report += "\n### Message Status Distribution\n";
        Object.entries(dashboard.messages.messagesByStatus).forEach(([status, count]) => {
            report += `- ${status}: ${count} messages\n`;
        });
        // Channel Analytics
        report += "\n## Channel Analytics\n";
        report += `- Total Channels: ${dashboard.channels.totalChannels}\n`;
        report += `- Average Participants: ${dashboard.channels.averageParticipants.toFixed(1)}\n`;
        report += `- Total Value Locked: ${lamportsToSol(dashboard.channels.totalEscrowValue).toFixed(4)} SOL\n`;
        report += `- Average Channel Fee: ${lamportsToSol(dashboard.channels.averageChannelFee).toFixed(6)} SOL\n`;
        // Network Analytics
        report += "\n## Network Analytics\n";
        report += `- Network Health: ${dashboard.network.networkHealth.toUpperCase()}\n`;
        report += `- Total Value Locked: ${lamportsToSol(dashboard.network.totalValueLocked).toFixed(4)} SOL\n`;
        report += `- Peak Usage Hours (UTC): ${dashboard.network.peakUsageHours.join(", ")}\n`;
        return report;
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    getDiscriminator(accountType) {
        // Dynamically generate discriminator from IDL via Anchor's coder
        const program = this.ensureInitialized();
        const discBuf = program.coder.accounts.accountDiscriminator?.(accountType) || Buffer.alloc(8);
        return Buffer.from(discBuf).toString('hex');
    }
    convertMessageTypeFromProgram(programType) {
        if (programType.text !== undefined)
            return "Text";
        if (programType.data !== undefined)
            return "Data";
        if (programType.command !== undefined)
            return "Command";
        if (programType.response !== undefined)
            return "Response";
        if (programType.custom !== undefined)
            return `Custom(${programType.custom})`;
        return "Unknown";
    }
    convertMessageStatusFromProgram(programStatus) {
        if (programStatus.pending)
            return MessageStatus.Pending;
        if (programStatus.delivered)
            return MessageStatus.Delivered;
        if (programStatus.read)
            return MessageStatus.Read;
        if (programStatus.failed)
            return MessageStatus.Failed;
        return MessageStatus.Pending;
    }
    convertChannelVisibilityFromProgram(programVisibility) {
        if (programVisibility.public !== undefined)
            return ChannelVisibility.Public;
        if (programVisibility.private !== undefined)
            return ChannelVisibility.Private;
        return ChannelVisibility.Public;
    }
}
//# sourceMappingURL=analytics.js.map