'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { 
  WalletIcon, 
  GlobeAltIcon, 
  ShieldCheckIcon, 
  CpuChipIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ModernDappCard } from './ModernDappCard';
import Button from './Button';
import { cn } from '../../lib/utils';

interface WalletConnectionHubProps {
  className?: string;
  showAdvancedOptions?: boolean;
  enableSocialAuth?: boolean;
  enableAIAgents?: boolean;
}

const WalletConnectionHub: React.FC<WalletConnectionHubProps> = ({
  className,
  showAdvancedOptions = true,
  enableSocialAuth = true,
  enableAIAgents = true
}) => {
  const { connected, connecting, wallet, publicKey } = useWallet();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Connection options
  const connectionOptions = [
    {
      id: 'wallet',
      title: 'Crypto Wallet',
      description: 'Connect using Phantom, Solflare, or other Solana wallets',
      icon: WalletIcon,
      primary: true,
      available: true
    },
    {
      id: 'social',
      title: 'Social Login',
      description: 'Connect with Google, Twitter, or Discord',
      icon: GlobeAltIcon,
      primary: false,
      available: enableSocialAuth
    },
    {
      id: 'ai-agent',
      title: 'AI Agent',
      description: 'Create or connect an autonomous AI agent',
      icon: CpuChipIcon,
      primary: false,
      available: enableAIAgents
    },
    {
      id: 'quantum',
      title: 'Quantum Secure',
      description: 'Post-quantum cryptography for maximum security',
      icon: ShieldCheckIcon,
      primary: false,
      available: showAdvancedOptions
    }
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connected && publicKey) {
    return (
      <ModernDappCard variant="glass" className={cn('max-w-md mx-auto', className)}>
        <div className="text-center space-y-4">
          {/* Success State */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center"
          >
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </motion.div>

          <div>
            <h3 className="text-xl font-bold text-white mb-2">Wallet Connected</h3>
            <p className="text-gray-400 text-sm mb-4">
              {wallet?.adapter.name} • {formatAddress(publicKey.toBase58())}
            </p>
          </div>

          {/* Connected Actions */}
          <div className="space-y-3">
            <Button variant="secondary" className="w-full" size="lg">
              <SparklesIcon className="h-5 w-5 mr-2" />
              View Dashboard
            </Button>
            
            <WalletDisconnectButton className="!bg-red-600 hover:!bg-red-700 !text-white !rounded-lg !px-4 !py-2 !w-full !font-medium" />
          </div>

          {/* Network Status */}
          <div className="pt-4 border-t border-gray-700/50">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected to Solana {process.env.NEXT_PUBLIC_NETWORK || 'Devnet'}</span>
            </div>
          </div>
        </div>
      </ModernDappCard>
    );
  }

  return (
    <div className={cn('max-w-2xl mx-auto space-y-6', className)}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  'h-full transition-all duration-300',
                  isSelected && 'ring-2 ring-purple-500 ring-opacity-50',
                  option.primary && 'md:col-span-2'
                )}
                onClick={() => setSelectedOption(option.id)}
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
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {option.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {option.description}
                    </p>
                    
                    {option.id === 'wallet' && (
                      <div className="space-y-3">
                        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white !rounded-lg !px-4 !py-2 !font-medium !border-none" />
                        
                        {connecting && (
                          <div className="flex items-center space-x-2 text-sm text-purple-400">
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Connecting to wallet...</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {option.id === 'social' && (
                      <div className="space-y-2">
                        <Button variant="secondary" size="sm" className="w-full">
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          Connect with Social
                        </Button>
                        <p className="text-xs text-gray-500">
                          Powered by Reown AppKit
                        </p>
                      </div>
                    )}
                    
                    {option.id === 'ai-agent' && (
                      <Button variant="neural" size="sm" className="w-full">
                        <CpuChipIcon className="h-4 w-4 mr-2" />
                        Create AI Agent
                      </Button>
                    )}
                    
                    {option.id === 'quantum' && (
                      <Button variant="glass" size="sm" className="w-full">
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
            className="flex items-center justify-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors mx-auto"
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
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <ModernDappCard variant="minimal" className="text-center">
                  <div className="space-y-2">
                    <div className="p-2 bg-blue-600/20 rounded-lg mx-auto w-fit">
                      <GlobeAltIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <h4 className="text-sm font-medium text-white">Custom RPC</h4>
                    <p className="text-xs text-gray-400">Configure custom endpoint</p>
                  </div>
                </ModernDappCard>

                <ModernDappCard variant="minimal" className="text-center">
                  <div className="space-y-2">
                    <div className="p-2 bg-orange-600/20 rounded-lg mx-auto w-fit">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
                    </div>
                    <h4 className="text-sm font-medium text-white">Debug Mode</h4>
                    <p className="text-xs text-gray-400">Enable development tools</p>
                  </div>
                </ModernDappCard>

                <ModernDappCard variant="minimal" className="text-center">
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

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        <p>Secured by Solana blockchain • Enhanced with Web3.js v2.0</p>
        <p>Your keys, your data, your control</p>
      </div>
    </div>
  );
};

export default WalletConnectionHub; 