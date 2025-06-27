'use client';

import React, { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Styles for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

// Use the user's preferred cluster from localStorage or default to devnet
function useClusterEndpoint() {
  if (typeof window === 'undefined') {
    return 'https://api.devnet.solana.com';
  }
  
  const cluster = localStorage.getItem('cluster') || 'devnet';
  switch (cluster) {
    case 'mainnet-beta':
      return process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'devnet':
    default:
      return 'https://api.devnet.solana.com';
  }
}

// Enhanced Wallet Provider with modern wallet standard support
export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useClusterEndpoint();
  
  // Wallet adapter configuration - modern wallet standard support
  // Empty array since all modern wallets support the Wallet Standard
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        wsEndpoint: endpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet connection error:', error);
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}