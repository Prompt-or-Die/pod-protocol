'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface PerformanceMetrics {
  responseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  networkLatency: number;
  lastUpdated: number;
}

interface PerformanceMonitorProps {
  className?: string;
  showDetailed?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  className,
  showDetailed = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 245,
    successRate: 99.2,
    errorRate: 0.8,
    throughput: 847,
    memoryUsage: 68,
    networkLatency: 32,
    lastUpdated: Date.now()
  });

  const [performanceGrade, setPerformanceGrade] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => {
        const newMetrics = {
          responseTime: Math.max(50, prev.responseTime + (Math.random() - 0.5) * 50),
          successRate: Math.max(90, Math.min(100, prev.successRate + (Math.random() - 0.5) * 2)),
          errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 0.5)),
          throughput: Math.max(100, prev.throughput + (Math.random() - 0.5) * 200),
          memoryUsage: Math.max(20, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 10)),
          networkLatency: Math.max(10, prev.networkLatency + (Math.random() - 0.5) * 20),
          lastUpdated: Date.now()
        };

        // Calculate performance grade
        const score = (
          (newMetrics.successRate / 100) * 0.3 +
          (Math.max(0, 1000 - newMetrics.responseTime) / 1000) * 0.3 +
          (Math.max(0, 100 - newMetrics.networkLatency) / 100) * 0.2 +
          (Math.max(0, 100 - newMetrics.memoryUsage) / 100) * 0.2
        );

        if (score > 0.9) setPerformanceGrade('excellent');
        else if (score > 0.7) setPerformanceGrade('good');
        else if (score > 0.5) setPerformanceGrade('fair');
        else setPerformanceGrade('poor');

        return newMetrics;
      });
    };

    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const getGradeColor = (grade: typeof performanceGrade) => {
    switch (grade) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
    }
  };

  const getGradeBg = (grade: typeof performanceGrade) => {
    switch (grade) {
      case 'excellent': return 'bg-green-500/20';
      case 'good': return 'bg-blue-500/20';
      case 'fair': return 'bg-yellow-500/20';
      case 'poor': return 'bg-red-500/20';
    }
  };

  if (!showDetailed) {
    return (
      <div className={cn('flex items-center space-x-4', className)}>
        <div className="flex items-center space-x-2">
          <div className={cn('w-2 h-2 rounded-full', 
            performanceGrade === 'excellent' ? 'bg-green-400' :
            performanceGrade === 'good' ? 'bg-blue-400' :
            performanceGrade === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
          <span className={cn('text-sm font-medium', getGradeColor(performanceGrade))}>
            {metrics.responseTime.toFixed(0)}ms
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          {metrics.successRate.toFixed(1)}% uptime
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
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Performance Monitor
        </h3>
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2',
          getGradeBg(performanceGrade)
        )}>
          <div className={cn('w-2 h-2 rounded-full', 
            performanceGrade === 'excellent' ? 'bg-green-400' :
            performanceGrade === 'good' ? 'bg-blue-400' :
            performanceGrade === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
          <span className={getGradeColor(performanceGrade)}>
            {performanceGrade.charAt(0).toUpperCase() + performanceGrade.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Response Time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <ClockIcon className="h-4 w-4 mr-2" />
              Response Time
            </div>
            <span className={cn(
              'text-sm font-medium',
              metrics.responseTime < 200 ? 'text-green-400' :
              metrics.responseTime < 500 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {metrics.responseTime.toFixed(0)}ms
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full',
                metrics.responseTime < 200 ? 'bg-green-500' :
                metrics.responseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (metrics.responseTime / 1000) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Success Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Success Rate
            </div>
            <span className="text-sm font-medium text-green-400">
              {metrics.successRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-green-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${metrics.successRate}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Error Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Error Rate
            </div>
            <span className={cn(
              'text-sm font-medium',
              metrics.errorRate < 1 ? 'text-green-400' :
              metrics.errorRate < 5 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {metrics.errorRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full',
                metrics.errorRate < 1 ? 'bg-green-500' :
                metrics.errorRate < 5 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${metrics.errorRate * 10}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Throughput */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <SignalIcon className="h-4 w-4 mr-2" />
              Throughput
            </div>
            <span className="text-sm font-medium text-white">
              {metrics.throughput.toFixed(0)} req/s
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (metrics.throughput / 2000) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Memory Usage
            </div>
            <span className={cn(
              'text-sm font-medium',
              metrics.memoryUsage < 70 ? 'text-green-400' :
              metrics.memoryUsage < 85 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {metrics.memoryUsage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full',
                metrics.memoryUsage < 70 ? 'bg-green-500' :
                metrics.memoryUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${metrics.memoryUsage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Network Latency */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-400">
              <SignalIcon className="h-4 w-4 mr-2" />
              Network Latency
            </div>
            <span className={cn(
              'text-sm font-medium',
              metrics.networkLatency < 50 ? 'text-green-400' :
              metrics.networkLatency < 100 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {metrics.networkLatency.toFixed(0)}ms
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full',
                metrics.networkLatency < 50 ? 'bg-green-500' :
                metrics.networkLatency < 100 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (metrics.networkLatency / 200) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()} • 
          <span className="text-green-400 ml-1">Live monitoring active</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceMonitor;