/**
 * Main entry point for PoD Protocol JavaScript SDK
 * 
 * @fileoverview Provides a complete JavaScript SDK for interacting with the PoD Protocol
 * Compatible with Web3.js v2.0 and legacy Anchor patterns
 */

// Core services
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

// Core Solana imports (legacy for Anchor compatibility)
import { Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

// Utilities and helpers
import { loadIDL, validateConfig } from './utils/index.js';

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

    // Create legacy connection for Anchor compatibility
    this.connection = new Connection(this.endpoint, {
      commitment: this.commitment,
    });
    
    // Create service configuration
    const serviceConfig = {
      connection: this.connection,
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
      
      // Create provider with proper connection
      const provider = new AnchorProvider(
        this.connection,
        wallet,
        {
          commitment: this.commitment,
          preflightCommitment: this.commitment,
        }
      );

      // Initialize program
      this.program = new Program(idl, provider);

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
   * @returns {Connection} Solana connection
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Get the current program instance
   * @returns {Program|null} Anchor program instance
   */
  getProgram() {
    return this.program;
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Cleanup all services
    await Promise.all([
      this.agent.cleanup?.(),
      this.message.cleanup?.(),
      this.channel.cleanup?.(),
      this.escrow.cleanup?.(),
      this.analytics.cleanup?.(),
      this.discovery.cleanup?.(),
      this.ipfs.cleanup?.(),
      this.zkCompression.cleanup?.(),
      this.jitoBundles.cleanup?.(),
      this.sessionKeys.cleanup?.(),
    ]);
  }
}

// Export the main client as default
export { PodProtocolClient };

// Export services for direct use
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

// Re-export types and constants
export * from './types.js';

// Legacy export for backward compatibility
export const PodComClient = PodProtocolClient;
