'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SignalIcon, 
  ClockIcon, 
  CubeIcon, 
  ChartBarIcon,
  WifiIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useConnection } from '@solana/wallet-adapter-react';
import { cn } from '../../lib/utils';

interface NetworkMetrics {
  slot: number;
  epoch: number;
  epochProgress: number;
  tps: number;
  blockTime: number;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdated: number;
}

interface SolanaMetricsProps {
  className?: string;
  compact?: boolean;
}

const SolanaMetrics: React.FC<SolanaMetricsProps> = ({ className, compact = false }) => {
  const { connection } = useConnection();
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    slot: 0,
    epoch: 0,
    epochProgress: 0,
    tps: 0,
    blockTime: 0,
    health: 'good',
    lastUpdated: Date.now()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchMetrics = async () => {
      try {
        setError(null);
        
        // Fetch current slot and epoch info
        const [slot, epochInfo, recentPerformance] = await Promise.all([
          connection.getSlot('confirmed'),
          connection.getEpochInfo('confirmed'),
          connection.getRecentPerformanceSamples(1)
        ]);

        // Calculate TPS from recent performance
        const tps = recentPerformance.length > 0 
          ? Math.round(recentPerformance[0].numTransactions / recentPerformance[0].samplePeriodSecs)
          : 0;

        // Calculate epoch progress
        const epochProgress = (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100;

        // Estimate block time (average ~400ms on Solana)
        const blockTime = 0.4; // seconds

        // Determine network health based on TPS
        let health: NetworkMetrics['health'] = 'good';
        if (tps > 2000) health = 'excellent';
        else if (tps > 1000) health = 'good';
        else if (tps > 500) health = 'fair';
        else health = 'poor';

        setMetrics({
          slot,
          epoch: epochInfo.epoch,
          epochProgress,
          tps,
          blockTime,
          health,
          lastUpdated: Date.now()
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch Solana metrics:', err);
        setError('Failed to fetch network metrics');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Update every 5 seconds
    interval = setInterval(fetchMetrics, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connection]);

  const getHealthColor = (health: NetworkMetrics['health']) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthBg = (health: NetworkMetrics['health']) => {
    switch (health) {
      case 'excellent': return 'bg-green-500/20';
      case 'good': return 'bg-blue-500/20';
      case 'fair': return 'bg-yellow-500/20';
      case 'poor': return 'bg-red-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="flex items-center space-x-2">
          <div className={cn('w-2 h-2 rounded-full', 
            metrics.health === 'excellent' ? 'bg-green-400' :
            metrics.health === 'good' ? 'bg-blue-400' :
            metrics.health === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
          <span className="text-sm text-gray-300">
            {isLoading ? '...' : `${metrics.tps.toLocaleString()} TPS`}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          Slot {isLoading ? '...' : metrics.slot.toLocaleString()}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6',
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center">
          <SignalIcon className="h-5 w-5 mr-2" />
          Solana Network
        </h3>
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2',
          getHealthBg(metrics.health)
        )}>
          <div className={cn('w-2 h-2 rounded-full', 
            metrics.health === 'excellent' ? 'bg-green-400' :
            metrics.health === 'good' ? 'bg-blue-400' :
            metrics.health === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
          <span className={getHealthColor(metrics.health)}>
            {metrics.health.charAt(0).toUpperCase() + metrics.health.slice(1)}
          </span>
        </div>
      </div>

      {error ? (
        <div className="text-center py-8">
          <WifiIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Current Slot */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-400">
              <CubeIcon className="h-4 w-4 mr-2" />
              Current Slot
            </div>
            <div className="text-2xl font-bold text-white">
              {isLoading ? (
                <div className="h-8 bg-gray-700 rounded animate-pulse" />
              ) : (
                metrics.slot.toLocaleString()
              )}
            </div>
          </div>

          {/* Epoch Info */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-400">
              <ClockIcon className="h-4 w-4 mr-2" />
              Epoch {isLoading ? '...' : metrics.epoch}
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-white">
                {isLoading ? '...' : `${metrics.epochProgress.toFixed(1)}%`}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div 
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.epochProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* TPS */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-400">
              <BoltIcon className="h-4 w-4 mr-2" />
              Transactions/Sec
            </div>
            <div className="text-2xl font-bold text-white">
              {isLoading ? (
                <div className="h-8 bg-gray-700 rounded animate-pulse" />
              ) : (
                <span className={getHealthColor(metrics.health)}>
                  {metrics.tps.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Block Time */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-400">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Avg Block Time
            </div>
            <div className="text-lg font-bold text-white">
              {isLoading ? '...' : `${metrics.blockTime}s`}
            </div>
          </div>

          {/* Last Updated */}
          <div className="space-y-2 md:col-span-2 lg:col-span-2">
            <div className="text-xs text-gray-500">
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SolanaMetrics;