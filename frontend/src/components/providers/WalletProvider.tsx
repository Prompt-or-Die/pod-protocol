'use client';

import React, { FC, ReactNode, useMemo, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  BackpackWalletAdapter,
  GlowWalletAdapter,
  SlopeWalletAdapter,
  TipLinkWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';

// Web3.js v2.0 modular imports
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc';
import { address } from '@solana/addresses';
import { SolanaAgentKit } from '@solana/agent-kit';
import { TurnkeySigner } from '@turnkey/solana';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
  enableAIAgents?: boolean;
  enableQuantumResistant?: boolean;
}

// Web3.js v2.0 cluster endpoints
const CLUSTER_ENDPOINTS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com'
} as const;

export const WalletProvider: FC<WalletProviderProps> = ({ 
  children, 
  enableAIAgents = true,
  enableQuantumResistant = false 
}) => {
  // Enhanced network configuration for 2025
  const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;

  // Web3.js v2.0 enhanced RPC endpoint with fallbacks and load balancing
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      const heliusCluster = network === WalletAdapterNetwork.Mainnet ? 'mainnet-beta' : 'devnet';
      return `https://${heliusCluster}.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
    }
    if (process.env.NEXT_PUBLIC_RPC_ENDPOINT) {
      return process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    }
    
    // Use Web3.js v2.0 cluster endpoints
    const cluster = network === WalletAdapterNetwork.Mainnet ? 'mainnet-beta' : 'devnet';
    return CLUSTER_ENDPOINTS[cluster];
  }, [network]);

  // Web3.js v2.0 RPC and subscription clients
  const { rpc, rpcSubscriptions } = useMemo(() => {
    const rpcClient = createSolanaRpc(endpoint);
    const wsEndpoint = process.env.NEXT_PUBLIC_WS_ENDPOINT 
      ? process.env.NEXT_PUBLIC_WS_ENDPOINT 
      : endpoint.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const rpcSubs = createSolanaRpcSubscriptions(wsEndpoint);
    
    return {
      rpc: rpcClient,
      rpcSubscriptions: rpcSubs
    };
  }, [endpoint]);

  // 2025 Wallet ecosystem - comprehensive support
  const wallets = useMemo(
    () => [
      // Major wallets with enhanced features
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
      
      // Institutional and security-focused wallets
      new LedgerWalletAdapter(),
      new SlopeWalletAdapter(),
      
      // Modern Web3 wallets
      new TipLinkWalletAdapter(),
      new TorusWalletAdapter(),
      
      // Add AI Agent wallet adapter if enabled
      ...(enableAIAgents ? [
        // Custom AI Agent wallet adapter for autonomous operations
        // This would be implemented based on your specific AI agent needs
      ] : []),
    ],
    [network, enableAIAgents]
  );

  // Error handling for wallet operations
  const onError = useCallback((error: any) => {
    console.error('Wallet error:', error);
    // Add your error reporting service here
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Report to error tracking service
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={onError}
        localStorageKey="pod-protocol-wallet"
      >
        <WalletModalProvider>
          {/* Enhanced security context for quantum-resistant operations */}
          {enableQuantumResistant && (
            <QuantumResistantProvider>
              {children}
            </QuantumResistantProvider>
          )}
          {!enableQuantumResistant && children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

// Quantum-resistant security provider (future-proofing for post-quantum cryptography)
const QuantumResistantProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Placeholder for quantum-resistant cryptography implementation
  // This will be important as quantum computing advances
  return <>{children}</>;
};

// Export enhanced wallet components
export { WalletMultiButton, WalletDisconnectButton };

// Export enhanced hooks for AI agent integration
export const useAIAgent = () => {
  // Hook for AI agent wallet integration
  // This would integrate with your AI agent system
  return {
    createAgent: async () => {
      // Implementation for creating AI agents
    },
    signWithAgent: async () => {
      // Implementation for AI agent signing
    }
  };
};

// Export Web3.js v2.0 RPC utilities for use throughout the app
export const useWeb3RPC = () => {
  const endpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT || CLUSTER_ENDPOINTS.devnet;
  
  return useMemo(() => ({
    rpc: createSolanaRpc(endpoint),
    rpcSubscriptions: createSolanaRpcSubscriptions(
      endpoint.replace('https://', 'wss://').replace('http://', 'ws://')
    )
  }), [endpoint]);
};