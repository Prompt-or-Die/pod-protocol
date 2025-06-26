/**
 * Agent service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { address } from '@solana/addresses';
import { BN } from '@coral-xyz/anchor';
import { findAgentPDA } from '../utils/pda.js';

/**
 * Service for managing AI agents in the PoD Protocol
 * 
 * @class AgentService
 * @extends BaseService
 */
export class AgentService extends BaseService {
  /**
   * Register a new agent
   * 
   * @param {CreateAgentOptions} options - Agent creation options
   * @param {KeyPairSigner} wallet - Wallet to sign the transaction
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.agents.register({
   *   capabilities: AGENT_CAPABILITIES.ANALYSIS | AGENT_CAPABILITIES.TRADING,
   *   metadataUri: 'https://my-agent-metadata.json'
   * }, wallet);
   * ```
   */
  async register(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    const [agentPDA] = await findAgentPDA(wallet.publicKey, this.programId);

    return this.retry(async () => {
      try {
        const tx = await this.program.methods
          .registerAgent(new BN(options.capabilities), options.metadataUri)
          .accounts({
            agentAccount: agentPDA,
            signer: wallet.publicKey,
            systemProgram: "11111111111111111111111111111112"
          })
          .rpc();

        return tx;
      } catch (error) {
        if (error.message?.includes('Account does not exist')) {
          throw new Error(
            'Program account not found. Verify the program is deployed and the program ID is correct.'
          );
        }
        if (error.message?.includes('insufficient funds')) {
          throw new Error(
            'Insufficient SOL balance. Please add funds to your wallet and try again.'
          );
        }
        throw error;
      }
    });
  }

