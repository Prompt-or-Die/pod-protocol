'use client';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { ApiClient } from '../lib/api-client';

// Enhanced interface definitions
interface MessageSearchFilters {
  agent?: string;
  channel?: string;
  status?: string;
  limit?: number;
  content?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ChannelSearchFilters {
  visibility?: 'public' | 'private';
  creator?: string;
  limit?: number;
  minMembers?: number;
  maxMembers?: number;
}

interface AgentSearchFilters {
  capabilities?: string[];
  minReputation?: number;
  limit?: number;
}

interface NetworkStatistics {
  totalTransactions: number;
  tps: number;
  slotHeight: number;
  epoch: number;
  health: string;
  activeNodes?: number;
  stakingRatio?: number;
}

// Core account interfaces
interface AgentAccount {
  pubkey: string;
  name: string;
  capabilities: string[];
  reputation: number;
  metadataUri: string;
  lastUpdated: number;
  isActive: boolean;
}

interface ChannelAccount {
  pubkey: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  creator: string;
  participantCount: number;
  maxParticipants: number;
  feePerMessage: number;
  escrowBalance: number;
  createdAt: number;
}

interface MessageAccount {
  pubkey: string;
  sender: string;
  recipient: string;
  content: string;
  channelId?: string;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  encrypted: boolean;
}

interface ZKCompressionTree {
  pubkey: string;
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
  capacity: number;
  currentCount: number;
  creator: string;
}

interface CompressedNFT {
  id: string;
  name: string;
  symbol: string;
  uri: string;
  owner: string;
  tree: string;
  leafId: number;
}

interface AnalyticsData {
  agents: {
    totalAgents: number;
    activeAgents: number;
    averageReputation: number;
    topPerformers: AgentAccount[];
  };
  channels: {
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
    popularChannels: ChannelAccount[];
  };
  network: NetworkStatistics;
  zkCompression: {
    totalTrees: number;
    totalCompressedNFTs: number;
    costSavings: string;
    compressionRatio: string;
  };
}

// Enhanced PodClient interface with proper typing
interface PodClientInterface {
  // Agent operations
  agents: {
    register: (params: {
      name: string;
      capabilities: string[];
      metadataUri: string;
      isPublic: boolean;
    }) => Promise<{ signature: string; agentAddress: string }>;
    getAgent: (address: string) => Promise<AgentAccount>;
    updateAgent: (address: string, params: Partial<AgentAccount>) => Promise<{ signature: string }>;
    listAgents: (filters?: AgentSearchFilters) => Promise<AgentAccount[]>;
    searchAgents: (query: string, filters?: AgentSearchFilters) => Promise<{
      items: AgentAccount[];
      total: number;
      hasMore: boolean;
    }>;
  };

  // Channel operations
  channels: {
    create: (params: {
      name: string;
      description: string;
      visibility: 'public' | 'private';
      maxParticipants: number;
      feePerMessage: number;
    }) => Promise<{ signature: string; channelAddress: string }>;
    getChannel: (address: string) => Promise<ChannelAccount>;
    listChannels: (filters?: ChannelSearchFilters) => Promise<ChannelAccount[]>;
    join: (channelAddress: string) => Promise<{ signature: string }>;
    leave: (channelAddress: string) => Promise<{ signature: string }>;
    getParticipants: (channelAddress: string) => Promise<string[]>;
    searchChannels: (query: string, filters?: ChannelSearchFilters) => Promise<{
      items: ChannelAccount[];
      total: number;
      hasMore: boolean;
    }>;
  };

  // Message operations
  messages: {
    send: (params: {
      recipient: string;
      content: string;
      channelId?: string;
      encrypted?: boolean;
    }) => Promise<{ signature: string; messageId: string }>;
    getMessage: (messageId: string) => Promise<MessageAccount>;
    listMessages: (filters?: MessageSearchFilters) => Promise<MessageAccount[]>;
    updateStatus: (messageId: string, status: string) => Promise<{ signature: string }>;
  };

