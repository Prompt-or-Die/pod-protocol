'use client';

import { useMemo, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

// Web3.js v2.0 modular imports
import {
  address,
  Address,
  lamports,
  sendAndConfirmTransactionFactory,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  pipe,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getSignatureFromTransaction,
  airdropFactory,
} from '@solana/web3.js';

// Program clients
import { getTransferSolInstruction } from '@solana-program/system';
import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from '@solana-program/compute-budget';

// @solana/kit modular imports
import { createSolanaRpc as createSolanaRpcKit } from '@solana/rpc';
import { address as addressKit } from '@solana/addresses';
import { generateKeyPairSigner } from '@solana/signers';
import type { 
  KeyPairSigner, 
  Rpc
} from '@solana/kit';

/**
 * Web3.js v2.0 Enhanced Hook
 * Provides convenient access to all Web3.js v2.0 APIs and patterns
 */
export const useWeb3 = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  // Web3.js v2.0 RPC clients
  const { rpc, rpcSubscriptions } = useMemo(() => {
    const rpcClient = createSolanaRpc(connection.rpcEndpoint);
    
    const wsEndpoint = connection.rpcEndpoint.replace('https://', 'wss://').replace('http://', 'ws://');
    const rpcSubs = createSolanaRpcSubscriptions(wsEndpoint);
    
    return {
      rpc: rpcClient,
      rpcSubscriptions: rpcSubs
    };
  }, [connection.rpcEndpoint]);

  // Pre-configured factories
  const factories = useMemo(() => {
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const airdrop = airdropFactory({ rpc });

    return {
      sendAndConfirmTransaction,
      airdrop
    };
  }, [rpc, rpcSubscriptions]);

  // Priority fee estimation
  const getPriorityFee = useCallback(async (priorityLevel: 'Low' | 'Medium' | 'High' = 'Medium'): Promise<bigint> => {
    try {
      if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        const response = await fetch(connection.rpcEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'web3-v2-hook',
            method: 'getPriorityFeeEstimate',
            params: [{
              priorityLevel,
            }],
          }),
        });
        const result = await response.json();
        return BigInt(result.result?.priorityFeeEstimate || 1000);
      }
    } catch (err) {
      console.warn('Failed to get priority fee estimate:', err);
    }
    
    // Fallback priority fees
    const fallbackFees = {
      'Low': 100n,
      'Medium': 1000n,
      'High': 5000n
    };
    
    return fallbackFees[priorityLevel];
  }, [connection.rpcEndpoint]);

  // Enhanced transaction builder
  const buildTransactionMessage = useCallback(async (
    instructions: any[],
    options: {
      feePayer?: Address;
      priorityLevel?: 'Low' | 'Medium' | 'High';
      computeUnits?: number;
    } = {}
  ) => {
    if (!publicKey) throw new Error('Wallet not connected');

    const feePayer = options.feePayer || address(publicKey.toBase58());
    const priorityFee = await getPriorityFee(options.priorityLevel);
    const computeUnits = options.computeUnits || 300000;

    // Get the latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    // Build transaction message with Web3.js v2.0 pipe pattern
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayer(feePayer, message),
      (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      (message) => appendTransactionMessageInstruction(
        getSetComputeUnitPriceInstruction({ microLamports: priorityFee }),
        message
      ),
      (message) => appendTransactionMessageInstruction(
        getSetComputeUnitLimitInstruction({ units: computeUnits }),
        message
      ),
      (message) => instructions.reduce(
        (msg, instruction) => appendTransactionMessageInstruction(instruction, msg),
        message
      )
    );

    return transactionMessage;
  }, [publicKey, rpc, getPriorityFee]);

  // Simple SOL transfer
  const transferSol = useCallback(async (
    recipient: Address,
    amount: bigint,
    options: {
      priorityLevel?: 'Low' | 'Medium' | 'High';
    } = {}
  ): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected');

    const senderAddress = address(publicKey.toBase58());
    
    const transferInstruction = getTransferSolInstruction({
      source: senderAddress,
      destination: recipient,
      amount: lamports(amount),
    });

    const transactionMessage = await buildTransactionMessage(
      [transferInstruction],
      { priorityLevel: options.priorityLevel }
    );

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    
    await factories.sendAndConfirmTransaction(signedTransaction, {
      commitment: 'confirmed',
      maxRetries: 0n,
      skipPreflight: true,
    });

    return getSignatureFromTransaction(signedTransaction);
  }, [publicKey, buildTransactionMessage, factories]);

  // Account balance (using v2.0 patterns)
  const getBalance = useCallback(async (accountAddress?: Address): Promise<bigint> => {
    const targetAddress = accountAddress || (publicKey ? address(publicKey.toBase58()) : null);
    if (!targetAddress) throw new Error('No address provided');

    const { value: balance } = await rpc.getBalance(targetAddress).send();
    return balance;
  }, [rpc, publicKey]);

  // Latest blockhash
  const getLatestBlockhash = useCallback(async () => {
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    return blockhash;
  }, [rpc]);

  // Account info
  const getAccountInfo = useCallback(async (accountAddress: Address) => {
    const { value: accountInfo } = await rpc.getAccountInfo(accountAddress).send();
    return accountInfo;
  }, [rpc]);

  // Airdrop (for devnet/testnet)
  const requestAirdrop = useCallback(async (
    recipient?: Address,
    amount: bigint = lamports(1000000000n) // 1 SOL default
  ): Promise<string> => {
    const targetAddress = recipient || (publicKey ? address(publicKey.toBase58()) : null);
    if (!targetAddress) throw new Error('No address provided');

    const signature = await factories.airdrop({
      recipientAddress: targetAddress,
      lamports: amount,
      commitment: 'confirmed'
    });

    return signature;
  }, [publicKey, factories]);

  // Convert utilities
  const utils = useMemo(() => ({
    // Convert string to Address
    toAddress: (addressString: string): Address => address(addressString),
    
    // Convert SOL to lamports
    solToLamports: (sol: number): bigint => lamports(BigInt(Math.floor(sol * 1_000_000_000))),
    
    // Convert lamports to SOL
    lamportsToSol: (lamportAmount: bigint): number => Number(lamportAmount) / 1_000_000_000,
    
    // Truncate address for display
    truncateAddress: (addr: Address, chars: number = 4): string => {
      const addrStr = addr.toString();
      return `${addrStr.slice(0, chars)}...${addrStr.slice(-chars)}`;
    }
  }), []);

  return {
    // RPC clients
    rpc,
    rpcSubscriptions,
    
    // Factories
    ...factories,
    
    // Transaction building
    buildTransactionMessage,
    getPriorityFee,
    
    // Common operations
    transferSol,
    getBalance,
    getLatestBlockhash,
    getAccountInfo,
    requestAirdrop,
    
    // Utilities
    utils,
    
    // Connection info
    isConnected: !!publicKey,
    walletAddress: publicKey ? address(publicKey.toBase58()) : null,
    endpoint: connection.rpcEndpoint
  };
}; 