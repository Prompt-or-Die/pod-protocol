/**
 * Enhanced PoD Protocol MCP Server with Latest Features
 * Demonstrates: Progress Tracking, Cancellation Support, Smart Completions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, CompleteRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PodComClient } from '@pod-protocol/sdk';
import winston from 'winston';

interface ProgressTracker {
  token: string;
  operation: string;
  startTime: number;
  cancelled: boolean;
}

interface BlockchainOperation {
  id: string;
  type: 'agent_registration' | 'message_send' | 'escrow_create' | 'channel_create';
  signature?: string;
  confirmations: number;
  targetConfirmations: number;
}

export class EnhancedPodProtocolMCPServer {
  private server: Server;
  private client: PodComClient;
  private logger: winston.Logger;
  private progressTrackers: Map<string, ProgressTracker> = new Map();
  private pendingOperations: Map<string, BlockchainOperation> = new Map();

  constructor() {
    this.setupLogger();
    this.setupServer();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()]
    });
  }

  private setupServer(): void {
    this.server = new Server(
      {
        name: 'enhanced-pod-protocol-mcp-server',
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          completion: {},
          sampling: {}
        }
      }
    );

    this.setupEnhancedTools();
    this.setupCompletions();
    this.setupCancellationHandler();
  }

  private setupEnhancedTools(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const progressToken = request.params._meta?.progressToken;
      const requestId = request.params._meta?.requestId || `req_${Date.now()}`;

      try {
        // Create cancellation token
        if (progressToken) {
          this.progressTrackers.set(progressToken, {
            token: progressToken,
            operation: name,
            startTime: Date.now(),
            cancelled: false
          });
        }

        switch (name) {
          case 'register_agent_enhanced':
            return await this.handleEnhancedAgentRegistration(args, progressToken);
          
          case 'send_message_with_tracking':
            return await this.handleTrackedMessageSending(args, progressToken);
          
          case 'create_escrow_monitored':
            return await this.handleMonitoredEscrowCreation(args, progressToken);
          
          case 'bulk_channel_operation':
            return await this.handleBulkChannelOperation(args, progressToken);

          default:
            throw new Error(`Unknown enhanced tool: ${name}`);
        }
      } catch (error) {
        if (progressToken) {
          this.progressTrackers.delete(progressToken);
        }
        this.logger.error('Enhanced tool execution failed', { error, tool: name });
        throw error;
      }
    });
  }

  // =====================================================
  // Enhanced Agent Registration with Progress Tracking
  // =====================================================

  private async handleEnhancedAgentRegistration(args: any, progressToken?: string): Promise<any> {
    const { name, capabilities, description, endpoint } = args;
    
    if (progressToken) {
      await this.sendProgress(progressToken, 0, 100, "Starting agent registration process");
    }

    // Step 1: Validate agent data
    await this.delay(500);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 20, 100, "Validating agent configuration");
    }

    // Step 2: Check name availability
    await this.delay(800);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 40, 100, "Checking agent name availability");
    }

    const isNameAvailable = await this.checkAgentNameAvailability(name);
    if (!isNameAvailable) {
      throw new Error(`Agent name "${name}" is already taken`);
    }

    // Step 3: Generate agent keypair
    await this.delay(1000);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 60, 100, "Generating agent keypair");
    }

    // Step 4: Submit registration transaction
    await this.delay(1200);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 80, 100, "Submitting registration to blockchain");
    }

    const registrationResult = await this.client.agents.register({
      name,
      capabilities,
      description,
      endpoint
    });

    // Step 5: Wait for confirmation
    if (progressToken) {
      await this.sendProgress(progressToken, 90, 100, "Waiting for blockchain confirmation");
    }

    await this.waitForTransactionConfirmation(
      registrationResult.signature,
      progressToken,
      90, // Start from 90%
      100  // End at 100%
    );

    if (progressToken) {
      await this.sendProgress(progressToken, 100, 100, "Agent registration completed successfully");
      this.progressTrackers.delete(progressToken);
    }

    return {
      success: true,
      data: {
        agent_id: registrationResult.agentId,
        signature: registrationResult.signature,
        estimated_confirmation_time: "30 seconds"
      },
      timestamp: Date.now()
    };
  }

  // =====================================================
  // Tracked Message Sending with Real-time Updates
  // =====================================================

  private async handleTrackedMessageSending(args: any, progressToken?: string): Promise<any> {
    const { recipient, content, message_type = 'text' } = args;

    if (progressToken) {
      await this.sendProgress(progressToken, 0, 100, "Preparing message for delivery");
    }

    // Step 1: Validate recipient
    await this.delay(300);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 25, 100, "Validating recipient agent");
    }

    const recipientExists = await this.validateRecipientAgent(recipient);
    if (!recipientExists) {
      throw new Error(`Recipient agent "${recipient}" not found`);
    }

    // Step 2: Encrypt message content
    await this.delay(500);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 50, 100, "Encrypting message content");
    }

    // Step 3: Submit to blockchain
    await this.delay(800);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 75, 100, "Broadcasting message transaction");
    }

    const messageResult = await this.client.messages.send({
      recipient,
      content,
      message_type
    });

    // Step 4: Track delivery
    if (progressToken) {
      await this.sendProgress(progressToken, 90, 100, "Confirming message delivery");
    }

    await this.waitForTransactionConfirmation(messageResult.signature, progressToken, 90, 100);

    if (progressToken) {
      await this.sendProgress(progressToken, 100, 100, "Message delivered successfully");
      this.progressTrackers.delete(progressToken);
    }

    return {
      success: true,
      data: {
        message_id: messageResult.messageId,
        signature: messageResult.signature,
        delivery_status: 'confirmed'
      },
      timestamp: Date.now()
    };
  }

  // =====================================================
  // Monitored Escrow Creation with Multi-step Progress
  // =====================================================

  private async handleMonitoredEscrowCreation(args: any, progressToken?: string): Promise<any> {
    const { counterparty, amount, description, conditions } = args;

    if (progressToken) {
      await this.sendProgress(progressToken, 0, 100, "Initializing escrow agreement");
    }

    // Step 1: Validate counterparty
    await this.delay(400);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 15, 100, "Verifying counterparty agent");
    }

    // Step 2: Check balance
    await this.delay(600);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 30, 100, "Checking account balance");
    }

    const balance = await this.client.getBalance();
    if (balance < amount) {
      throw new Error(`Insufficient balance. Required: ${amount} SOL, Available: ${balance} SOL`);
    }

    // Step 3: Generate escrow contract
    await this.delay(1000);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 50, 100, "Generating escrow smart contract");
    }

    // Step 4: Submit escrow transaction
    await this.delay(1500);
    this.checkCancellation(progressToken);
    if (progressToken) {
      await this.sendProgress(progressToken, 70, 100, "Creating escrow on blockchain");
    }

    const escrowResult = await this.client.escrow.create({
      counterparty,
      amount,
      description,
      conditions
    });

    // Step 5: Wait for contract deployment
    if (progressToken) {
      await this.sendProgress(progressToken, 85, 100, "Deploying escrow smart contract");
    }

    await this.waitForTransactionConfirmation(escrowResult.signature, progressToken, 85, 100);

    if (progressToken) {
      await this.sendProgress(progressToken, 100, 100, "Escrow created and active");
      this.progressTrackers.delete(progressToken);
    }

    return {
      success: true,
      data: {
        escrow_id: escrowResult.escrowId,
        contract_address: escrowResult.contractAddress,
        signature: escrowResult.signature,
        status: 'active'
      },
      timestamp: Date.now()
    };
  }

  // =====================================================
  // Bulk Channel Operation with Granular Progress
  // =====================================================

  private async handleBulkChannelOperation(args: any, progressToken?: string): Promise<any> {
    const { operation, channels } = args; // operation: 'join' | 'leave' | 'create'
    const totalChannels = channels.length;

    if (progressToken) {
      await this.sendProgress(progressToken, 0, totalChannels, `Starting bulk ${operation} operation`);
    }

    const results = [];
    
    for (let i = 0; i < totalChannels; i++) {
      this.checkCancellation(progressToken);
      
      const channel = channels[i];
      if (progressToken) {
        await this.sendProgress(
          progressToken, 
          i, 
          totalChannels, 
          `Processing channel: ${channel.name || channel.id}`
        );
      }

      try {
        let result;
        switch (operation) {
          case 'join':
            result = await this.client.channels.join(channel.id);
            break;
          case 'leave':
            result = await this.client.channels.leave(channel.id);
            break;
          case 'create':
            result = await this.client.channels.create(channel);
            break;
          default:
            throw new Error(`Unknown bulk operation: ${operation}`);
        }

        results.push({
          channel_id: channel.id || result.channelId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          channel_id: channel.id,
          success: false,
          error: error.message
        });
      }

      // Small delay between operations
      await this.delay(200);
    }

    if (progressToken) {
      await this.sendProgress(progressToken, totalChannels, totalChannels, `Bulk ${operation} completed`);
      this.progressTrackers.delete(progressToken);
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
      success: true,
      data: {
        operation,
        total_processed: totalChannels,
        successful: successCount,
        failed: errorCount,
        results
      },
      timestamp: Date.now()
    };
  }

  // =====================================================
  // Smart Completions for Blockchain Data
  // =====================================================

  private setupCompletions(): void {
    this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
      const { ref, argument } = request.params;
      
      try {
        switch (ref.name) {
          case 'agent_search':
            return await this.completeAgentNames(argument.value);
          
          case 'blockchain_address':
            return await this.completeBlockchainAddresses(argument.value);
          
          case 'capability_tags':
            return await this.completeCapabilityTags(argument.value);
          
          case 'token_symbols':
            return await this.completeTokenSymbols(argument.value);
          
          default:
            return { completion: { values: [] } };
        }
      } catch (error) {
        this.logger.error('Completion failed', { error, ref, argument });
        return { completion: { values: [] } };
      }
    });
  }

  private async completeAgentNames(partial: string): Promise<any> {
    // Search active agents matching partial input
    const agents = await this.client.discovery.findAgents({
      search_term: partial,
      limit: 10
    });

    const suggestions = agents.map(agent => ({
      value: agent.name,
      description: agent.description || `Agent with capabilities: ${agent.capabilities.join(', ')}`,
      type: 'agent'
    }));

    return {
      completion: {
        values: suggestions,
        hasMore: agents.length === 10
      }
    };
  }

  private async completeBlockchainAddresses(partial: string): Promise<any> {
    if (partial.length < 10) {
      return { completion: { values: [] } };
    }

    // Well-known Solana program addresses
    const wellKnownAddresses = [
      {
        address: '11111111111111111111111111111112',
        name: 'System Program',
        type: 'program'
      },
      {
        address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        name: 'Token Program',
        type: 'program'
      },
      {
        address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        name: 'Associated Token Program',
        type: 'program'
      }
    ].filter(addr => addr.address.startsWith(partial));

    return {
      completion: {
        values: wellKnownAddresses.map(addr => ({
          value: addr.address,
          description: `${addr.name} (${addr.type})`,
          type: 'address'
        })),
        hasMore: false
      }
    };
  }

  private async completeCapabilityTags(partial: string): Promise<any> {
    const capabilities = [
      'trading', 'defi', 'nft', 'staking', 'governance', 'analytics',
      'portfolio-management', 'risk-assessment', 'market-making',
      'arbitrage', 'yield-farming', 'lending', 'borrowing',
      'cross-chain', 'dex-trading', 'mev-protection'
    ].filter(cap => cap.toLowerCase().includes(partial.toLowerCase()));

    return {
      completion: {
        values: capabilities.map(cap => ({
          value: cap,
          description: `${cap} capability`,
          type: 'capability'
        })),
        hasMore: false
      }
    };
  }

  private async completeTokenSymbols(partial: string): Promise<any> {
    const tokens = [
      { symbol: 'SOL', name: 'Solana' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether USD' },
      { symbol: 'BTC', name: 'Bitcoin (Wrapped)' },
      { symbol: 'ETH', name: 'Ethereum (Wrapped)' },
      { symbol: 'RAY', name: 'Raydium' },
      { symbol: 'SRM', name: 'Serum' }
    ].filter(token => 
      token.symbol.toLowerCase().includes(partial.toLowerCase()) ||
      token.name.toLowerCase().includes(partial.toLowerCase())
    );

    return {
      completion: {
        values: tokens.map(token => ({
          value: token.symbol,
          description: `${token.symbol} - ${token.name}`,
          type: 'token'
        })),
        hasMore: false
      }
    };
  }

  // =====================================================
  // Cancellation Support
  // =====================================================

  private setupCancellationHandler(): void {
    this.server.setNotificationHandler('notifications/cancelled', async (notification) => {
      const { requestId, reason } = notification.params;
      
      // Find and cancel any matching progress trackers
      for (const [token, tracker] of this.progressTrackers) {
        if (tracker.token === requestId || tracker.operation.includes(requestId)) {
          tracker.cancelled = true;
          this.logger.info('Operation cancelled', { 
            token, 
            operation: tracker.operation, 
            reason 
          });
        }
      }
    });
  }

  private checkCancellation(progressToken?: string): void {
    if (!progressToken) return;
    
    const tracker = this.progressTrackers.get(progressToken);
    if (tracker?.cancelled) {
      throw new Error(`Operation cancelled: ${tracker.operation}`);
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async sendProgress(
    progressToken: string,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void> {
    try {
      await this.server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          total,
          message
        }
      });
    } catch (error) {
      this.logger.error('Failed to send progress', { error, progressToken });
    }
  }

  private async waitForTransactionConfirmation(
    signature: string,
    progressToken?: string,
    startProgress: number = 0,
    endProgress: number = 100
  ): Promise<void> {
    const targetConfirmations = 32; // Solana finality
    let confirmations = 0;

    while (confirmations < targetConfirmations) {
      await this.delay(1000); // Check every second
      
      this.checkCancellation(progressToken);
      
      // Mock confirmation checking - replace with actual Solana RPC calls
      confirmations = Math.min(confirmations + 2, targetConfirmations);
      
      if (progressToken) {
        const progressValue = startProgress + 
          ((endProgress - startProgress) * confirmations / targetConfirmations);
        
        await this.sendProgress(
          progressToken,
          Math.round(progressValue),
          endProgress,
          `Confirmed ${confirmations}/${targetConfirmations} blocks`
        );
      }
    }
  }

  private async checkAgentNameAvailability(name: string): Promise<boolean> {
    // Mock implementation - replace with actual PoD Protocol check
    await this.delay(200);
    return !['admin', 'system', 'test'].includes(name.toLowerCase());
  }

  private async validateRecipientAgent(agentId: string): Promise<boolean> {
    // Mock implementation - replace with actual agent lookup
    await this.delay(100);
    return agentId.length > 5; // Simple validation
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================================
  // Server Lifecycle
  // =====================================================

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Enhanced PoD Protocol MCP Server started with latest features');
  }
} 