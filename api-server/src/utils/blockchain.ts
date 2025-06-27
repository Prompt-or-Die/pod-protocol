import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../lib/logger.js';

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

export interface BlockchainAgent {
  publicKey: string;
  name: string;
  description?: string;
  capabilities: string[];
  owner: string;
  status: 'active' | 'inactive';
  transactionSignature?: string;
  blockNumber?: number;
  createdAt: Date;
  lastActiveAt?: Date;
}

export class BlockchainService {
  /**
   * Get agents from blockchain (currently returns example data)
   */
  static async getAgentsFromBlockchain(options: {
    owner?: string;
    limit?: number;
    offset?: number;
  }): Promise<BlockchainAgent[]> {
    try {
      logger.info('Fetching agents from blockchain');
      
      // TODO: Replace with real PoD SDK calls once properly configured
      return [
        {
          publicKey: '11111111111111111111111111111112',
          name: 'Example Trading Agent',
          description: 'A sample trading agent',
          capabilities: ['trading', 'analysis'],
          owner: options.owner || '11111111111111111111111111111112',
          status: 'active',
          createdAt: new Date(),
          lastActiveAt: new Date()
        }
      ];
    } catch (error) {
      logger.error('Error fetching agents from blockchain:', error);
      return [];
    }
  }

  /**
   * Get account balance and transaction history
   */
  static async getAccountInfo(publicKey: string) {
    try {
      const pubkey = new PublicKey(publicKey);
      
      const [accountInfo, recentTransactions] = await Promise.all([
        connection.getAccountInfo(pubkey),
        connection.getSignaturesForAddress(pubkey, { limit: 10 })
      ]);

      return {
        balance: accountInfo ? accountInfo.lamports / 1e9 : 0,
        isActive: !!accountInfo,
        recentTransactions: recentTransactions.map(tx => ({
          signature: tx.signature,
          slot: tx.slot,
          blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
          confirmationStatus: tx.confirmationStatus
        }))
      };
    } catch (error) {
      logger.error('Error fetching account info:', error);
      return {
        balance: 0,
        isActive: false,
        recentTransactions: []
      };
    }
  }

  /**
   * Get network status and health
   */
  static async getNetworkStatus() {
    try {
      const [slot, epochInfo] = await Promise.all([
        connection.getSlot(),
        connection.getEpochInfo()
      ]);

      return {
        healthy: slot > 0,
        currentSlot: slot,
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch
      };
    } catch (error) {
      logger.error('Error fetching network status:', error);
      return {
        healthy: false,
        currentSlot: 0,
        epoch: 0,
        slotIndex: 0,
        slotsInEpoch: 0
      };
    }
  }
}

export { connection }; 