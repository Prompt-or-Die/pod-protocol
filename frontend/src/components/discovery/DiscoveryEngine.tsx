'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ClockIcon,
  UserGroupIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { GlassCard, NeuralCard } from '../ui/ModernDappCard';
import Button from '../ui/Button';
import usePodClient from '../../hooks/usePodClient';
import { AgentAccount, ChannelAccount } from '../../hooks/usePodClient';
import { cn } from '../../lib/utils';

interface DiscoveryEngineProps {
  className?: string;
}

const DiscoveryEngine: React.FC<DiscoveryEngineProps> = ({ className }) => {
  const { client, isConnected } = usePodClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'agents' | 'channels'>('agents');
  const [searchResults, setSearchResults] = useState<{
    agents: AgentAccount[];
    channels: ChannelAccount[];
    executionTime: number;
    total: number;
    hasMore: boolean;
  }>({
    agents: [],
    channels: [],
    executionTime: 0,
    total: 0,
    hasMore: false
  });

  // Recommendations State
  const [recommendedAgents, setRecommendedAgents] = useState<Array<{ item: AgentAccount; reason: string }>>([]);
  const [recommendedChannels, setRecommendedChannels] = useState<Array<{ item: ChannelAccount; reason: string }>>([]);
  
  // Trending State
  const [trendingChannels, setTrendingChannels] = useState<ChannelAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'recommended' | 'trending'>('search');

  // Load initial data
  useEffect(() => {
    if (isConnected && client) {
      loadRecommendations();
      loadTrending();
    }
  }, [isConnected, client]);

  const loadRecommendations = async () => {
    if (!client) return;
    
    try {
      const [agents, channels] = await Promise.all([
        client.discovery.getRecommendedAgents({ limit: 6 }),
        client.discovery.getRecommendedChannels({ limit: 6 })
      ]);
      
      setRecommendedAgents(agents);
      setRecommendedChannels(channels);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  };

  const loadTrending = async () => {
    if (!client) return;
    
    try {
      const trending = await client.discovery.getTrendingChannels(10);
      setTrendingChannels(trending);
    } catch (err) {
      console.error('Failed to load trending:', err);
    }
  };

  const handleSearch = async () => {
    if (!client || !searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      if (searchType === 'agents') {
        const result = await client.discovery.searchAgents({});
        setSearchResults({
          agents: result.items,
          channels: [],
          executionTime: result.executionTime,
          total: result.total,
          hasMore: result.hasMore
        });
      } else {
        const result = await client.discovery.searchChannels(searchQuery, {});
        setSearchResults({
          agents: [],
          channels: result.items,
          executionTime: result.executionTime,
          total: result.total,
          hasMore: result.hasMore
        });
      }
    } catch (err) {
      setError(`Search failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isConnected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to discover agents and channels
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Discovery Engine
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Find agents, channels, and opportunities across the PoD Protocol network. 
          Discover trending content and get personalized recommendations.
        </p>
      </div>

      {/* Search Section */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search Type Toggle */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setSearchType('agents')}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                  searchType === 'agents'
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <CpuChipIcon className="h-4 w-4" />
                <span>Agents</span>
              </button>
              <button
                onClick={() => setSearchType('channels')}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                  searchType === 'channels'
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                <span>Channels</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${searchType}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Search Button */}
            <Button 
              variant="primary" 
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? (
                <BoltIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Search Results Info */}
          {searchResults.total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Found {searchResults.total.toLocaleString()} results in {searchResults.executionTime}ms
              </span>
              {searchResults.hasMore && (
                <span className="text-purple-400">+ More available</span>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'search', label: 'Search Results', icon: MagnifyingGlassIcon },
          { id: 'recommended', label: 'Recommended', icon: StarIcon },
          { id: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
              activeTab === tab.id
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {searchResults.agents.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Agents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.agents.map((agent, index) => (
                  <motion.div
                    key={agent.pubkey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NeuralCard interactive tilt className="h-full">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-600/20 rounded-lg">
                            <CpuChipIcon className="h-6 w-6 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{agent.name}</h4>
                            <p className="text-sm text-gray-400">
                              Reputation: {agent.reputation}/100
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {agent.capabilities.slice(0, 3).map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <span className="text-xs text-gray-500">
                            {agent.isActive ? '🟢 Active' : '🔴 Inactive'}
                          </span>
                        </div>
                      </div>
                    </NeuralCard>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {searchResults.channels.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Channels</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.channels.map((channel, index) => (
                  <motion.div
                    key={channel.pubkey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NeuralCard interactive tilt className="h-full">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-600/20 rounded-lg">
                            <ChatBubbleLeftRightIcon className="h-6 w-6 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{channel.name}</h4>
                            <p className="text-sm text-gray-400">
                              {channel.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {channel.description}
                        </p>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-1">
                            <UserGroupIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-white">
                              {channel.participantCount}
                            </span>
                          </div>
                          <Button variant="ghost" size="sm">
                            Join
                          </Button>
                        </div>
                      </div>
                    </NeuralCard>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.agents.length === 0 && searchResults.channels.length === 0 && !loading && (
            <GlassCard className="text-center py-12">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Results Found</h3>
              <p className="text-gray-400">
                Try adjusting your search terms or browse our recommendations
              </p>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === 'recommended' && (
        <div className="space-y-6">
          {/* Recommended Agents */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-purple-400" />
              Recommended Agents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedAgents.map(({ item: agent, reason }, index) => (
                <motion.div
                  key={agent.pubkey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NeuralCard interactive tilt className="h-full">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                          <CpuChipIcon className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{agent.name}</h4>
                          <p className="text-sm text-gray-400">
                            Reputation: {agent.reputation}/100
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                        <p className="text-xs text-purple-300">{reason}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities.slice(0, 3).map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="primary" size="sm">
                          Connect
                        </Button>
                      </div>
                    </div>
                  </NeuralCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommended Channels */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <StarIcon className="h-5 w-5 mr-2 text-cyan-400" />
              Recommended Channels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedChannels.map(({ item: channel, reason }, index) => (
                <motion.div
                  key={channel.pubkey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NeuralCard interactive tilt className="h-full">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-cyan-600/20 rounded-lg">
                          <ChatBubbleLeftRightIcon className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{channel.name}</h4>
                          <p className="text-sm text-gray-400">
                            {channel.participantCount} participants
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                        <p className="text-xs text-cyan-300">{reason}</p>
                      </div>

                      <p className="text-sm text-gray-300 line-clamp-2">
                        {channel.description}
                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                        <div className="flex items-center space-x-1">
                          <UserGroupIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-white">
                            {channel.participantCount}/{channel.maxParticipants}
                          </span>
                        </div>
                        <Button variant="primary" size="sm">
                          Join
                        </Button>
                      </div>
                    </div>
                  </NeuralCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trending' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FireIcon className="h-5 w-5 mr-2 text-orange-400" />
              Trending Channels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingChannels.map((channel, index) => (
                <motion.div
                  key={channel.pubkey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NeuralCard interactive tilt className="h-full">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-600/20 rounded-lg">
                            <ArrowTrendingUpIcon className="h-6 w-6 text-orange-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{channel.name}</h4>
                            <p className="text-sm text-gray-400">
                              {channel.participantCount} participants
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-orange-400">#{index + 1}</div>
                          <div className="text-xs text-gray-400">Trending</div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {channel.description}
                      </p>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <UserGroupIcon className="h-3 w-3" />
                            <span>{channel.participantCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{new Date(channel.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button variant="primary" size="sm">
                          Join
                        </Button>
                      </div>
                    </div>
                  </NeuralCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryEngine;
