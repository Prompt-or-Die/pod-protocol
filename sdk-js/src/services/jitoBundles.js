/**
 * Jito Bundles Service for PoD Protocol JavaScript SDK
 * 
 * Provides transaction bundling and MEV protection for AI agent interactions
 * Optimizes transaction processing and provides atomic execution guarantees
 */

import { 
  Transaction, 
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  Keypair,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { BaseService } from './base.js';

/**
 * Service for managing Jito bundles for optimized transaction processing
 * 
 * @class JitoBundlesService
 * @extends BaseService
 */
export class JitoBundlesService extends BaseService {
  constructor(config, jitoRpcUrl) {
    super(config);
    
    this.JITO_TIP_ACCOUNTS = [
      'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
      'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', 
      '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
      'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
      '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'
    ];

    this.jitoRpcUrl = jitoRpcUrl || 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
    this.wallet = null;
  }

  /**
   * Set the wallet for this service
   * 
   * @param {Keypair|Wallet} wallet - Wallet to use for signing
   */
  setWallet(wallet) {
    this.wallet = wallet;
  }

  /**
   * Ensure wallet is set
   * @private
   */
  ensureWallet() {
    if (!this.wallet) {
      throw new Error('Wallet not set. Call setWallet() first.');
    }
    return this.wallet;
  }

  /**
   * Create and send a Jito bundle
   * 
   * @param {Object[]} transactions - Array of bundle transactions
   * @param {Transaction|VersionedTransaction} transactions[].transaction - Transaction to include
   * @param {Keypair[]} [transactions[].signers] - Optional signers
   * @param {string} [transactions[].description] - Description for logging
   * @param {Object} config - Bundle configuration
   * @param {number} config.tipLamports - Tip amount in lamports (minimum 1000)
   * @param {number} [config.maxTransactions=5] - Maximum transactions in bundle
   * @param {number} [config.priorityFee] - Priority fee in micro-lamports
   * @param {number} [config.computeUnits] - Compute unit limit
   * @returns {Promise<Object>} Bundle result with ID and signatures
   * 
   * @example
   * ```javascript
   * const result = await client.jitoBundles.sendBundle([
   *   {
   *     transaction: sendMessageTx,
   *     description: 'Send AI agent message'
   *   }
   * ], {
   *   tipLamports: 10000,
   *   priorityFee: 1000
   * });
   * ```
   */
  async sendBundle(transactions, config) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

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
            const computeInstructions = [];
            
            if (config.computeUnits) {
              computeInstructions.push(
                ComputeBudgetProgram.setComputeUnitLimit({
                  units: config.computeUnits
                })
              );
            }
            
            if (config.priorityFee) {
              computeInstructions.push(
                ComputeBudgetProgram.setComputeUnitPrice({
                  microLamports: config.priorityFee
                })
              );
            }

            if (tx instanceof Transaction) {
              tx = new Transaction().add(...computeInstructions, ...tx.instructions);
            }
          }

          // Get recent blockhash
          const { blockhash } = await this.connection.getLatestBlockhash();
          
          if (tx instanceof Transaction) {
            const wallet = this.ensureWallet();
            tx.recentBlockhash = blockhash;
            tx.feePayer = wallet.publicKey;
            
            // Sign transaction
            if (bundleTx.signers && bundleTx.signers.length > 0) {
              tx.partialSign(...bundleTx.signers);
            }
            
            // Sign with wallet if it has signTransaction method
            if (wallet.signTransaction && typeof wallet.signTransaction === 'function') {
              tx = await wallet.signTransaction(tx);
            } else {
              // For Keypair/Signer, use partial sign
              tx.partialSign(wallet);
            }
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
   * 
   * @param {TransactionInstruction[]} messageInstructions - Message instructions
   * @param {Object} [config] - Bundle configuration
   * @returns {Promise<Object>} Bundle result
   * 
   * @example
   * ```javascript
   * const result = await client.jitoBundles.sendMessagingBundle([
   *   sendMessageInstruction,
   *   updateStatusInstruction
   * ]);
   * ```
   */
  async sendMessagingBundle(messageInstructions, config = {}) {
    const defaultConfig = {
      tipLamports: 10000, // 0.00001 SOL tip
      priorityFee: 1000, // 1000 micro-lamports
      computeUnits: 200000, // 200k compute units
      ...config
    };

    // Group instructions into transactions (max 5 per bundle)
    const transactions = [];
    
    for (let i = 0; i < messageInstructions.length; i += 3) {
      const chunk = messageInstructions.slice(i, i + 3);
      const transaction = new Transaction().add(...chunk);
      
      transactions.push({
        transaction,
        description: `Message batch ${Math.floor(i / 3) + 1}`
      });

      // Jito bundles have max 5 transactions
      if (transactions.length >= 4) break;
    }

    return this.sendBundle(transactions, defaultConfig);
  }

  /**
   * Create a bundle for channel operations
   * 
   * @param {TransactionInstruction[]} channelInstructions - Channel instructions
   * @param {Object} [config] - Bundle configuration
   * @returns {Promise<Object>} Bundle result
   * 
   * @example
   * ```javascript
   * const result = await client.jitoBundles.sendChannelBundle([
   *   createChannelInstruction,
   *   joinChannelInstruction
   * ]);
   * ```
   */
  async sendChannelBundle(channelInstructions, config = {}) {
    const defaultConfig = {
      tipLamports: 15000, // 0.000015 SOL tip
      priorityFee: 1500,
      computeUnits: 300000,
      ...config
    };

    const transactions = channelInstructions.map((instruction, index) => ({
      transaction: new Transaction().add(instruction),
      description: `Channel operation ${index + 1}`
    }));

    return this.sendBundle(transactions, defaultConfig);
  }

  /**
   * Get optimal tip amount based on network conditions
   * 
   * @returns {Promise<number>} Recommended tip in lamports
   * 
   * @example
   * ```javascript
   * const optimalTip = await client.jitoBundles.getOptimalTip();
   * ```
   */
  async getOptimalTip() {
    try {
      // Get recent blockhash to estimate network congestion
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Simple heuristic: higher tip during congestion
      // In a real implementation, this would query Jito's API for current tips
      const baseTip = 10000; // 0.00001 SOL
      const congestionMultiplier = 1.5; // Assume some congestion
      
      return Math.floor(baseTip * congestionMultiplier);
    } catch (error) {
      console.warn('Failed to get optimal tip, using default:', error);
      return 10000; // Default tip
    }
  }

  /**
   * Get bundle status from Jito
   * 
   * @param {string} bundleId - Bundle ID to check
   * @returns {Promise<Object>} Bundle status
   * 
   * @example
   * ```javascript
   * const status = await client.jitoBundles.getBundleStatus(bundleId);
   * console.log('Bundle status:', status.status);
   * ```
   */
  async getBundleStatus(bundleId) {
    try {
      const response = await fetch(`${this.jitoRpcUrl}/bundles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Jito API error: ${data.error.message}`);
      }

      const bundleStatus = data.result?.value?.[0];
      
      return {
        bundleId,
        status: bundleStatus?.confirmation_status || 'unknown',
        signatures: bundleStatus?.transactions || [],
        error: bundleStatus?.err || null
      };
    } catch (error) {
      console.error('Failed to get bundle status:', error);
      throw error;
    }
  }

  /**
   * Create tip transaction for Jito bundle
   * @private
   */
  async createTipTransaction(tipLamports) {
    const wallet = this.ensureWallet();
    
    // Select random tip account
    const tipAccountIndex = Math.floor(Math.random() * this.JITO_TIP_ACCOUNTS.length);
    const tipAccount = new PublicKey(this.JITO_TIP_ACCOUNTS[tipAccountIndex]);

    const tipInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: tipAccount,
      lamports: tipLamports
    });

    return {
      transaction: new Transaction().add(tipInstruction),
      description: `Jito tip: ${tipLamports} lamports`
    };
  }

  /**
   * Submit bundle to Jito
   * @private
   */
  async submitToJito(transactions) {
    try {
      // Serialize transactions
      const serializedTxs = transactions.map(tx => {
        const serialized = tx.transaction.serialize();
        return Array.from(serialized);
      });

      const response = await fetch(this.jitoRpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [serializedTxs]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Jito submission failed: ${data.error.message}`);
      }

      // Extract signatures from transactions
      const signatures = transactions.map(tx => {
        const signature = tx.transaction.signature;
        return signature ? Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('') : 'unknown';
      });

      return {
        bundleId: data.result,
        signatures,
        status: 'pending'
      };
    } catch (error) {
      console.error('Jito submission error:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear any stored data if needed
    this.wallet = null;
  }
} 