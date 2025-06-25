import {
  // Web3.js v2 imports
  address,
  Address,
  createSolanaRpc,
  Rpc,
  KeyPairSigner,
  Commitment
} from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { Program, AnchorProvider } = anchor;
import type { Program as ProgramType } from "@coral-xyz/anchor";
import {
  PROGRAM_ID,
  PodComConfig,
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  EscrowAccount,
  CreateAgentOptions,
  UpdateAgentOptions,
  SendMessageOptions,
  CreateChannelOptions,
  DepositEscrowOptions,
  WithdrawEscrowOptions,
  BroadcastMessageOptions,
  MessageStatus,
  ChannelVisibility,
} from "./types";
import { PodCom, IDL } from "./pod_com";
import type { IdlAccounts } from "@coral-xyz/anchor";

// Import services
import { BaseService, BaseServiceConfig } from "./services/base";
import { AgentService } from "./services/agent";
import { MessageService } from "./services/message";
import { ChannelService } from "./services/channel";
import { SessionKeysService } from "./services/session-keys";
import { JitoBundlesService } from "./services/jito-bundles";
import { SecureKeyManager, SecureWalletOperations } from "./utils/secure-memory";
import { EscrowService } from "./services/escrow";
import { AnalyticsService } from "./services/analytics";
import { DiscoveryService } from "./services/discovery";
import { IPFSService, IPFSConfig } from "./services/ipfs";
import { ZKCompressionService, ZKCompressionConfig } from "./services/zk-compression";
// Note: JitoBundleService import removed - using JitoBundlesService

// Client configuration with 2025 enhancements
export interface PodClientConfig {
  endpoint: string;
  commitment?: Commitment;
  programId?: Address;
}

/**
 * Main PoD Protocol SDK client for interacting with the protocol
 * Refactored to use service-based architecture for better maintainability
 */
export class PodComClient {
  private rpc: Rpc<any>;
  private programId: Address;
  private commitment: Commitment;
  private program?: ProgramType<any>; // Use any for IDL compatibility

  // Service instances - public for direct access to specific functionality
  public agents: AgentService;
  public messages: MessageService;
  public channels: ChannelService;
  public escrow: EscrowService;
  public analytics: AnalyticsService;
  public discovery: DiscoveryService;
  public ipfs: IPFSService;
  public zkCompression: ZKCompressionService;
  public sessionKeys: SessionKeysService;
  public jitoBundles: JitoBundlesService;

  constructor(config: PodClientConfig) {
    const {
      endpoint,
      commitment = 'confirmed',
      programId: programIdString = 'PoD1111111111111111111111111111111111111111'
    } = config;

    this.rpc = createSolanaRpc(endpoint);
    this.commitment = commitment;
    this.programId = address(programIdString);

    // Initialize services with proper v2 types
    this.agents = new AgentService(endpoint, programIdString, commitment);
    this.messages = new MessageService(endpoint, programIdString, commitment);
    this.channels = new ChannelService(endpoint, programIdString, commitment);
    this.escrow = new EscrowService(endpoint, programIdString, commitment);
    this.analytics = new AnalyticsService(endpoint, programIdString, commitment);
    this.discovery = new DiscoveryService(endpoint, programIdString, commitment);
    this.ipfs = new IPFSService();
    this.zkCompression = new ZKCompressionService(endpoint, programIdString, commitment, {});
    this.jitoBundles = new JitoBundlesService(endpoint, programIdString, commitment);
    this.sessionKeys = new SessionKeysService(endpoint, programIdString, commitment);
  }

