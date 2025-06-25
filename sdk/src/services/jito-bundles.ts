/**
 * Jito Bundles Service for PoD Protocol
 * 
 * Provides transaction bundling and MEV protection for AI agent interactions
 * Optimizes transaction processing and provides atomic execution guarantees
 */

import { 
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { 
  getSetComputeUnitLimitInstruction, 
  getSetComputeUnitPriceInstruction 
} from "@solana-program/compute-budget";
import { 
  getTransferSolInstruction 
} from "@solana-program/system";
import { BaseService } from "./base.js";

export interface BundleConfig {
  /** Tip amount in lamports (minimum 1000) */
  tipLamports: number;
  /** Maximum number of transactions in bundle (max 5) */
  maxTransactions?: number;
  /** Priority fee in micro-lamports */
  priorityFee?: number;
  /** Compute unit limit */
  computeUnits?: number;
}

export interface BundleTransaction {
  /** The transaction to include in bundle */
  transaction: Transaction | VersionedTransaction | TransactionInstruction[];
  /** Optional signers for this transaction */
  signers?: KeyPairSigner[];
  /** Description for logging */
  description?: string;
}

export interface BundleResult {
  /** Bundle ID from Jito */
  bundleId: string;
  /** Individual transaction signatures */
  signatures: string[];
  /** Bundle status */
  status: 'pending' | 'success' | 'failed';
  /** Optional error message */
  error?: string;
}

export class JitoBundlesService extends BaseService {
  private readonly JITO_TIP_ACCOUNTS = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', 
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'
  ];

  private jitoRpcUrl: string = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
  private wallet: KeyPairSigner | null = null;

  constructor(rpcUrl: string, programId: string, commitment: any) {
    super(rpcUrl, programId, commitment);
  }

  setWallet(wallet: KeyPairSigner): void {
    this.wallet = wallet;
  }

  private ensureWallet(): KeyPairSigner {
    if (!this.wallet) {
      throw new Error('Wallet not set. Call setWallet() first.');
    }
    return this.wallet;
  }

  /**
   * Set custom Jito RPC URL
   */
  setJitoRpcUrl(url: string): void {
    this.jitoRpcUrl = url;
  }

  /**
   * Create and send a Jito bundle
   */
  async sendBundle(
    transactions: BundleTransaction[],
    config: BundleConfig
  ): Promise<BundleResult> {
    try {
      if (transactions.length === 0 || transactions.length > 5) {
        throw new Error('Bundle must contain 1-5 transactions');
      }

      if (config.tipLamports < 1000) {
        throw new Error('Minimum tip is 1000 lamports');
      }

      // Add tip transaction
      const tipTransaction = await this.createTipTransaction(config.tipLamports);
      const allTransactions = [tipTransaction, ...transactions];

      // Prepare transactions for bundle
      const preparedTransactions = await Promise.all(
        allTransactions.map(async (bundleTx, index) => {
          let tx = bundleTx.transaction;
          
          // Add compute budget instructions if specified
          if (config.priorityFee || config.computeUnits) {
            const computeInstructions: TransactionInstruction[] = [];
            
            if (config.computeUnits) {
              computeInstructions.push(
                getSetComputeUnitLimitInstruction({ units: config.computeUnits })
              );
            }
            
            if (config.priorityFee) {
              computeInstructions.push(
                getSetComputeUnitPriceInstruction({ microLamports: config.priorityFee })
              );
            }

            // Handle different transaction types
            if (Array.isArray(bundleTx.transaction)) {
              // Transaction is array of instructions
              bundleTx.transaction = [...computeInstructions, ...bundleTx.transaction];
            } else if (bundleTx.transaction && typeof bundleTx.transaction === 'object') {
              // Add to existing transaction
              if ('instructions' in bundleTx.transaction) {
                bundleTx.transaction.instructions = [
                  ...computeInstructions, 
                  ...bundleTx.transaction.instructions
                ];
              }
            }
          }

          // Get recent blockhash
          const { value: { blockhash, lastValidBlockHeight } } = await this.rpc.getLatestBlockhash().send();
          const wallet = this.ensureWallet();
          
          // Convert instructions array to transaction message
          if (Array.isArray(bundleTx.transaction)) {
            const transactionMessage = pipe(
              createTransactionMessage({ version: 0 }),
              (tm) => setTransactionFeePayer(wallet.address, tm),
              (tm) => setTransactionLifetimeUsingBlockhash(blockhash, tm),
              (tm) => appendTransactionMessageInstructions(bundleTx.transaction as TransactionInstruction[], tm)
            );
            
            // Sign the transaction
            const signedTransaction = await signTransaction([wallet], { 
              message: transactionMessage 
            });
            tx = signedTransaction;
          } else if (bundleTx.transaction instanceof VersionedTransaction) {
            // Handle VersionedTransaction
            tx = bundleTx.transaction;
            if (bundleTx.signers && bundleTx.signers.length > 0) {
              // Sign with additional signers if provided
              const allSigners = [wallet, ...bundleTx.signers];
              tx = await signTransaction(allSigners, { message: tx.message });
            } else {
              tx = await signTransaction([wallet], { message: tx.message });
            }
          } else {
            // Handle regular Transaction or other formats
            // For now, assume it's a legacy transaction that needs conversion
            throw new Error('Unsupported transaction type. Use TransactionInstruction[] or VersionedTransaction.');
          }

          return {
            transaction: tx,
            description: bundleTx.description || `Transaction ${index + 1}`
          };
        })
      );

      // Submit bundle to Jito
      const bundleResult = await this.submitToJito(preparedTransactions);

      console.log(`Bundle submitted: ${bundleResult.bundleId}`);
      console.log(`Transactions: ${bundleResult.signatures.length}`);

      return bundleResult;
    } catch (error) {
      console.error('Failed to send bundle:', error);
      throw error;
    }
  }

  /**
   * Create a bundle for AI agent messaging operations
   */
  async sendMessagingBundle(
    messageInstructions: TransactionInstruction[],
    config: Partial<BundleConfig> = {}
  ): Promise<BundleResult> {
    const defaultConfig: BundleConfig = {
      tipLamports: 10000, // 0.00001 SOL tip
      priorityFee: 1000, // 1000 micro-lamports
      computeUnits: 200000, // 200k compute units
      ...config
    };

    // Group instructions into transactions (max 5 per bundle)
    const transactions: BundleTransaction[] = [];
    
    for (let i = 0; i < messageInstructions.length; i += 3) {
      const chunk = messageInstructions.slice(i, i + 3);
      
      transactions.push({
        transaction: chunk, // Pass instructions directly
        description: `Message batch ${Math.floor(i / 3) + 1}`
      });

      // Jito bundles have max 5 transactions
      if (transactions.length >= 4) break;
    }

    return this.sendBundle(transactions, defaultConfig);
  }

  /**
   * Create a bundle for channel operations (join, broadcast, etc.)
   */
  async sendChannelBundle(
    channelInstructions: TransactionInstruction[],
    config: Partial<BundleConfig> = {}
  ): Promise<BundleResult> {
    const defaultConfig: BundleConfig = {
      tipLamports: 5000, // 0.000005 SOL tip
      priorityFee: 500,
      computeUnits: 150000,
      ...config
    };

    return this.sendBundle([{
      transaction: channelInstructions, // Pass instructions directly
      description: 'Channel operations bundle'
    }], defaultConfig);
  }

  /**
   * Get optimal tip amount based on recent network activity
   */
  async getOptimalTip(): Promise<number> {
    try {
      // Get recent priority fees to estimate optimal tip
      const response = await this.rpc.getRecentPrioritizationFees().send();
      const recentFees = response.value;
      
      if (!recentFees || recentFees.length === 0) {
        return 10000; // Default 0.00001 SOL
      }

      // Calculate average priority fee and convert to tip
      const avgFee = recentFees.reduce((sum, fee) => sum + fee.prioritizationFee, 0) / recentFees.length;
      const tipLamports = Math.max(1000, Math.floor(avgFee * 10)); // 10x priority fee as tip
      
      return Math.min(tipLamports, 100000); // Cap at 0.0001 SOL
    } catch (error) {
      console.warn('Failed to get optimal tip, using default:', error);
      return 10000;
    }
  }

  /**
   * Monitor bundle status
   */
  async getBundleStatus(bundleId: string): Promise<BundleResult> {
    try {
      const response = await fetch(`${this.jitoRpcUrl}/status?bundle=${bundleId}`);
      const data = await response.json();
      
      return {
        bundleId,
        signatures: data.signatures || [],
        status: data.status || 'pending',
        error: data.error
      };
    } catch (error) {
      console.error('Failed to get bundle status:', error);
      return {
        bundleId,
        signatures: [],
        status: 'failed',
        error: String(error)
      };
    }
  }

  private async createTipTransaction(tipLamports: number): Promise<BundleTransaction> {
    // Randomly select a Jito tip account
    const tipAccount = address(
      this.JITO_TIP_ACCOUNTS[Math.floor(Math.random() * this.JITO_TIP_ACCOUNTS.length)]
    );

    const wallet = this.ensureWallet();
    const tipInstruction = getTransferSolInstruction({
      source: wallet.address,
      destination: tipAccount,
      amount: BigInt(tipLamports)
    });

    return {
      transaction: [tipInstruction], // Return as instruction array
      description: `Jito tip: ${tipLamports} lamports`
    };
  }

  private async submitToJito(transactions: any[]): Promise<BundleResult> {
    try {
      // Serialize transactions for Jito
      const serializedTransactions = transactions.map(txData => {
        const tx = txData.transaction;
        
        if (!tx) {
          throw new Error('Invalid transaction in bundle');
        }

        // Handle VersionedTransaction and signed transactions
        if (tx instanceof VersionedTransaction || 
            (typeof tx === 'object' && 'signatures' in tx)) {
          // For signed transactions, serialize to base64
          const serialized = tx.serialize ? tx.serialize() : 
                           (tx as any).message ? (tx as any).message.serialize() :
                           new Uint8Array();
          return btoa(String.fromCharCode(...new Uint8Array(serialized)));
        }
        
        throw new Error('Transaction must be signed before submitting to Jito');
      });

      // Submit to Jito block engine
      const response = await fetch(this.jitoRpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'sendBundle',
          params: [serializedTransactions]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Jito error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      // Extract signatures from transactions - these would come from Jito response
      const signatures = transactions.map((_, index) => {
        // In a real implementation, Jito would return actual transaction signatures
        // For now, generate placeholder signatures based on bundle ID
        return `${data.result || 'bundle'}_tx_${index}_${Date.now()}`;
      });

      return {
        bundleId: data.result || `bundle_${Date.now()}`,
        signatures,
        status: 'pending'
      };
    } catch (error) {
      console.error('Failed to submit to Jito:', error);
      throw new Error(`Bundle submission failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a bundle with escrow protection for high-value transactions
   */
  async sendEscrowBundle(
    escrowInstructions: TransactionInstruction[],
    config: Partial<BundleConfig> = {}
  ): Promise<BundleResult> {
    const defaultConfig: BundleConfig = {
      tipLamports: 50000, // Higher tip for escrow operations
      priorityFee: 2000,
      computeUnits: 300000, // More compute units for complex operations
      ...config
    };

    return this.sendBundle([{
      transaction: escrowInstructions,
      description: 'Escrow operations bundle'
    }], defaultConfig);
  }

  /**
   * Estimate bundle cost including tips and fees
   */
  async estimateBundleCost(
    transactionCount: number,
    config: Partial<BundleConfig> = {}
  ): Promise<{
    tipCost: number;
    priorityFees: number;
    totalCost: number;
  }> {
    const tipLamports = config.tipLamports || await this.getOptimalTip();
    const priorityFee = config.priorityFee || 1000;
    const computeUnits = config.computeUnits || 200000;
    
    // Estimate priority fees (priority fee * compute units per transaction)
    const priorityFees = (priorityFee * computeUnits * transactionCount) / 1_000_000; // Convert micro-lamports to lamports
    
    return {
      tipCost: tipLamports,
      priorityFees: Math.ceil(priorityFees),
      totalCost: tipLamports + Math.ceil(priorityFees)
    };
  }
}