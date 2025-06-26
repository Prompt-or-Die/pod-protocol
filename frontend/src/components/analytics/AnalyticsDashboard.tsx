'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { GlassCard, NeuralCard } from '../ui/ModernDappCard';
import Button from '../ui/Button';
import usePodClient from '../../hooks/usePodClient';
import { AnalyticsData } from '../../hooks/usePodClient';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className }) => {
  const { client, isConnected } = usePodClient();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    if (isConnected && client) {
      loadAnalytics();
    }
  }, [isConnected, client]);

  const loadAnalytics = async () => {
    if (!client) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await client.analytics.getDashboard();
      setAnalytics(data);
    } catch (err) {
      setError(`Failed to load analytics: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to view analytics
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor network performance and insights
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <Button variant="ghost" size="sm" onClick={loadAnalytics} disabled={loading}>
            <ArrowPathIcon className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

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

      {loading || !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <GlassCard key={i} className="animate-pulse">
              <div className="space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-8 bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-700 rounded w-full" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Agents */}
            <NeuralCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Agents</p>
                  <p className="text-2xl font-bold text-white">{analytics.agents.totalAgents.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUpIcon className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">+12.5%</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-600/20 rounded-lg">
                  <CpuChipIcon className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </NeuralCard>

            {/* Active Agents */}
            <NeuralCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Agents</p>
                  <p className="text-2xl font-bold text-white">{analytics.agents.activeAgents.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUpIcon className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">+8.2%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-600/20 rounded-lg">
                  <CpuChipIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </NeuralCard>

            {/* Total Channels */}
            <NeuralCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Channels</p>
                  <p className="text-2xl font-bold text-white">{analytics.channels.totalChannels.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUpIcon className="h-3 w-3 text-cyan-400" />
                    <span className="text-xs text-cyan-400">+15.7%</span>
                  </div>
                </div>
                <div className="p-3 bg-cyan-600/20 rounded-lg">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </NeuralCard>

            {/* Total Messages */}
            <NeuralCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Messages</p>
                  <p className="text-2xl font-bold text-white">{analytics.channels.totalMessages.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUpIcon className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">+23.1%</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-600/20 rounded-lg">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </NeuralCard>
          </div>

          {/* Network Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Network Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Transactions per Second</span>
                  <span className="text-white font-bold">{analytics.network.tps.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Total Transactions</span>
                  <span className="text-white font-bold">{analytics.network.totalTransactions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Current Slot</span>
                  <span className="text-white font-bold">{analytics.network.slotHeight.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Current Epoch</span>
                  <span className="text-white font-bold">{analytics.network.epoch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Network Health</span>
                  <span className="text-green-400 font-bold">{analytics.network.health}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">ZK Compression Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Compression Trees</span>
                  <span className="text-white font-bold">{analytics.zkCompression.totalTrees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Compressed NFTs</span>
                  <span className="text-white font-bold">{analytics.zkCompression.totalCompressedNFTs.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Cost Savings</span>
                  <span className="text-green-400 font-bold">{analytics.zkCompression.costSavings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Compression Ratio</span>
                  <span className="text-purple-400 font-bold">{analytics.zkCompression.compressionRatio}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Top Performing Agents</h3>
              <div className="space-y-3">
                {analytics.agents.topPerformers.map((agent, index) => (
                  <motion.div
                    key={agent.pubkey}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.pubkey.slice(0, 16)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{agent.reputation}</p>
                      <p className="text-xs text-gray-400">Reputation</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Popular Channels</h3>
              <div className="space-y-3">
                {analytics.channels.popularChannels.map((channel, index) => (
                  <motion.div
                    key={channel.pubkey}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                        <span className="text-cyan-400 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{channel.name}</p>
                        <p className="text-xs text-gray-400">{channel.description.slice(0, 30)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{channel.participantCount}</p>
                      <p className="text-xs text-gray-400">Participants</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Real-time Activity */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Real-time Activity</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{analytics.agents.averageReputation.toFixed(1)}</div>
                <div className="text-sm text-gray-400">Avg Agent Reputation</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
                    style={{ width: `${analytics.agents.averageReputation}%` }}
                  />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{analytics.channels.activeChannels}</div>
                <div className="text-sm text-gray-400">Active Channels</div>
                <div className="text-xs text-green-400 mt-1">
                  {((analytics.channels.activeChannels / analytics.channels.totalChannels) * 100).toFixed(1)}% of total
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{analytics.network.tps}</div>
                <div className="text-sm text-gray-400">Current TPS</div>
                <div className="text-xs text-cyan-400 mt-1">Network performance</div>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;