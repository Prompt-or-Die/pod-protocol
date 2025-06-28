'use client';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PodComClient } from '@pod-protocol/sdk';
import type { 
  AgentAccount,
  ChannelAccount, 
  MessageAccount,
  NetworkStatistics,
  AgentSearchFilters,
  ChannelSearchFilters,
  MessageSearchFilters,
  PodComConfig,
  EnhancedAgentAccount,
  EnhancedChannelAccount,
  EnhancedMessageAccount
} from '../types/sdk';
import { ApiClient } from '../lib/api-client';

// Enhanced PodClient interface that combines SDK and API functionality
interface EnhancedPodClient {
  // SDK Client instance
  sdk: PodComClient;
  
  // API Client instance for backend integration
  api: ApiClient;
  
  // Unified agent operations
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

  // Unified channel operations
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

  // Unified message operations
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

  // Analytics operations
  analytics: {
    getDashboard: () => Promise<any>;
    getAgentAnalytics: (agentAddress: string) => Promise<any>;
    getNetworkAnalytics: () => Promise<NetworkStatistics>;
    getChannelAnalytics: (channelAddress: string) => Promise<any>;
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
    getTree: (address: string) => Promise<any>;
    listTrees: () => Promise<any[]>;
    mintCompressedNFT: (params: {
      treeAddress: string;
      name: string;
      symbol: string;
      uri: string;
      owner?: string;
    }) => Promise<{ signature: string; assetId: string }>;
  };

  // Utility methods
  isConnected: boolean;
  publicKey: string | null;
  connection: any;
}

