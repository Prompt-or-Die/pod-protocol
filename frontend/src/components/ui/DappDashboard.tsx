'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  ChartBarIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BoltIcon,
  GlobeAltIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ModernDappCard, GlassCard, NeuralCard, QuantumCard } from './ModernDappCard';
import Button from './Button';
import { cn } from '../../lib/utils';

interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<any>;
  trend: 'up' | 'down' | 'neutral';
  color: string;
}

interface DappDashboardProps {
  className?: string;
}

const DappDashboard: React.FC<DappDashboardProps> = ({ className }) => {
  const { publicKey, connected } = useWallet();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  // Mock data - in real app, this would come from your backend/blockchain
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: DashboardMetric[] = [
        {
          id: 'balance',
          title: 'SOL Balance',
          value: '12.45',
          change: 5.2,
          icon: CurrencyDollarIcon,
          trend: 'up',
          color: 'text-green-400'
        },
        {
          id: 'agents',
          title: 'Active Agents',
          value: 8,
          change: 2,
          icon: CpuChipIcon,
          trend: 'up',
          color: 'text-purple-400'
        },
        {
          id: 'messages',
          title: 'Messages Today',
          value: 247,
          change: -12,
          icon: UserGroupIcon,
          trend: 'down',
          color: 'text-blue-400'
        },
        {
          id: 'performance',
          title: 'Network Performance',
          value: '99.8%',
          change: 0.1,
          icon: BoltIcon,
          trend: 'up',
          color: 'text-cyan-400'
        }
      ];
      
      setMetrics(mockMetrics);
      setIsLoading(false);
    };

    if (connected) {
      loadMetrics();
    }
  }, [connected, selectedTimeframe]);

  const timeframes = ['1h', '24h', '7d', '30d'];

  if (!connected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <div className="p-4 bg-gray-700/50 rounded-full mx-auto w-fit">
              <ChartBarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to view your personalized dashboard
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
          <motion.h1 
            className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Dashboard
          </motion.h1>
          <motion.p 
            className="text-gray-400 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Welcome back, {publicKey?.toBase58().slice(0, 8)}...
          </motion.p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex space-x-2 bg-gray-800/50 rounded-lg p-1">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                selectedTimeframe === timeframe
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUpIcon : TrendingDownIcon;
          
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard interactive tilt>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-2 bg-gray-700/50 rounded-lg">
                        <IconComponent className={cn('h-5 w-5', metric.color)} />
                      </div>
                      <h3 className="text-sm font-medium text-gray-300">
                        {metric.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-white">
                        {isLoading ? (
                          <div className="h-8 w-16 bg-gray-700/50 rounded animate-pulse" />
                        ) : (
                          metric.value
                        )}
                      </div>
                      
                      {!isLoading && (
                        <div className="flex items-center space-x-1">
                          <TrendIcon className={cn(
                            'h-3 w-3',
                            metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                          )} />
                          <span className={cn(
                            'text-xs font-medium',
                            metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                          )}>
                            {Math.abs(metric.change)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            vs {selectedTimeframe}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Agents Section */}
        <div className="lg:col-span-2 space-y-6">
          <NeuralCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <CpuChipIcon className="h-6 w-6 mr-2 text-purple-400" />
                AI Agents
              </h2>
              <Button variant="secondary" size="sm">
                <SparklesIcon className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </div>
            
            <div className="space-y-3">
              {[
                { name: 'Trading Bot Alpha', status: 'active', performance: '+12.3%' },
                { name: 'Content Generator', status: 'active', performance: '+8.7%' },
                { name: 'Market Analyzer', status: 'paused', performance: '+5.2%' },
              ].map((agent, index) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      agent.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                    )} />
                    <span className="text-white font-medium">{agent.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-green-400 text-sm font-medium">
                      {agent.performance}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      agent.status === 'active' 
                        ? 'bg-green-400/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    )}>
                      {agent.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </NeuralCard>

          {/* Activity Feed */}
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <ClockIcon className="h-6 w-6 mr-2 text-blue-400" />
              Recent Activity
            </h2>
            
            <div className="space-y-3">
              {[
                { action: 'Agent "Trading Bot Alpha" executed trade', time: '2 minutes ago', type: 'success' },
                { action: 'New message received in #general', time: '5 minutes ago', type: 'info' },
                { action: 'Agent "Market Analyzer" paused', time: '1 hour ago', type: 'warning' },
              ].map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-gray-800/20 rounded-lg"
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-2',
                    activity.type === 'success' && 'bg-green-400',
                    activity.type === 'info' && 'bg-blue-400',
                    activity.type === 'warning' && 'bg-yellow-400'
                  )} />
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.action}</p>
                    <p className="text-gray-400 text-xs">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Network Status */}
          <QuantumCard>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <GlobeAltIcon className="h-5 w-5 mr-2 text-cyan-400" />
              Network Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">TPS</span>
                <span className="text-white font-medium">2,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Slot Height</span>
                <span className="text-white font-medium">245,892,103</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Epoch</span>
                <span className="text-white font-medium">489</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Health</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Excellent</span>
                </div>
              </div>
            </div>
          </QuantumCard>

          {/* Quick Actions */}
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <Button variant="primary" className="w-full" size="sm">
                <CpuChipIcon className="h-4 w-4 mr-2" />
                Create New Agent
              </Button>
              <Button variant="secondary" className="w-full" size="sm">
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Join Channel
              </Button>
              <Button variant="ghost" className="w-full" size="sm">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default DappDashboard; 