  /**
   * Update an existing agent
   * 
   * @param {UpdateAgentOptions} options - Update options
   * @param {KeyPairSigner} wallet - Wallet to sign the transaction
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.agents.update({
   *   capabilities: AGENT_CAPABILITIES.ANALYSIS,
   *   metadataUri: 'https://updated-metadata.json'
   * }, wallet);
   * ```
   */
  async update(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    const [agentPDA] = await findAgentPDA(wallet.publicKey, this.programId);

    return this.retry(async () => {
      const tx = await this.program.methods
        .updateAgent(
          options.capabilities ? new BN(options.capabilities) : null,
          options.metadataUri || null
        )
        .accounts({
          agentAccount: agentPDA,
          signer: wallet.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get agent information by public key
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @returns {Promise<Object|null>} Agent account data
   * 
   * @example
   * ```javascript
   * const agent = await client.agents.get(agentAddress);
   * if (agent) {
   *   console.log('Agent capabilities:', agent.capabilities);
   *   console.log('Agent reputation:', agent.reputation);
   * }
   * ```
   */
  async get(agentPubkey) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const [agentPDA] = await findAgentPDA(agentPubkey, this.programId);
      const agentAccount = await this.program.account.agentAccount.fetch(agentPDA);
      
      return {
        pubkey: agentPubkey,
        ...agentAccount,
        // Convert BN to number for JavaScript compatibility
        capabilities: agentAccount.capabilities.toNumber(),
        reputation: agentAccount.reputation.toNumber(),
        lastUpdated: agentAccount.lastUpdated.toNumber(),
        invitesSent: agentAccount.invitesSent.toNumber(),
        lastInviteAt: agentAccount.lastInviteAt.toNumber()
      };
    } catch (error) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all agents with optional filtering
   * 
   * @param {Object} [filters] - Optional filters
   * @param {number} [filters.capabilities] - Filter by capabilities bitmask
   * @param {number} [filters.minReputation] - Minimum reputation score
   * @param {number} [filters.limit=100] - Maximum number of results
   * @returns {Promise<Array>} Array of agent accounts
   * 
   * @example
   * ```javascript
   * // Get all trading agents with reputation > 50
   * const agents = await client.agents.list({
   *   capabilities: AGENT_CAPABILITIES.TRADING,
   *   minReputation: 50,
   *   limit: 10
   * });
   * ```
   */
  async list(filters = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.agentAccount.all();
      let agents = accounts.map(account => ({
        pubkey: account.publicKey,
        ...account.account,
        // Convert BN to number for JavaScript compatibility
        capabilities: account.account.capabilities.toNumber(),
        reputation: account.account.reputation.toNumber(),
        lastUpdated: account.account.lastUpdated.toNumber(),
        invitesSent: account.account.invitesSent.toNumber(),
        lastInviteAt: account.account.lastInviteAt.toNumber()
      }));

      // Apply filters
      if (filters.capabilities !== undefined) {
        agents = agents.filter(agent => 
          (agent.capabilities & filters.capabilities) === filters.capabilities
        );
      }

      if (filters.minReputation !== undefined) {
        agents = agents.filter(agent => agent.reputation >= filters.minReputation);
      }

      // Apply limit
      if (filters.limit) {
        agents = agents.slice(0, filters.limit);
      }

      return agents;
    } catch (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
  }

  /**
   * Check if an agent exists
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @returns {Promise<boolean>} True if agent exists
   * 
   * @example
   * ```javascript
   * const exists = await client.agents.exists(agentAddress);
   * if (!exists) {
   *   console.log('Agent not found');
   * }
   * ```
   */
  async exists(agentPubkey) {
    const agent = await this.get(agentPubkey);
    return agent !== null;
  }

  /**
   * Get agent statistics
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @returns {Promise<Object>} Agent statistics
   * 
   * @example
   * ```javascript
   * const stats = await client.agents.getStats(agentAddress);
   * console.log('Messages sent:', stats.messagesSent);
   * console.log('Channels joined:', stats.channelsJoined);
   * ```
   */
  async getStats(agentPubkey) {
    // This would require additional on-chain data or indexing
    // For now, return basic info from agent account
    const agent = await this.get(agentPubkey);
    
    if (!agent) {
      throw new Error('Agent not found');
    }

    return {
      reputation: agent.reputation,
      invitesSent: agent.invitesSent,
      lastActive: agent.lastUpdated,
      accountAge: Date.now() - (agent.lastUpdated * 1000)
    };
  }

  /**
   * Get agent PDA for a public key
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @returns {Address} Agent PDA
   */
  async getAgentPDA(agentPubkey) {
    const [pda] = await findAgentPDA(agentPubkey, this.programId);
    return pda;
  }

  /**
   * Generate metadata URI from metadata object
   * 
   * @param {Object} metadata - Metadata object
   * @returns {string} Base64 encoded data URI
   */
  generateMetadataURI(metadata) {
    const jsonString = JSON.stringify(metadata);
    const base64String = Buffer.from(jsonString).toString('base64');
    return `data:application/json;base64,${base64String}`;
  }

  /**
   * Create register agent instruction
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @param {number} capabilities - Capabilities bitmask
   * @param {string} metadataUri - Metadata URI
   * @returns {TransactionInstruction} Register instruction
   */
  async createRegisterInstruction(agentPubkey, capabilities, metadataUri) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [agentPDA] = await findAgentPDA(agentPubkey, this.programId);

    return this.program.methods
      .registerAgent(new BN(capabilities), metadataUri)
      .accounts({
        agentAccount: agentPDA,
        signer: agentPubkey,
        systemProgram: "11111111111111111111111111111112"
      })
      .instruction();
  }

  /**
   * Create update agent instruction
   * 
   * @param {Address} agentPubkey - Agent's public key
   * @param {number} capabilities - New capabilities bitmask
   * @param {string} metadataUri - New metadata URI
   * @returns {TransactionInstruction} Update instruction
   */
  async createUpdateInstruction(agentPubkey, capabilities, metadataUri) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [agentPDA] = await findAgentPDA(agentPubkey, this.programId);

    return this.program.methods
      .updateAgent(
        capabilities ? new BN(capabilities) : null,
        metadataUri || null
      )
      .accounts({
        agentAccount: agentPDA,
        signer: agentPubkey
      })
      .instruction();
  }

  /**
   * Validate agent data
   * 
   * @param {Object} agentData - Agent data to validate
   * @throws {Error} If validation fails
   */
  validateAgentData(agentData) {
    if (!agentData.pubkey) {
      throw new Error('Agent public key is required');
    }

    if (typeof agentData.capabilities !== 'number' || agentData.capabilities < 0) {
      throw new Error('Capabilities must be a non-negative number');
    }

    if (!agentData.metadataUri || agentData.metadataUri.trim() === '') {
      throw new Error('Metadata URI is required');
    }

    if (typeof agentData.messageCount === 'number' && agentData.messageCount < 0) {
      throw new Error('Message count must be non-negative');
    }
  }

  /**
   * Calculate reputation from metrics
   * 
   * @param {Object} metrics - Performance metrics
   * @returns {number} Calculated reputation (0-1000)
   */
  calculateReputation(metrics) {
    const { successfulMessages = 0, failedMessages = 0, totalMessages = 0, averageResponseTime = 0 } = metrics;
    
    if (totalMessages === 0) return 500; // Default reputation for new agents

    const successRate = successfulMessages / totalMessages;
    const timeBonus = Math.max(0, 1 - (averageResponseTime / 5000)); // Bonus for fast responses
    
    let reputation = 500; // Base reputation
    reputation += (successRate * 400); // Up to 400 points for success rate
    reputation += (timeBonus * 100); // Up to 100 points for response time
    
    return Math.round(Math.max(0, Math.min(1000, reputation)));
  }

  /**
   * Get capabilities as array of strings
   * 
   * @param {number} capabilities - Capabilities bitmask
   * @returns {string[]} Array of capability names
   */
  getCapabilitiesArray(capabilities) {
    const capabilityMap = {
      1: 'text',
      2: 'image', 
      4: 'code',
      8: 'analysis',
      16: 'trading',
      32: 'custom1',
      64: 'custom2'
    };

    const result = [];
    for (const [value, name] of Object.entries(capabilityMap)) {
      if (capabilities & parseInt(value)) {
        result.push(name);
      }
    }

    return result;
  }

  /**
   * Convert capabilities array to bitmask number
   * 
   * @param {string[]} capabilitiesArray - Array of capability names
   * @returns {number} Capabilities bitmask
   */
  capabilitiesFromArray(capabilitiesArray) {
    const capabilityMap = {
      'text': 1,
      'image': 2,
      'code': 4,
      'analysis': 8,
      'trading': 16,
      'custom1': 32,
      'custom2': 64
    };

    let capabilities = 0;
    for (const capability of capabilitiesArray) {
      if (capabilityMap[capability]) {
        capabilities |= capabilityMap[capability];
      }
    }

    return capabilities;
  }
}
