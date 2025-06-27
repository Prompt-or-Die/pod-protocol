'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { 
  WalletIcon, 
  GlobeAltIcon, 
  ShieldCheckIcon, 
  CpuChipIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  SignalIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { ModernDappCard } from './ModernDappCard';
import Button from './Button';
import { cn } from '../../lib/utils';

// Performance monitoring
interface PerformanceMetrics {
  connectionTime?: number;
  renderTime: number;
  interactionCount: number;
  lastActivity: number;
}

// Security context
interface SecurityContext {
  networkValidated: boolean;
  walletVerified: boolean;
  connectionSecure: boolean;
  lastSecurityCheck: number;
}

// Error types
type ConnectionError = 'WALLET_NOT_FOUND' | 'CONNECTION_REFUSED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';

interface WalletConnectionHubProps {
  className?: string;
  showAdvancedOptions?: boolean;
  enableSocialAuth?: boolean;
  enableAIAgents?: boolean;
  onConnectionSuccess?: (publicKey: string) => void;
  onConnectionError?: (error: ConnectionError, details: string) => void;
  enablePerformanceMonitoring?: boolean;
  securityLevel?: 'standard' | 'enhanced' | 'maximum';
}

const WalletConnectionHub: React.FC<WalletConnectionHubProps> = ({
  className,
  showAdvancedOptions = true,
  enableSocialAuth = true,
  enableAIAgents = true,
  onConnectionSuccess,

  enablePerformanceMonitoring = true,
  securityLevel = 'enhanced'
}) => {
  const { connected, connecting, wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  
  // Component state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAddressVisible, setIsAddressVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [networkHealth, setNetworkHealth] = useState<'good' | 'degraded' | 'poor'>('good');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [lastError, setLastError] = useState<{ type: ConnectionError; message: string } | null>(null);

  // Performance monitoring
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: performance.now(),
    interactionCount: 0,
    lastActivity: Date.now()
  });

  // Security context
  const [security, setSecurity] = useState<SecurityContext>({
    networkValidated: false,
    walletVerified: false,
    connectionSecure: false,
    lastSecurityCheck: 0
  });

  // Refs for accessibility
  const connectionErrorRef = useRef<HTMLDivElement>(null);
  const statusAnnouncementRef = useRef<HTMLDivElement>(null);

  // Enhanced connection options with security levels
  const connectionOptions = useMemo(() => [
    {
      id: 'wallet',
      title: 'Crypto Wallet',
      description: 'Connect using Phantom, Solflare, or other Solana wallets',
      icon: WalletIcon,
      primary: true,
      available: true,
      securityRating: 'high',
      recommendedFor: 'Most users'
    },
    {
      id: 'social',
      title: 'Social Login',
      description: 'Connect with Google, Twitter, or Discord',
      icon: GlobeAltIcon,
      primary: false,
      available: enableSocialAuth,
      securityRating: 'medium',
      recommendedFor: 'New users'
    },
    {
      id: 'ai-agent',
      title: 'AI Agent',
      description: 'Create or connect an autonomous AI agent',
      icon: CpuChipIcon,
      primary: false,
      available: enableAIAgents,
      securityRating: 'high',
      recommendedFor: 'Advanced users'
    },
    {
      id: 'quantum',
      title: 'Quantum Secure',
      description: 'Post-quantum cryptography for maximum security',
      icon: ShieldCheckIcon,
      primary: false,
      available: showAdvancedOptions && securityLevel === 'maximum',
      securityRating: 'maximum',
      recommendedFor: 'Enterprise users'
    }
  ], [enableSocialAuth, enableAIAgents, showAdvancedOptions, securityLevel]);

  // Performance monitoring effect
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;

    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  }, [enablePerformanceMonitoring]);

  // Network health monitoring
  useEffect(() => {
    const checkNetworkHealth = async () => {
      try {
        const start = performance.now();
        await connection.getLatestBlockhash();
        const latency = performance.now() - start;
        
        setNetworkHealth(
          latency < 1000 ? 'good' : 
          latency < 3000 ? 'degraded' : 'poor'
        );
      } catch (error) {
        setNetworkHealth('poor');
        console.warn('Network health check failed:', error);
      }
    };

    checkNetworkHealth();
    const interval = setInterval(checkNetworkHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [connection]);

  // Security validation effect
  useEffect(() => {
    const validateSecurity = async () => {
      try {
        // Validate network
        const networkValidated = connection ? true : false;
        
        // Validate wallet
        const walletVerified = wallet?.adapter ? true : false;
        
        // Check connection security
        const connectionSecure = connected && publicKey ? true : false;
        
        setSecurity({
          networkValidated,
          walletVerified,
          connectionSecure,
          lastSecurityCheck: Date.now()
        });
      } catch (error) {
        console.error('Security validation failed:', error);
      }
    };

    validateSecurity();
  }, [connection, wallet, connected, publicKey]);

  // Connection status management
  useEffect(() => {
    if (connecting) {
      setConnectionStatus('connecting');
      setLastError(null);
    } else if (connected) {
      setConnectionStatus('connected');
      setLastError(null);
      if (publicKey && onConnectionSuccess) {
        onConnectionSuccess(publicKey.toBase58());
      }
    } else {
      setConnectionStatus('idle');
    }
  }, [connecting, connected, publicKey, onConnectionSuccess]);

  // Accessibility announcements
  useEffect(() => {
    if (statusAnnouncementRef.current) {
      const message = 
        connectionStatus === 'connecting' ? 'Connecting to wallet...' :
        connectionStatus === 'connected' ? 'Wallet successfully connected' :
        connectionStatus === 'error' ? `Connection error: ${lastError?.message}` :
        '';
      
      if (message) {
        statusAnnouncementRef.current.textContent = message;
      }
    }
  }, [connectionStatus, lastError]);

  // Utility functions
  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
      
      // Track interaction for performance monitoring
      setMetrics(prev => ({ 
        ...prev, 
        interactionCount: prev.interactionCount + 1,
        lastActivity: Date.now()
      }));
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);



  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
    setMetrics(prev => ({ 
      ...prev, 
      interactionCount: prev.interactionCount + 1,
      lastActivity: Date.now()
    }));
  }, []);

  const toggleAddressVisibility = useCallback(() => {
    setIsAddressVisible(prev => !prev);
    setMetrics(prev => ({ 
      ...prev, 
      interactionCount: prev.interactionCount + 1,
      lastActivity: Date.now()
    }));
  }, []);

  const getNetworkStatusColor = useCallback(() => {
    switch (networkHealth) {
      case 'good': return 'bg-green-400';
      case 'degraded': return 'bg-yellow-400';
      case 'poor': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  }, [networkHealth]);

  const getSecurityScore = useCallback(() => {
    const { networkValidated, walletVerified, connectionSecure } = security;
    return (Number(networkValidated) + Number(walletVerified) + Number(connectionSecure)) / 3 * 100;
  }, [security]);

  // Connected state component
  if (connected && publicKey) {
    const securityScore = getSecurityScore();
    const address = publicKey.toBase58();
    const displayAddress = isAddressVisible ? address : formatAddress(address);

    return (
      <ModernDappCard variant="glass" className={cn('max-w-md mx-auto', className)}>
        {/* Screen reader announcements */}
        <div 
          ref={statusAnnouncementRef}
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
        />

        <div className="text-center space-y-4">
          {/* Success State */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center"
            role="status"
            aria-label="Wallet connection successful"
          >
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </motion.div>

          <div>
            <h3 className="text-xl font-bold text-white mb-2">Wallet Connected</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-400 text-sm">
                  {wallet?.adapter.name}
                </span>
                <span className="text-gray-500">•</span>
                <button
                  onClick={toggleAddressVisibility}
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-1"
                  aria-label={isAddressVisible ? 'Hide wallet address' : 'Show full wallet address'}
                >
                  <span className="font-mono">{displayAddress}</span>
                  {isAddressVisible ? (
                    <EyeSlashIcon className="h-3 w-3" />
                  ) : (
                    <EyeIcon className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(address)}
                  className="p-1 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
                  aria-label="Copy wallet address to clipboard"
                >
                  <ClipboardDocumentIcon className="h-3 w-3" />
                </button>
              </div>

              {copiedToClipboard && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-green-400"
                  role="status"
                  aria-live="polite"
                >
                  Address copied to clipboard!
                </motion.p>
              )}
            </div>
          </div>

          {/* Security & Network Status */}
          <div className="p-3 bg-gray-800/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <LockClosedIcon className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">Security Score</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${securityScore}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <span className="text-white font-medium">{Math.round(securityScore)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <SignalIcon className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">Network</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={cn('w-2 h-2 rounded-full', getNetworkStatusColor())} />
                <span className="text-white capitalize">{networkHealth}</span>
              </div>
            </div>
          </div>

          {/* Connected Actions */}
          <div className="space-y-3">
            <Button 
              variant="secondary" 
              className="w-full" 
              size="lg"
              onClick={() => handleOptionSelect('dashboard')}
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              View Dashboard
            </Button>
            
            <WalletDisconnectButton className="!bg-red-600 hover:!bg-red-700 !text-white !rounded-lg !px-4 !py-2 !w-full !font-medium transition-colors focus:!ring-2 focus:!ring-red-500" />
          </div>

          {/* Network Status */}
          <div className="pt-4 border-t border-gray-700/50">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <div className={cn('w-2 h-2 rounded-full animate-pulse', getNetworkStatusColor())} />
              <span>Connected to Solana {process.env.NEXT_PUBLIC_NETWORK || 'Devnet'}</span>
            </div>
          </div>
        </div>
      </ModernDappCard>
    );
  }

  // Main connection interface
  return (
    <div className={cn('max-w-2xl mx-auto space-y-6', className)}>
      {/* Screen reader announcements */}
      <div 
        ref={statusAnnouncementRef}
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      />

      {/* Error Display */}
      {lastError && (
        <motion.div
          ref={connectionErrorRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
        >
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-400 font-medium">Connection Error</h4>
              <p className="text-red-300 text-sm mt-1">{lastError.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Connect to PoD Protocol
        </motion.h2>
        <motion.p 
          className="text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Choose your preferred connection method to start communicating with AI agents
        </motion.p>
      </div>

      {/* Connection Options Grid */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="group"
        aria-labelledby="connection-options-heading"
      >
        <h3 id="connection-options-heading" className="sr-only">
          Connection Options
        </h3>
        
        {connectionOptions.filter(option => option.available).map((option, index) => {
          const IconComponent = option.icon;
          const isSelected = selectedOption === option.id;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ModernDappCard
                variant={option.primary ? 'neural' : 'glass'}
                interactive
                tilt
                className={cn(
                  'h-full transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-500',
                  isSelected && 'ring-2 ring-purple-500 ring-opacity-50',
                  option.primary && 'md:col-span-2'
                )}
                onClick={() => handleOptionSelect(option.id)}
                
              >
                <div className="flex items-start space-x-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    option.primary 
                      ? 'bg-purple-600/20 text-purple-400' 
                      : 'bg-gray-700/50 text-gray-300'
                  )}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {option.title}
                      </h3>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        option.securityRating === 'maximum' ? 'bg-green-900/30 text-green-400' :
                        option.securityRating === 'high' ? 'bg-blue-900/30 text-blue-400' :
                        option.securityRating === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-gray-900/30 text-gray-400'
                      )}>
                        {option.securityRating}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-2">
                      {option.description}
                    </p>
                    
                    <p className="text-xs text-gray-500 mb-3">
                      Recommended for: {option.recommendedFor}
                    </p>
                    
                    {option.id === 'wallet' && (
                      <div className="space-y-3">
                        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white !rounded-lg !px-4 !py-2 !font-medium !border-none focus:!ring-2 focus:!ring-purple-500" />
                        
                        {connecting && (
                          <div 
                            className="flex items-center space-x-2 text-sm text-purple-400"
                            role="status"
                            aria-live="polite"
                          >
                            <div 
                              className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"
                              aria-hidden="true"
                            />
                            <span>Connecting to wallet...</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {option.id === 'social' && (
                      <div className="space-y-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleOptionSelect('social')}
                        >
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          Connect with Social
                        </Button>
                        <p className="text-xs text-gray-500">
                          Powered by Reown AppKit
                        </p>
                      </div>
                    )}
                    
                    {option.id === 'ai-agent' && (
                      <Button 
                        variant="neural" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleOptionSelect('ai-agent')}
                      >
                        <CpuChipIcon className="h-4 w-4 mr-2" />
                        Create AI Agent
                      </Button>
                    )}
                    
                    {option.id === 'quantum' && (
                      <Button 
                        variant="glass" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleOptionSelect('quantum')}
                      >
                        <ShieldCheckIcon className="h-4 w-4 mr-2" />
                        Quantum Connect
                      </Button>
                    )}
                  </div>
                </div>
              </ModernDappCard>
            </motion.div>
          );
        })}
      </div>

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors mx-auto focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1"
            aria-expanded={showAdvanced}
            aria-controls="advanced-options"
          >
            <span>Advanced Options</span>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRightIcon className="h-4 w-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                id="advanced-options"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                role="group"
                aria-label="Advanced connection options"
              >
                <ModernDappCard variant="glass" className="text-center">
                  <div className="space-y-2">
                    <div className="p-2 bg-blue-600/20 rounded-lg mx-auto w-fit">
                      <GlobeAltIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <h4 className="text-sm font-medium text-white">Custom RPC</h4>
                    <p className="text-xs text-gray-400">Configure custom endpoint</p>
                  </div>
                </ModernDappCard>

                <ModernDappCard variant="glass" className="text-center">
                  <div className="space-y-2">
                    <div className="p-2 bg-orange-600/20 rounded-lg mx-auto w-fit">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
                    </div>
                    <h4 className="text-sm font-medium text-white">Debug Mode</h4>
                    <p className="text-xs text-gray-400">Enable development tools</p>
                  </div>
                </ModernDappCard>

                <ModernDappCard variant="glass" className="text-center">
                  <div className="space-y-2">
                    <div className="p-2 bg-green-600/20 rounded-lg mx-auto w-fit">
                      <SparklesIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <h4 className="text-sm font-medium text-white">Beta Features</h4>
                    <p className="text-xs text-gray-400">Try experimental features</p>
                  </div>
                </ModernDappCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Performance Metrics (Development only) */}
      {process.env.NODE_ENV === 'development' && enablePerformanceMonitoring && (
        <details className="text-xs text-gray-500 space-y-1">
          <summary className="cursor-pointer hover:text-gray-400">Performance Metrics</summary>
          <div className="mt-2 p-2 bg-gray-900/50 rounded">
            <p>Render Time: {metrics.renderTime.toFixed(2)}ms</p>
            <p>Interactions: {metrics.interactionCount}</p>
            <p>Security Score: {getSecurityScore()}%</p>
            <p>Network Health: {networkHealth}</p>
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        <p>Secured by Solana blockchain • Enhanced with Web3.js v2.0</p>
        <p>Your keys, your data, your control</p>
      </div>
    </div>
  );
};

export default WalletConnectionHub; 