'use client';

import React, { ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useConnection
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Styles for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

type ClusterType = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

interface ClusterConfig {
  name: string;
  endpoint: string;
  wsEndpoint?: string;
}

const CLUSTER_CONFIGS: Record<ClusterType, ClusterConfig> = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    endpoint: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
  'devnet': {
    name: 'Devnet',
    endpoint: 'https://api.devnet.solana.com',
  },
  'testnet': {
    name: 'Testnet', 
    endpoint: 'https://api.testnet.solana.com',
  },
  'localnet': {
    name: 'Localnet',
    endpoint: 'http://localhost:8899',
  },
};

// Enhanced cluster endpoint hook with better error handling
function useClusterEndpoint() {
  const [cluster, setCluster] = useState<ClusterType>('devnet');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedCluster = localStorage.getItem('cluster') as ClusterType;
      if (savedCluster && CLUSTER_CONFIGS[savedCluster]) {
        setCluster(savedCluster);
      }
    }
  }, []);

  const updateCluster = useCallback((newCluster: ClusterType) => {
    setCluster(newCluster);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cluster', newCluster);
    }
  }, []);

  const config = CLUSTER_CONFIGS[cluster];
  
  return {
    cluster,
    endpoint: config.endpoint,
    wsEndpoint: config.endpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
    updateCluster,
    clusterName: config.name,
    isClient,
  };
}

// Enhanced Wallet Provider with modern wallet standard support
export function WalletProvider({ children }: { children: ReactNode }) {
  const { endpoint, wsEndpoint, isClient } = useClusterEndpoint();
  
  // Wallet adapter configuration - modern wallet standard support
  // Empty array since all modern wallets support the Wallet Standard
  const wallets = useMemo(() => [], []);

  const handleWalletError = useCallback((error: Error) => {
    console.error('Wallet connection error:', error);
    // TODO: Add toast notification for wallet errors
  }, []);

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return <div>{children}</div>;
  }

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        wsEndpoint,
        confirmTransactionInitialTimeout: 60000,
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={handleWalletError}
        localStorageKey="walletAdapter"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

// Export the cluster hook for use in other components
export { useClusterEndpoint, type ClusterType };