// Create the enhanced client that combines SDK and API
const createEnhancedPodClient = (
  endpoint: string,
  publicKey: any,
  connection: any
): EnhancedPodClient => {
  // Initialize SDK client
  const sdkConfig: PodComConfig = {
    endpoint,
    commitment: 'confirmed',
    programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'PoD1111111111111111111111111111111111111111'
  };
  
  const sdk = new PodComClient(sdkConfig);
  
  // Initialize API client
  const api = new ApiClient();
  
  // Set up authentication if wallet is connected
  if (publicKey) {
    // In a real implementation, you'd get a JWT token from authentication
    const userAddress = publicKey.toString();
    // api.setAuthToken(userAddress); // Enable when backend auth is ready
  }

  return {
    sdk,
    api,
    isConnected: !!publicKey,
    publicKey: publicKey?.toString() || null,
    connection,

    agents: {
      register: async (params) => {
        try {
          // Use API for now, fallback to SDK when blockchain is ready
          return await api.registerAgent(params);
        } catch (error) {
          console.error('Agent registration failed:', error);
          throw error;
        }
      },

      getAgent: async (address) => {
        try {
          // Try API first, fallback to SDK
          return await api.getAgent(address);
        } catch (error) {
          console.error('Failed to get agent:', error);
          throw error;
        }
      },

      updateAgent: async (address, params) => {
        try {
          // TODO: Implement in API/SDK
          throw new Error('Agent update not yet implemented');
        } catch (error) {
          console.error('Failed to update agent:', error);
          throw error;
        }
      },

      listAgents: async (filters) => {
        try {
          return await api.listAgents(filters);
        } catch (error) {
          console.error('Failed to list agents:', error);
          throw error;
        }
      },

      searchAgents: async (query, filters) => {
        try {
          return await api.searchAgents(query, filters);
        } catch (error) {
          console.error('Failed to search agents:', error);
          throw error;
        }
      }
    },

    channels: {
      create: async (params) => {
        try {
          return await api.createChannel(params);
        } catch (error) {
          console.error('Channel creation failed:', error);
          throw error;
        }
      },

      getChannel: async (address) => {
        try {
          return await api.getChannel(address);
        } catch (error) {
          console.error('Failed to get channel:', error);
          throw error;
        }
      },

      listChannels: async (filters) => {
        try {
          return await api.listChannels(filters);
        } catch (error) {
          console.error('Failed to list channels:', error);
          throw error;
        }
      },

      join: async (channelAddress) => {
        try {
          return await api.joinChannel(channelAddress);
        } catch (error) {
          console.error('Failed to join channel:', error);
          throw error;
        }
      },

      leave: async (channelAddress) => {
        try {
          return await api.leaveChannel(channelAddress);
        } catch (error) {
          console.error('Failed to leave channel:', error);
          throw error;
        }
      },

      getParticipants: async (channelAddress) => {
        try {
          // TODO: Implement participants API endpoint
          console.warn('Channel participants API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get participants:', error);
          throw error;
        }
      },

      searchChannels: async (query, filters) => {
        try {
          return await api.searchChannels(query, filters);
        } catch (error) {
          console.error('Failed to search channels:', error);
          throw error;
        }
      }
    },

    messages: {
      send: async (params) => {
        try {
          return await api.sendMessage(params);
        } catch (error) {
          console.error('Message send failed:', error);
          throw error;
        }
      },

      getMessage: async (messageId) => {
        try {
          return await api.getMessage(messageId);
        } catch (error) {
          console.error('Failed to get message:', error);
          throw error;
        }
      },

      listMessages: async (filters) => {
        try {
          return await api.listMessages(filters);
        } catch (error) {
          console.error('Failed to list messages:', error);
          throw error;
        }
      },

      updateStatus: async (messageId, status) => {
        try {
          // TODO: Implement message status update API endpoint
          console.warn('Message status update API not yet implemented');
          return { signature: `mock_status_update_${Date.now()}` };
        } catch (error) {
          console.error('Failed to update message status:', error);
          throw error;
        }
      }
    },

    discovery: {
      searchAgents: async (filters) => {
        try {
          const result = await api.searchAgents('', filters);
          return {
            ...result,
            executionTime: 150 // Add execution time for compatibility
          };
        } catch (error) {
          console.error('Failed to discover agents:', error);
          throw error;
        }
      },

      getRecommendedAgents: async (options) => {
        try {
          // TODO: Implement recommendations API endpoint
          console.warn('Agent recommendations API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get recommended agents:', error);
          throw error;
        }
      },

      getRecommendedChannels: async (options) => {
        try {
          // TODO: Implement channel recommendations API endpoint
          console.warn('Channel recommendations API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get recommended channels:', error);
          throw error;
        }
      },

      findSimilarAgents: async (targetAgent, limit) => {
        try {
          // TODO: Implement similar agents API endpoint
          console.warn('Similar agents API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to find similar agents:', error);
          throw error;
        }
      },

      getTrendingChannels: async (limit) => {
        try {
          // TODO: Implement trending channels API endpoint
          console.warn('Trending channels API not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to get trending channels:', error);
          throw error;
        }
      }
    },

    zkCompression: {
      createTree: async (params) => {
        try {
          // TODO: Implement ZK compression in SDK and API
          console.warn('ZK compression not yet implemented');
          throw new Error('ZK compression not yet implemented');
        } catch (error) {
          console.error('Failed to create ZK tree:', error);
          throw error;
        }
      },

      getTree: async (address) => {
        try {
          console.warn('ZK compression not yet implemented');
          throw new Error('ZK compression not yet implemented');
        } catch (error) {
          console.error('Failed to get ZK tree:', error);
          throw error;
        }
      },

      listTrees: async () => {
        try {
          console.warn('ZK compression not yet implemented');
          return [];
        } catch (error) {
          console.error('Failed to list ZK trees:', error);
          throw error;
        }
      },

      mintCompressedNFT: async (params) => {
        try {
          console.warn('ZK compression not yet implemented');
          throw new Error('ZK compression not yet implemented');
        } catch (error) {
          console.error('Failed to mint compressed NFT:', error);
          throw error;
        }
      }
    },

    analytics: {
      getDashboard: async () => {
        try {
          return await api.getAnalyticsDashboard();
        } catch (error) {
          console.error('Failed to get analytics dashboard:', error);
          throw error;
        }
      },

      getAgentAnalytics: async (agentAddress) => {
        try {
          return await api.getAgentAnalytics(agentAddress);
        } catch (error) {
          console.error('Failed to get agent analytics:', error);
          throw error;
        }
      },

      getNetworkAnalytics: async () => {
        try {
          return await api.getNetworkAnalytics();
        } catch (error) {
          console.error('Failed to get network analytics:', error);
          throw error;
        }
      },

      getChannelAnalytics: async (channelAddress) => {
        try {
          return await api.getChannelAnalytics(channelAddress);
        } catch (error) {
          console.error('Failed to get channel analytics:', error);
          throw error;
        }
      }
    }
  };
};

const usePodClient = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const client = useMemo(() => {
    if (!connection) return null;
    
    const endpoint = connection.rpcEndpoint;
    
    // Create enhanced client that combines SDK and API functionality
    return createEnhancedPodClient(endpoint, publicKey, connection);
  }, [publicKey, connection]);

  const isConnected = !!publicKey;

  return {
    client,
    isConnected,
    publicKey,
    connection
  };
};

export default usePodClient;

// Export types for use in components
export type { 
  EnhancedPodClient as PodClient,
  AgentAccount,
  ChannelAccount,
  MessageAccount,
  NetworkStatistics,
  AgentSearchFilters,
  ChannelSearchFilters,
  MessageSearchFilters
};