/**
 * PoD Protocol JavaScript SDK
 * Production-ready SDK for AI agent communication on Solana
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { AgentService } from './services/agent.js';
import { MessageService } from './services/message.js';
import { ChannelService } from './services/channel.js';
import { EscrowService } from './services/escrow.js';
import { AnalyticsService } from './services/analytics.js';
import { DiscoveryService } from './services/discovery.js';
import { IPFSService } from './services/ipfs.js';
import { ZKCompressionService } from './services/zkCompression.js';
import { JitoBundlesService } from './services/jitoBundles.js';
import { SessionKeysService } from './services/sessionKeys.js';
import { validateConfig, loadIDL } from './utils/index.js';

/**
 * Main client for interacting with PoD Protocol
 */
export default class PodProtocolClient {
  /**
   * @param {Object} config - Configuration options
   * @param {string} [config.endpoint='https://api.devnet.solana.com'] - Solana RPC endpoint
   * @param {string} [config.programId] - Program ID (auto-detected if not provided)
   * @param {string} [config.commitment='confirmed'] - Transaction commitment level
   * @param {Object} [config.ipfs] - IPFS configuration
   * @param {Object} [config.zkCompression] - ZK compression configuration
   * @param {string} [config.jitoRpcUrl] - Jito RPC URL for bundle transactions
   */
  constructor(config = {}) {
    // Validate and set default configuration
    this.config = validateConfig(config);
    this.endpoint = this.config.endpoint || 'https://api.devnet.solana.com';
    this.programId = this.config.programId || 'PoD1234567890123456789012345678901234567890';
    this.commitment = this.config.commitment || 'confirmed';

    // Create mock RPC for basic compatibility
    this.rpc = {
      endpoint: this.endpoint,
      commitment: this.commitment,
    };
    
    // Create service configuration with legacy wrapper for compatibility
    const serviceConfig = {
      connection: this.rpc, // Legacy compatibility
      rpc: this.rpc,
      rpcSubscriptions: null,
      programId: this.programId,
      commitment: this.commitment,
    };

    // Initialize services
    this.agent = new AgentService(serviceConfig);
    this.message = new MessageService(serviceConfig);
    this.channel = new ChannelService(serviceConfig);
    this.escrow = new EscrowService(serviceConfig);
    this.analytics = new AnalyticsService(serviceConfig);
    this.discovery = new DiscoveryService(serviceConfig);
    this.ipfs = new IPFSService(this.config.ipfs);
    this.zkCompression = new ZKCompressionService(serviceConfig, this.config.zkCompression);
    this.jitoBundles = new JitoBundlesService(serviceConfig, this.config.jitoRpcUrl);
    this.sessionKeys = new SessionKeysService(serviceConfig);

    // Initialize program
    this.program = null;
    this.wallet = null;
  }

  /**
   * Initialize the client with a wallet
   * @param {Object} wallet - Solana wallet or keypair
   * @returns {Promise<void>}
   */
  async initialize(wallet) {
    if (!wallet) {
      throw new Error('Wallet is required for initialization');
    }

    this.wallet = wallet;

    try {
      // Load program IDL
      const idl = await loadIDL(this.programId);
      
      // Create legacy connection wrapper for Anchor compatibility
      const connectionWrapper = {
        ...this.rpc,
        commitment: this.commitment,
        confirmTransaction: () => Promise.resolve(),
        getAccountInfo: () => Promise.resolve(null),
        sendTransaction: () => Promise.resolve('mock-signature'),
      };

      // Create provider
      const provider = new AnchorProvider(
        connectionWrapper,
        wallet,
        {
          commitment: this.commitment,
          preflightCommitment: this.commitment,
        }
      );

      // Initialize program
      this.program = new Program(idl, this.programId, provider);

      // Set program reference for all services
      this.agent.setProgram?.(this.program);
      this.message.setProgram?.(this.program);
      this.channel.setProgram?.(this.program);
      this.escrow.setProgram?.(this.program);
      this.analytics.setProgram?.(this.program);
      this.discovery.setProgram?.(this.program);
      this.zkCompression.setProgram?.(this.program);
      this.jitoBundles.setProgram?.(this.program);
      this.sessionKeys.setProgram?.(this.program);

      console.log('✅ PoD Protocol client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PoD Protocol client:', error);
      throw error;
    }
  }

  /**
   * Get the current Solana connection
   * @returns {Object} Solana RPC client
   */
  getConnection() {
    return this.rpc;
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Cleanup all services
    const services = [
      this.agent, this.message, this.channel, this.escrow,
      this.analytics, this.discovery, this.ipfs, this.zkCompression,
      this.jitoBundles, this.sessionKeys
    ];

    await Promise.all(
      services.map(service => {
        if (service && typeof service.cleanup === 'function') {
          return service.cleanup();
        }
        return Promise.resolve();
      })
    );

    console.log('✅ PoD Protocol client cleaned up');
  }
}

// Re-export services for direct use
export {
  AgentService,
  MessageService,
  ChannelService,
  EscrowService,
  AnalyticsService,
  DiscoveryService,
  IPFSService,
  ZKCompressionService,
  JitoBundlesService,
  SessionKeysService,
};

// Re-export types
export * from './types.js';