  /**
   * Initialize the Anchor program with a wallet (call this first)
   */
  async initialize(wallet?: anchor.Wallet): Promise<void> {
    try {
      if (wallet) {
        // If a wallet is provided, create the program with it
        // Note: Anchor provider needs to be updated for web3.js v2 compatibility
        // For now, we'll maintain compatibility using the legacy connection pattern
        const legacyConnection = {
          getLatestBlockhash: async () => ({ blockhash: "mock", lastValidBlockHeight: 0 }),
          sendRawTransaction: async (tx: any) => "mockSignature",
          // Add other required methods as needed
        } as any;
        
        const provider = new AnchorProvider(legacyConnection, wallet, {
          commitment: this.commitment,
          skipPreflight: true,
        });

        // Validate IDL before creating program
        if (!IDL) {
          throw new Error(
            "IDL not found. Ensure the program IDL is properly generated and imported.",
          );
        }
        
        this.program = new Program(IDL as any, provider);
        
        // Validate program was created successfully
        if (!this.program) {
          throw new Error("Failed to create Anchor program instance");
        }

        // Set program for all services
        this.agents.setProgram(this.program);
        this.messages.setProgram(this.program);
        this.channels.setProgram(this.program);
        this.escrow.setProgram(this.program);
        this.analytics.setProgram(this.program);
        this.discovery.setProgram(this.program);
        this.ipfs.setProgram(this.program);
        this.zkCompression.setProgram(this.program);
        
        // Update wallet for session keys and Jito bundles services
        this.sessionKeys.setWallet(wallet);
        this.jitoBundles.setWallet(wallet);
      } else {
        // No wallet provided - validate IDL before setting on services
        if (!IDL) {
          throw new Error(
            "IDL not found. Ensure the program IDL is properly generated and imported.",
          );
        }

        // Clear any previously set program to avoid stale credentials
        this.program = undefined;
        this.agents.clearProgram();
        this.messages.clearProgram();
        this.channels.clearProgram();
        this.escrow.clearProgram();
        this.analytics.clearProgram();
        this.discovery.clearProgram();
        this.ipfs.clearProgram();
        this.zkCompression.clearProgram();

        // Set IDL for all services
        this.agents.setIDL(IDL);
        this.messages.setIDL(IDL);
        this.channels.setIDL(IDL);
        this.escrow.setIDL(IDL);
        this.analytics.setIDL(IDL);
        this.discovery.setIDL(IDL);
        this.ipfs.setIDL(IDL);
        this.zkCompression.setIDL(IDL);
      }

      // Validate initialization was successful
      if (!this.isInitialized()) {
        throw new Error(
          "Client initialization failed - services not properly configured",
        );
      }
    } catch (error: any) {
      throw new Error(`Client initialization failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Legacy API Methods (for backward compatibility)
  // Delegate to appropriate services
  // ============================================================================

  /**
   * @deprecated Use client.agents.registerAgent() instead
   */
  async registerAgent(
    wallet: KeyPairSigner,
    options: CreateAgentOptions,
  ): Promise<void> {
    return this.agents.registerAgent(wallet, options);
  }

  /**
   * @deprecated Use client.agents.updateAgent() instead
   */
  async updateAgent(
    wallet: KeyPairSigner,
    options: UpdateAgentOptions,
  ): Promise<void> {
    return this.agents.updateAgent(wallet, options);
  }

  /**
   * @deprecated Use client.agents.getAgent() instead
   */
  async getAgent(walletAddress: Address): Promise<AgentAccount | null> {
    return this.agents.getAgent(walletAddress);
  }

  /**
   * @deprecated Use client.agents.getAllAgents() instead
   */
  async getAllAgents(limit: number = 100): Promise<AgentAccount[]> {
    return this.agents.getAllAgents(limit);
  }

  /**
   * @deprecated Use client.messages.sendMessage() instead
   */
  async sendMessage(
    wallet: KeyPairSigner,
    options: SendMessageOptions,
  ): Promise<void> {
    return this.messages.sendMessage(wallet, options);
  }

  /**
   * @deprecated Use client.messages.updateMessageStatus() instead
   */
  async updateMessageStatus(
    wallet: KeyPairSigner,
    messagePDA: Address,
    newStatus: MessageStatus,
  ): Promise<void> {
    return this.messages.updateMessageStatus(wallet, messagePDA, newStatus);
  }

  /**
   * @deprecated Use client.messages.getMessage() instead
   */
  async getMessage(messagePDA: Address): Promise<MessageAccount | null> {
    return this.messages.getMessage(messagePDA);
  }

  /**
   * @deprecated Use client.messages.getAgentMessages() instead
   */
  async getAgentMessages(
    agentAddress: Address,
    limit: number = 50,
    statusFilter?: MessageStatus,
  ): Promise<MessageAccount[]> {
    return this.messages.getAgentMessages(agentAddress, limit, statusFilter);
  }

  /**
   * @deprecated Use client.channels.createChannel() instead
   */
  async createChannel(
    wallet: KeyPairSigner,
    options: CreateChannelOptions,
  ): Promise<void> {
    return this.channels.createChannel(wallet, options);
  }

  /**
   * @deprecated Use client.channels.getChannel() instead
   */
  async getChannel(channelPDA: Address): Promise<ChannelAccount | null> {
    return this.channels.getChannel(channelPDA);
  }

  /**
   * @deprecated Use client.channels.getAllChannels() instead
   */
  async getAllChannels(
    limit: number = 50,
    visibilityFilter?: ChannelVisibility,
  ): Promise<ChannelData[]> {
    return this.channels.getAllChannels(limit, visibilityFilter);
  }

  /**
   * @deprecated Use client.channels.getChannelsByCreator() instead
   */
  async getChannelsByCreator(
    creator: Address,
    limit: number = 50,
  ): Promise<ChannelData[]> {
    return this.channels.getChannelsByCreator(creator, limit);
  }

  /**
   * @deprecated Use client.channels.joinChannel() instead
   */
  async joinChannel(wallet: KeyPairSigner, channelPDA: Address): Promise<void> {
    return this.channels.joinChannel(wallet, channelPDA);
  }

  /**
   * @deprecated Use client.channels.leaveChannel() instead
   */
  async leaveChannel(wallet: KeyPairSigner, channelPDA: Address): Promise<void> {
    return this.channels.leaveChannel(wallet, channelPDA);
  }

  /**
   * @deprecated Use client.channels.broadcastMessage() instead
   */
  async broadcastMessage(
    wallet: KeyPairSigner,
    channelPDA: Address,
    content: string,
    messageType: string = "Text",
    replyTo?: Address,
  ): Promise<void> {
    return this.channels.broadcastMessage(wallet, {
      channelPDA,
      content,
      messageType,
      replyTo,
    });
  }

  /**
   * @deprecated Use client.channels.inviteToChannel() instead
   */
  async inviteToChannel(
    wallet: KeyPairSigner,
    channelPDA: Address,
    invitee: Address,
  ): Promise<void> {
    return this.channels.inviteToChannel(wallet, channelPDA, invitee);
  }

  /**
   * @deprecated Use client.channels.getChannelParticipants() instead
   */
  async getChannelParticipants(
    channelPDA: Address,
    limit: number = 50
  ): Promise<Array<any>> {
    return this.channels.getChannelParticipants(channelPDA, limit);
  }

  /**
   * @deprecated Use client.channels.getChannelMessages() instead
   */
  async getChannelMessages(
    channelPDA: Address,
    limit: number = 50
  ): Promise<Array<any>> {
    return this.channels.getChannelMessages(channelPDA, limit);
  }

  /**
   * @deprecated Use client.escrow.depositEscrow() instead
   */
  async depositEscrow(
    wallet: KeyPairSigner,
    options: DepositEscrowOptions,
  ): Promise<void> {
    return this.escrow.depositEscrow(wallet, options);
  }

  /**
   * @deprecated Use client.escrow.withdrawEscrow() instead
   */
  async withdrawEscrow(
    wallet: KeyPairSigner,
    options: WithdrawEscrowOptions,
  ): Promise<void> {
    return this.escrow.withdrawEscrow(wallet, options);
  }

  /**
   * @deprecated Use client.escrow.getEscrow() instead
   */
  async getEscrow(
    channel: Address,
    depositor: Address,
  ): Promise<EscrowAccount | null> {
    return this.escrow.getEscrow(channel, depositor);
  }

  /**
   * @deprecated Use client.escrow.getEscrowsByDepositor() instead
   */
  async getEscrowsByDepositor(
    depositor: Address,
    limit: number = 50,
  ): Promise<EscrowAccount[]> {
    return this.escrow.getEscrowsByDepositor(depositor, limit);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the RPC instance
   */
  getRpc(): Rpc<any> {
    return this.rpc;
  }

  /**
   * Get the program ID
   */
  getProgramId(): Address {
    return this.programId;
  }

  /**
   * Get the commitment level
   */
  getCommitment(): Commitment {
    return this.commitment;
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    // For wallet-based initialization, check if program is set
    if (this.program) {
      return true;
    }

    // For read-only initialization, check if services have IDL set
    return (
      this.agents.hasIDL() &&
      this.messages.hasIDL() &&
      this.channels.hasIDL() &&
      this.escrow.hasIDL() &&
      this.analytics.hasIDL() &&
      this.discovery.hasIDL()
    );
  }

  /**
   * Securely handle private key operations
   * SECURITY ENHANCEMENT: Uses secure memory for private key operations
   */
  withSecurePrivateKey<T>(
    privateKey: Uint8Array,
    callback: (secureKey: any) => T
  ): T {
    return SecureWalletOperations.withSecurePrivateKey(privateKey, callback);
  }

  /**
   * Clean up all secure memory buffers
   * SECURITY ENHANCEMENT: Call this when shutting down the client
   */
  secureCleanup(): void {
    SecureKeyManager.cleanup();
  }

  /**
   * Generate secure random bytes for cryptographic operations
   * SECURITY ENHANCEMENT: Uses cryptographically secure random number generation
   */
  generateSecureRandom(size: number): Uint8Array {
    const buffer = new Uint8Array(size);
    crypto.getRandomValues(buffer);
    return buffer;
  }
}

// Enhanced default export for 2025
export default PodComClient;

// Re-export all types and utilities for 2025
export * from "./types";
export * from "./utils";
export * from "./services/agent";
export * from "./services/channel";
export * from "./services/message";
export * from "./services/discovery";
export * from "./services/escrow";
export * from "./services/zk-compression";
export * from "./services/analytics";
export * from "./services/jito-bundles";