  // Discovery operations
  discovery: {
    searchAgents: (filters?: AgentSearchFilters) => Promise<{
      items: AgentAccount[];
      total: number;
      executionTime: number;
      hasMore: boolean;
    }>;
    getRecommendedAgents: (options?: {
      limit?: number;
      forAgent?: string;
    }) => Promise<Array<{ item: AgentAccount; reason: string }>>;
    getRecommendedChannels: (options?: {
      limit?: number;
      forAgent?: string;
    }) => Promise<Array<{ item: ChannelAccount; reason: string }>>;
    findSimilarAgents: (targetAgent: AgentAccount, limit?: number) => Promise<AgentAccount[]>;
    getTrendingChannels: (limit?: number) => Promise<ChannelAccount[]>;
  };

  // ZK Compression operations
  zkCompression: {
    createTree: (params: {
      maxDepth: number;
      maxBufferSize: number;
      canopyDepth: number;
    }) => Promise<{ signature: string; treeAddress: string }>;
    getTree: (address: string) => Promise<ZKCompressionTree>;
    listTrees: () => Promise<ZKCompressionTree[]>;
    mintCompressedNFT: (params: {
      treeAddress: string;
      name: string;
      symbol: string;
      uri: string;
      owner?: string;
    }) => Promise<{ signature: string; assetId: string }>;
    transferCompressedNFT: (params: {
      assetId: string;
      newOwner: string;
    }) => Promise<{ signature: string }>;
    listCompressedNFTs: (owner: string) => Promise<CompressedNFT[]>;
    calculateCosts: (nftCount: number) => Promise<Array<{
      maxDepth: number;
      capacity: string;
      estimatedCost: string;
      savings: string;
    }>>;
  };

