import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { IAgentRuntime } from "@elizaos/core";
import { PodProtocolConfig, PodAgent, PodMessage, PodChannel, PodEscrow } from "../types.js";

/**
 * BlockchainService handles direct Solana blockchain interactions
 * for the PoD Protocol plugin
 */
export class BlockchainService {
  private connection: Connection;
  private config: PodProtocolConfig;
  private keypair: Keypair;
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime, config: PodProtocolConfig, keypair: Keypair) {
    this.runtime = runtime;
    this.config = config;
    this.keypair = keypair;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
  }

  /**
   * Get the public key of the agent's wallet
   */
  getWalletPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  /**
   * Get the connection to the Solana network
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Register an agent on the PoD Protocol
   * Simplified implementation using direct Solana transactions
   */
  async registerAgent(agentData: {
    name: string;
    capabilities: string[];
    framework: string;
  }): Promise<{ agentId: string; transactionHash: string }> {
    try {
      // Create a basic system program transaction as a placeholder
      // In a real implementation, this would interact with the PoD Protocol smart contract
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey, // Self-transfer for demo
          lamports: 1000, // Minimal amount
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);
      await this.connection.confirmTransaction(signature);

      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        agentId,
        transactionHash: signature,
      };
    } catch (error) {
      console.error("Agent registration error:", error);
      throw new Error(`Failed to register agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a message on the PoD Protocol
   * Simplified implementation
   */
  async sendMessage(recipientId: string, content: string): Promise<{ messageId: string; transactionHash: string }> {
    try {
      // Create a basic transaction as placeholder
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey,
          lamports: 1000,
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);
      await this.connection.confirmTransaction(signature);

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        messageId,
        transactionHash: signature,
      };
    } catch (error) {
      console.error("Message sending error:", error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a channel on the PoD Protocol
   * Simplified implementation
   */
  async createChannel(channelData: {
    name: string;
    description: string;
    isPrivate: boolean;
    escrowAmount?: number;
  }): Promise<{ channelId: string; transactionHash: string }> {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey,
          lamports: (channelData.escrowAmount || 0) * 1000000000, // Convert SOL to lamports
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);
      await this.connection.confirmTransaction(signature);

      const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        channelId,
        transactionHash: signature,
      };
    } catch (error) {
      console.error("Channel creation error:", error);
      throw new Error(`Failed to create channel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Join a channel on the PoD Protocol
   * Simplified implementation
   */
  async joinChannel(channelId: string): Promise<{ success: boolean; transactionHash: string }> {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey,
          lamports: 1000,
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);
      await this.connection.confirmTransaction(signature);

      return {
        success: true,
        transactionHash: signature,
      };
    } catch (error) {
      console.error("Channel join error:", error);
      throw new Error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create an escrow transaction
   * Simplified implementation
   */
  async createEscrow(escrowData: {
    counterpartyId: string;
    amount: number;
    service: string;
    deliverables: string[];
  }): Promise<{ escrowId: string; transactionHash: string }> {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey,
          lamports: escrowData.amount * 1000000000, // Convert SOL to lamports
        })
      );

      const signature = await this.connection.sendTransaction(transaction, [this.keypair]);
      await this.connection.confirmTransaction(signature);

      const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        escrowId,
        transactionHash: signature,
      };
    } catch (error) {
      console.error("Escrow creation error:", error);
      throw new Error(`Failed to create escrow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get network statistics
   * Uses real Solana network data
   */
  async getNetworkStats(): Promise<{
    blockHeight: number;
    totalSupply: number;
    transactionCount: number;
    health: string;
  }> {
    try {
      const [blockHeight, supply] = await Promise.all([
        this.connection.getBlockHeight(),
        this.connection.getSupply(),
      ]);

      return {
        blockHeight,
        totalSupply: supply.value.total,
        transactionCount: blockHeight * 1000, // Estimate
        health: "healthy",
      };
    } catch (error) {
      console.error("Network stats error:", error);
      return {
        blockHeight: 0,
        totalSupply: 0,
        transactionCount: 0,
        health: "unhealthy",
      };
    }
  }

  /**
   * Check wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
      console.error("Balance check error:", error);
      return 0;
    }
  }

  /**
   * Validate if a public key is valid
   */
  isValidPublicKey(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
} 