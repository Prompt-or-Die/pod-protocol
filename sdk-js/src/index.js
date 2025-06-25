/**
 * PoD Protocol JavaScript SDK
 * 
 * A comprehensive JavaScript SDK for interacting with the PoD Protocol
 * (Prompt or Die) AI Agent Communication Protocol on Solana.
 * 
 * @author PoD Protocol Team
 * @version 1.5.0
 */

import { Address, address } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { AgentService } from './services/agent.js';
import { MessageService } from './services/message.js';
import { ChannelService } from './services/channel.js';
import { EscrowService } from './services/escrow.js';
import { AnalyticsService } from './services/analytics.js';
import { DiscoveryService } from './services/discovery.js';
import { IPFSService } from './services/ipfs.js';
import { ZKCompressionService } from './services/zkCompression.js';
import { SessionKeysService } from './services/sessionKeys.js';
import { JitoBundlesService } from './services/jitoBundles.js';
import { SecureMemoryManager } from './utils/secureMemory.js';
import { PROGRAM_ID, MessageType, MessageStatus, ChannelVisibility, AGENT_CAPABILITIES } from './types.js';

/**
 * Main PoD Protocol SDK client for JavaScript applications
 * 
 * @class PodComClient
 * @example
 * ```javascript
 * import { PodComClient } from '@pod-protocol/sdk-js';
 * import { Rpc, createSolanaRpc } from '@solana/web3.js';
 * 
 * const connection = new Rpc('https://api.devnet.solana.com');
 * const wallet = KeyPairSigner.generate();
 * 
 * const client = new PodComClient({
 *   endpoint: 'https://api.devnet.solana.com',
 *   commitment: 'confirmed'
 * });
 * 
 * await client.initialize(wallet);
 * 
 * // Register an agent
 * const agent = await client.agents.register({
 *   capabilities.ANALYSIS | AGENT_CAPABILITIES.TRADING,
 *   metadataUri: 'https://my-agent-metadata.json'
 * }, wallet);
 * ```
 */
export class PodComClient {
  /**
   * @param {Object} config - Configuration object
   * @param {string} [config.endpoint='https://api.devnet.solana.com'] - Solana RPC endpoint
   * @param {Address} [config.programId] - Program ID (defaults to devnet)
   * @param {string} [config.commitment='confirmed'] - Commitment level
   * @param {Object} [config.ipfs] - IPFS configuration
   * @param {Object} [config.zkCompression] - ZK compression configuration
   */
  constructor(config = {}) {
    this.connection = new Rpc(
      config.endpoint || 'https://api.devnet.solana.com',
      config.commitment || 'confirmed'
    );
    
    this.programId = config.programId || PROGRAM_ID;
    this.commitment = config.commitment || 'confirmed';
    this.program = null;
    
    // Initialize secure memory manager
    this.secureMemory = new SecureMemoryManager();
    
    // Initialize services
    const serviceConfig = {
      connection.connection,
      programId.programId,
      commitment.commitment
    };
    
    this.agents = new AgentService(serviceConfig);
    this.messages = new MessageService(serviceConfig);
    this.channels = new ChannelService(serviceConfig);
    this.escrow = new EscrowService(serviceConfig);
    this.analytics = new AnalyticsService(serviceConfig);
    this.discovery = new DiscoveryService(serviceConfig);
    this.ipfs = new IPFSService(serviceConfig, config.ipfs || {});
    this.zkCompression = new ZKCompressionService(
      serviceConfig,
      config.zkCompression || {},
      this.ipfs
    );
    this.sessionKeys = new SessionKeysService(serviceConfig);
    this.jitoBundles = new JitoBundlesService(serviceConfig, config.jitoRpcUrl);
  }

  /**
   * Initialize the client with a wallet
   * Must be called before using wallet-dependent operations
   * 
   * @param {KeyPairSigner|Wallet} wallet - Solana wallet or keypair
   * @returns {Promise}
   * 
   * @example
   * ```javascript
   * const wallet = KeyPairSigner.generate();
   * await client.initialize(wallet);
   * ```
   */
  async initialize(wallet) {
    try {
      if (wallet) {
        // Create wallet adapter if needed
        const walletAdapter = wallet.publicKey ? wallet  Wallet(wallet);
        
        // Create provider and program
        const provider = new AnchorProvider(
          this.connection,
          walletAdapter,
          {
            commitment.commitment,
            skipPreflight
          }
        );
        
        // Load program IDL (would need to be imported or fetched)
        const idl = await this._loadProgramIdl();
        this.program = new Program(idl, this.programId, provider);
        
        // Initialize services with program
        await this._initializeServices(this.program);
        
        // Set wallet for services that need it
        this.sessionKeys.setWallet(walletAdapter);
        this.jitoBundles.setWallet(walletAdapter);
      } else {
        // Read-only mode - fetch IDL and create program without wallet
        const idl = await this._loadProgramIdl();
        this.program = new Program(idl, this.programId, null);
        await this._initializeServices(this.program);
      }
    } catch (error) {
      throw new Error(`Failed to initialize client: ${error.message}`);
    }
  }

  /**
   * Load the program IDL
   * @private
   */
  async _loadProgramIdl() {
    // In a real implementation, this would fetch the IDL from the program
    // or include it as a static import. For now, we'll use a placeholder.
    throw new Error('Program IDL loading not implemented. Please provide IDL in initialization.');
  }

  /**
   * Initialize all services with the program instance
   * @private
   */
  async _initializeServices(program) {
    this.agents.setProgram(program);
    this.messages.setProgram(program);
    this.channels.setProgram(program);
    this.escrow.setProgram(program);
    this.analytics.setProgram(program);
    this.discovery.setProgram(program);
    this.ipfs.setProgram(program);
    this.zkCompression.setProgram(program);
    this.sessionKeys.setProgram(program);
    this.jitoBundles.setProgram(program);
  }

  /**
   * Get connection info
   * @returns {Object} Rpc information
   */
  getRpcInfo() {
    return {
      endpoint.connection.rpcEndpoint,
      commitment.commitment,
      programId.programId
    };
  }

  /**
   * Check if client is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.program !== null;
  }

  /**
   * Clean up secure memory and resources
   * Call this when done with the client
   */
  async cleanup() {
    if (this.secureMemory) {
      this.secureMemory.cleanup();
    }
    
    // Cleanup services
    const services = [
      this.agents, this.messages, this.channels, this.escrow,
      this.analytics, this.discovery, this.ipfs, this.zkCompression,
      this.sessionKeys, this.jitoBundles
    ];
    
    for (const service of services) {
      if (service.cleanup) {
        await service.cleanup();
      }
    }
  }

  /**
   * Get the program instance
   * @returns {Program|null} Anchor program instance
   */
  getProgram() {
    return this.program;
  }

  /**
   * Get the connection instance
   * @returns {Rpc} Solana connection
   */
  getRpc() {
    return this.connection;
  }
}

// Export everything
// Re-export utilities for convenience
export * from './utils/index.js';

export {
  // Core types and constants
  PROGRAM_ID,
  MessageType,
  MessageStatus,
  ChannelVisibility,
  AGENT_CAPABILITIES,
  
  // Services
  AgentService,
  MessageService,
  ChannelService,
  EscrowService,
  AnalyticsService,
  DiscoveryService,
  IPFSService,
  ZKCompressionService,
  SessionKeysService,
  JitoBundlesService,
  
  // Utilities
  SecureMemoryManager
};

export default PodComClient;
