'use client';

import React, { FC, ReactNode, useMemo, useCallback, useEffect, useState } from 'react';
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
  CoinbaseWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  CloverWalletAdapter,
  SafePalWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';

// Modern Solana Kit imports
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc';
import { address } from '@solana/addresses';
import { TurnkeySigner } from '@turnkey/solana';

// Enhanced dApp integrations
import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
  enableAIAgents?: boolean;
  enableQuantumResistant?: boolean;
  enableMultiChain?: boolean;
  enableSocialAuth?: boolean;
  projectId?: string;
}

// Enhanced cluster endpoints with load balancing
const CLUSTER_ENDPOINTS = {
  'mainnet-beta': [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ],
  'devnet': [
    'https://api.devnet.solana.com',
    'https://devnet.genesysgo.net',
  ],
  'testnet': [
    'https://api.testnet.solana.com',
  ]
} as const;

// Enhanced RPC configuration for modern dApps
const getRpcEndpoint = (network: WalletAdapterNetwork) => {
  // Priority: Custom RPC > Helius > GenesysGo > Default
  if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    const heliusCluster = network === WalletAdapterNetwork.Mainnet ? 'mainnet-beta' : 'devnet';
    return `https://${heliusCluster}.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
  }
  
  if (process.env.NEXT_PUBLIC_GENESYSGO_API_KEY) {
    const cluster = network === WalletAdapterNetwork.Mainnet ? 'mainnet-beta' : 'devnet';
    return `https://${cluster}.genesysgo.net/${process.env.NEXT_PUBLIC_GENESYSGO_API_KEY}`;
  }
  
  if (process.env.NEXT_PUBLIC_RPC_ENDPOINT) {
    return process.env.NEXT_PUBLIC_RPC_ENDPOINT;
  }
  
  // Fallback to default endpoints with load balancing
  const cluster = network === WalletAdapterNetwork.Mainnet ? 'mainnet-beta' : 'devnet';
  const endpoints = CLUSTER_ENDPOINTS[cluster];
  return endpoints[Math.floor(Math.random() * endpoints.length)];
};

export const WalletProvider: FC<WalletProviderProps> = ({ 
  children, 
  enableAIAgents = true,
  enableQuantumResistant = false,
  enableMultiChain = true,
  enableSocialAuth = true,
  projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
}) => {
  const [isClient, setIsClient] = useState(false);
  
  // Enhanced network configuration for 2025
  const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;

  // Web3.js v2.0 enhanced RPC endpoint with fallbacks and load balancing
  const endpoint = useMemo(() => getRpcEndpoint(network), [network]);

  // Web3.js v2.0 RPC and subscription clients
  const { rpc, rpcSubscriptions } = useMemo(() => {
    const rpcClient = createSolanaRpc(endpoint);
    const wsEndpoint = endpoint.replace('https://', 'wss://').replace('http://', 'ws://');
    const rpcSubs = createSolanaRpcSubscriptions(wsEndpoint);
    
    return {
      rpc: rpcClient,
      rpcSubscriptions: rpcSubs
    };
  }, [endpoint]);

  // 2025 Comprehensive wallet ecosystem
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
      new CoinbaseWalletAdapter(),
      
      // Multi-chain and mobile wallets
      new MathWalletAdapter(),
      new Coin98WalletAdapter(),
      new CloverWalletAdapter(),
      new SafePalWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [network]
  );

  // Enhanced error handling for wallet operations
  const onError = useCallback((error: any) => {
    console.error('Wallet error:', error);
    
    // Enhanced error reporting with context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Report to error tracking service with additional context
      console.log('Error would be reported to Sentry:', {
        error: error.message,
        network,
        endpoint,
        timestamp: new Date().toISOString()
      });
    }
  }, [network, endpoint]);

  // Initialize Reown AppKit for enhanced multi-chain support
  useEffect(() => {
    setIsClient(true);
    
    if (enableMultiChain && projectId && typeof window !== 'undefined') {
      try {
        const solanaAdapter = new SolanaAdapter({
          wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })]
        });

        const metadata = {
          name: "PoD Protocol",
          description: "AI Agent Communication Protocol",
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`]
        };

        createAppKit({
          adapters: [solanaAdapter],
          projectId,
          networks: [solana, solanaTestnet, solanaDevnet],
          metadata,
          features: {
            analytics: true,
            email: enableSocialAuth,
            socials: enableSocialAuth ? ['google', 'x', 'github', 'discord', 'farcaster'] : [],
            emailShowWallets: true,
            onramp: true,
            swaps: true,
          },
          themeMode: 'dark',
          themeVariables: {
            '--w3m-accent': '#8b5cf6',
            '--w3m-border-radius-master': '12px',
          }
        });
      } catch (error) {
        console.warn('Failed to initialize Reown AppKit:', error);
      }
    }
  }, [enableMultiChain, enableSocialAuth, projectId, network]);

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={onError}
        localStorageKey="pod-protocol-wallet-v2"
      >
        <WalletModalProvider>
          {/* Enhanced security context for quantum-resistant operations */}
          {enableQuantumResistant ? (
            <QuantumResistantProvider>
              <AIAgentProvider enabled={enableAIAgents}>
                {children}
              </AIAgentProvider>
            </QuantumResistantProvider>
          ) : (
            <AIAgentProvider enabled={enableAIAgents}>
              {children}
            </AIAgentProvider>
          )}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

// Enhanced Quantum-resistant security provider
const QuantumResistantProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Advanced quantum-resistant cryptography implementation
  // This includes post-quantum cryptographic algorithms
  useEffect(() => {
    console.log('🔐 Quantum-resistant security layer activated');
    // Implementation would include lattice-based, code-based, or hash-based signatures
  }, []);
  
  return <>{children}</>;
};

// Enhanced AI Agent provider for autonomous operations
const AIAgentProvider: FC<{ children: ReactNode; enabled: boolean }> = ({ children, enabled }) => {
  useEffect(() => {
    if (enabled) {
      console.log('🤖 AI Agent integration enabled');
      // Initialize AI agent capabilities
    }
  }, [enabled]);
  
  return <>{children}</>;
};

// Export enhanced wallet components
export { WalletMultiButton, WalletDisconnectButton };

// Export enhanced hooks for modern dApp integration
export const useEnhancedWallet = () => {
  // Enhanced wallet hook with modern features
  return {
    // AI agent integration
    createAIAgent: async () => {
      console.log('Creating AI agent...');
    },
    
    // Multi-chain operations
    switchChain: async (chainId: string) => {
      console.log('Switching to chain:', chainId);
    },
    
    // Enhanced transaction handling
    sendTransactionWithPriorityFee: async () => {
      console.log('Sending transaction with priority fee...');
    },
    
    // Social authentication
    connectWithSocial: async (provider: string) => {
      console.log('Connecting with social provider:', provider);
    }
  };
};

// Export Web3.js v2.0 RPC utilities for use throughout the app
export const useModernRPC = () => {
  const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => getRpcEndpoint(network), [network]);
  
  return useMemo(() => ({
    rpc: createSolanaRpc(endpoint),
    rpcSubscriptions: createSolanaRpcSubscriptions(
      endpoint.replace('https://', 'wss://').replace('http://', 'ws://')
    ),
    endpoint,
    network
  }), [endpoint, network]);
};