  // Analytics operations with proper return types
  analytics: {
    getDashboard: () => Promise<AnalyticsData>;
    getAgentAnalytics: (agentAddress: string) => Promise<{
      performance: number;
      messagesCount: number;
      successRate: number;
      reputationHistory: Array<{ date: string; value: number }>;
    }>;
    getNetworkAnalytics: () => Promise<NetworkStatistics>;
    getChannelAnalytics: (channelAddress: string) => Promise<{
      messageCount: number;
      activeParticipants: number;
      growthRate: number;
      engagementScore: number;
    }>;
  };
}

// Real implementation that connects to the API server
const createRealPodClient = (wallet: { 
  publicKey?: { toString(): string }; 
  signTransaction?: unknown;
  signAllTransactions?: unknown;
}, _connection: unknown): PodClientInterface => {
  const apiClient = new ApiClient();

  // Set up authentication if wallet is connected
  if (wallet?.publicKey) {
    // In a real implementation, you'd get a JWT token from authentication
    // For now, we'll use the wallet address as a basic identifier
    const userAddress = wallet.publicKey.toString();
    // apiClient.setAuthToken(userAddress); // Enable when backend auth is ready
  }

  return {
    agents: {
      register: async (params) => {
        try {
          const result = await apiClient.registerAgent(params);
          return result;
        } catch (error) {
          console.error('Failed to register agent:', error);
          throw new Error(`Agent registration failed: ${error}`);
        }
      },
      getAgent: async (address) => {
        try {
          const result = await apiClient.getAgent(address);
          return result;
        } catch (error) {
          console.error('Failed to get agent:', error);
          throw new Error(`Failed to get agent: ${error}`);
        }
      },
      updateAgent: async (address, params) => {
        try {
          // TODO: Implement update API endpoint
          throw new Error('Agent update not yet implemented in API');
        } catch (error) {
          console.error('Failed to update agent:', error);
          throw error;
        }
      },
      listAgents: async (filters) => {
        try {
          const result = await apiClient.listAgents(filters);
          return result;
        } catch (error) {
          console.error('Failed to list agents:', error);
          throw new Error(`Failed to list agents: ${error}`);
        }
      },
      searchAgents: async (query, filters) => {
        try {
          const result = await apiClient.searchAgents(query, filters);
          return result;
        } catch (error) {
          console.error('Failed to search agents:', error);
          throw new Error(`Failed to search agents: ${error}`);
        }
      }
    },

    channels: {
      create: async (params) => {
        try {
          const result = await apiClient.createChannel(params);
          return result;
        } catch (error) {
          console.error('Failed to create channel:', error);
          throw new Error(`Channel creation failed: ${error}`);
        }
      },
      getChannel: async (address) => {
        try {
          const result = await apiClient.getChannel(address);
          return result;
        } catch (error) {
          console.error('Failed to get channel:', error);
          throw new Error(`Failed to get channel: ${error}`);
        }
      },
      listChannels: async (filters) => {
        try {
          const result = await apiClient.listChannels(filters);
          return result;
        } catch (error) {
          console.error('Failed to list channels:', error);
          throw new Error(`Failed to list channels: ${error}`);
        }
      },
      join: async (channelAddress) => {
        try {
          const result = await apiClient.joinChannel(channelAddress);
          return result;
        } catch (error) {
          console.error('Failed to join channel:', error);
          throw new Error(`Failed to join channel: ${error}`);
        }
      },
      leave: async (channelAddress) => {
        try {
          const result = await apiClient.leaveChannel(channelAddress);
          return result;
        } catch (error) {
          console.error('Failed to leave channel:', error);
          throw new Error(`Failed to leave channel: ${error}`);
        }
      },
      getParticipants: async (channelAddress) => {
        try {
          // TODO: Implement participants API endpoint
          console.warn('Channel participants API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get participants:', error);
          throw new Error(`Failed to get participants: ${error}`);
        }
      },
      searchChannels: async (query, filters) => {
        try {
          const result = await apiClient.searchChannels(query, filters);
          return result;
        } catch (error) {
          console.error('Failed to search channels:', error);
          throw new Error(`Failed to search channels: ${error}`);
        }
      }
    },

    messages: {
      send: async (params) => {
        try {
          const result = await apiClient.sendMessage(params);
          return result;
        } catch (error) {
          console.error('Failed to send message:', error);
          throw new Error(`Message send failed: ${error}`);
        }
      },
      getMessage: async (messageId) => {
        try {
          const result = await apiClient.getMessage(messageId);
          return result;
        } catch (error) {
          console.error('Failed to get message:', error);
          throw new Error(`Failed to get message: ${error}`);
        }
      },
      listMessages: async (filters) => {
        try {
          const result = await apiClient.listMessages(filters);
          return result;
        } catch (error) {
          console.error('Failed to list messages:', error);
          throw new Error(`Failed to list messages: ${error}`);
        }
      },
      updateStatus: async (messageId, status) => {
        try {
          // TODO: Implement message status update API endpoint
          console.warn('Message status update API not yet implemented');
          return { signature: `mock_status_update_${Date.now()}` };
        } catch (error) {
          console.error('Failed to update message status:', error);
          throw new Error(`Failed to update message status: ${error}`);
        }
      }
    },

    discovery: {
      searchAgents: async (filters) => {
        try {
          const result = await apiClient.searchAgents('', filters);
          return {
            ...result,
            executionTime: 150 // Add execution time for compatibility
          };
        } catch (error) {
          console.error('Failed to discover agents:', error);
          throw new Error(`Discovery search failed: ${error}`);
        }
      },
      getRecommendedAgents: async (options) => {
        try {
          // TODO: Implement recommendations API endpoint
          console.warn('Agent recommendations API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get recommended agents:', error);
          throw new Error(`Failed to get recommendations: ${error}`);
        }
      },
      getRecommendedChannels: async (options) => {
        try {
          // TODO: Implement channel recommendations API endpoint
          console.warn('Channel recommendations API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get recommended channels:', error);
          throw new Error(`Failed to get recommendations: ${error}`);
        }
      },
      findSimilarAgents: async (targetAgent, limit) => {
        try {
          // TODO: Implement similar agents API endpoint
          console.warn('Similar agents API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to find similar agents:', error);
          throw new Error(`Failed to find similar agents: ${error}`);
        }
      },
      getTrendingChannels: async (limit) => {
        try {
          // TODO: Implement trending channels API endpoint
          console.warn('Trending channels API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get trending channels:', error);
          throw new Error(`Failed to get trending channels: ${error}`);
        }
      }
    },

    zkCompression: {
      createTree: async (params) => {
        try {
          // TODO: Implement ZK compression API endpoints
          console.warn('ZK compression API not yet implemented');
          throw new Error('ZK compression not yet implemented in API');
        } catch (error) {
          console.error('Failed to create ZK tree:', error);
          throw error;
        }
      },
      getTree: async (address) => {
        try {
          console.warn('ZK compression API not yet implemented');
          throw new Error('ZK compression not yet implemented in API');
        } catch (error) {
          console.error('Failed to get ZK tree:', error);
          throw error;
        }
      },
      listTrees: async () => {
        try {
          console.warn('ZK compression API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to list ZK trees:', error);
          throw new Error(`Failed to list ZK trees: ${error}`);
        }
      },
      mintCompressedNFT: async (params) => {
        try {
          console.warn('ZK compression API not yet implemented');
          throw new Error('ZK compression not yet implemented in API');
        } catch (error) {
          console.error('Failed to mint compressed NFT:', error);
          throw error;
        }
      },
      transferCompressedNFT: async (params) => {
        try {
          console.warn('ZK compression API not yet implemented');
          throw new Error('ZK compression not yet implemented in API');
        } catch (error) {
          console.error('Failed to transfer compressed NFT:', error);
          throw error;
        }
      },
      listCompressedNFTs: async (owner) => {
        try {
          console.warn('ZK compression API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to list compressed NFTs:', error);
          throw new Error(`Failed to list compressed NFTs: ${error}`);
        }
      },
      calculateCosts: async (nftCount) => {
        try {
          console.warn('ZK compression API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to calculate costs:', error);
          throw new Error(`Failed to calculate costs: ${error}`);
        }
      }
    },

    analytics: {
      getDashboard: async () => {
        try {
          const result = await apiClient.getAnalyticsDashboard();
          return result;
        } catch (error) {
          console.error('Failed to get analytics dashboard:', error);
          throw new Error(`Failed to get analytics: ${error}`);
        }
      },
      getAgentAnalytics: async (agentAddress) => {
        try {
          const result = await apiClient.getAgentAnalytics(agentAddress);
          return result;
        } catch (error) {
          console.error('Failed to get agent analytics:', error);
          throw new Error(`Failed to get agent analytics: ${error}`);
        }
      },
      getNetworkAnalytics: async () => {
        try {
          const result = await apiClient.getNetworkAnalytics();
          return result;
        } catch (error) {
          console.error('Failed to get network analytics:', error);
          throw new Error(`Failed to get network analytics: ${error}`);
        }
      },
      getChannelAnalytics: async (channelAddress) => {
        try {
          const result = await apiClient.getChannelAnalytics(channelAddress);
          return result;
        } catch (error) {
          console.error('Failed to get channel analytics:', error);
          throw new Error(`Failed to get channel analytics: ${error}`);
        }
      }
    }
  };
};

const usePodClient = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const client = useMemo(() => {
    if (!publicKey) return null;
    
    // Use REAL API client that connects to the backend
    return createRealPodClient({ publicKey, signTransaction, signAllTransactions }, connection);
  }, [publicKey, signTransaction, signAllTransactions, connection]);

  const isConnected = !!publicKey;

  return {
    client,
    isConnected,
    publicKey,
    connection
  };
};

export default usePodClient;
export type { 
  PodClientInterface as PodClient, 
  AgentAccount, 
  ChannelAccount, 
  MessageAccount, 
  ZKCompressionTree, 
  CompressedNFT, 
  AnalyticsData,
  MessageSearchFilters,
  ChannelSearchFilters,
  AgentSearchFilters,
  NetworkStatistics
};
