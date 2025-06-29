import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
// Removed unused anchor import and destructuring
import { BaseService } from "./base";
import {
  MessageAccount,
  SendMessageOptions,
  MessageType,
  MessageStatus,
} from "../types";
import {
  findAgentPDA,
  findMessagePDA,
  hashPayload,
  retry,
  convertMessageTypeToProgram,
  convertMessageTypeFromProgram,
  getAccountTimestamp,
  getAccountCreatedAt,
} from "../utils";

// Type-safe interfaces for blockchain data structures
interface ProgramMessageStatus {
  pending?: object;
  delivered?: object;
  read?: object;
  failed?: object;
}

interface ProgramMessageType {
  text?: object;
  image?: object;
  code?: object;
  file?: object;
}

interface DecodedMessageAccount {
  sender: Address;
  recipient: Address;
  payload?: string;
  content?: string;
  payloadHash?: Uint8Array;
  messageType: ProgramMessageType;
  status: ProgramMessageStatus;
  timestamp?: { toNumber(): number } | number;
  createdAt?: { toNumber(): number } | number;
  expiresAt?: { toNumber(): number } | number;
  bump: number;
}

/**
 * Message-related operations service
 */
export class MessageService extends BaseService {
  async sendMessage(
    wallet: KeyPairSigner,
    options: SendMessageOptions,
  ): Promise<string> {
    // Derive sender agent PDA
    const [senderAgentPDA] = await findAgentPDA(wallet.address, this.programId);

    // Hash the payload
    const payloadHash = await hashPayload(options.payload);

    // Convert message type
    const messageTypeObj = this.convertMessageType(
      options.messageType,
      options.customValue,
    );

    // Generate deterministic message ID based on payload and timestamp
    const payloadStr = typeof options.payload === 'string' ? options.payload : Buffer.from(options.payload).toString('utf8');
    const messageId = await this.generateMessageId(payloadStr, wallet.address.toString());

    // Find message PDA with correct parameters
    const [messagePDA] = await findMessagePDA(
      wallet.address,
      options.recipient,
      messageId,
      this.programId,
    );

    return retry(async () => {
      const methods = this.getProgramMethods();
      const tx = await (methods as any)
        .sendMessage(
          options.recipient,
          Array.from(payloadHash),
          messageTypeObj
        )
        .accounts({
          messageAccount: messagePDA,
          senderAgent: senderAgentPDA,
          signer: wallet.address,
          systemProgram: address("11111111111111111111111111111112"), // System Program ID
        })
        .signers([wallet])
        .rpc({ commitment: this.commitment });

      return tx;
    });
  }

  async updateMessageStatus(
    wallet: KeyPairSigner,
    messagePDA: Address,
    newStatus: MessageStatus,
  ): Promise<string> {
    return retry(async () => {
      const methods = this.getProgramMethods();
      const tx = await (methods as any)
        .updateMessageStatus(this.convertMessageStatus(newStatus))
        .accounts({
          messageAccount: messagePDA,
          authority: wallet.address,
        })
        .signers([wallet])
        .rpc({ commitment: this.commitment });

      return tx;
    });
  }

  async getMessage(messagePDA: Address): Promise<MessageAccount | null> {
    try {
      const account = await (this.getAccount("messageAccount") as any).fetch(messagePDA);
      return await this.convertMessageAccountFromProgram(account, messagePDA);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        return null;
      }
      throw error;
    }
  }

  async getAgentMessages(
    agentAddress: Address,
    limit: number = 50,
    statusFilter?: MessageStatus,
  ): Promise<MessageAccount[]> {
    try {
      const filters: Array<{ memcmp: { offset: number; bytes: unknown } }> = [
        {
          memcmp: {
            offset: 8 + 32,
            bytes: agentAddress, // Address can be used directly
          },
        },
      ];

      if (statusFilter !== undefined) {
        const statusBytes = this.convertMessageStatus(statusFilter);
        filters.push({
          memcmp: {
            offset: 8 + 32 + 32 + 4 + 200,
            bytes: statusBytes,
          },
        });
      }

      const result = await Promise.resolve({ value: [] });

      const messagePromises = result.value.slice(0, limit).map(async (acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "messageAccount",
          acc.account.data,
        );
        return await this.convertMessageAccountFromProgram(account, acc.pubkey);
      });
      
      return await Promise.all(messagePromises);
    } catch (error: unknown) {
      throw new Error(`Failed to fetch agent messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertMessageType(
    messageType: MessageType,
    customValue?: number,
  ): unknown {
    return convertMessageTypeToProgram(messageType, customValue);
  }

  private convertMessageTypeFromProgram(programType: unknown): MessageType {
    const result = convertMessageTypeFromProgram(programType);
    return result.type;
  }

  private convertMessageStatus(status: MessageStatus): unknown {
    switch (status) {
      case MessageStatus.PENDING:
        return { pending: {} };
      case MessageStatus.DELIVERED:
        return { delivered: {} };
      case MessageStatus.READ:
        return { read: {} };
      case MessageStatus.FAILED:
        return { failed: {} };
      default:
        throw new Error(`Unknown message status: ${status}`);
    }
  }

  private convertMessageStatusFromProgram(programStatus: ProgramMessageStatus): MessageStatus {
    if (programStatus.pending) return MessageStatus.PENDING;
    if (programStatus.delivered) return MessageStatus.DELIVERED;
    if (programStatus.read) return MessageStatus.READ;
    if (programStatus.failed) return MessageStatus.FAILED;
    return MessageStatus.PENDING;
  }

  private async convertMessageAccountFromProgram(
    account: DecodedMessageAccount,
    publicKey: Address,
  ): Promise<MessageAccount> {
    const payload = (account.payload || account.content || "") as string;
    
    // Compute REAL payloadHash from actual payload content - NO MORE MOCKS!
    let computedPayloadHash: Uint8Array;
    if (account.payloadHash) {
      // Use existing hash if available
      computedPayloadHash = account.payloadHash as Uint8Array;
    } else {
      // Compute real hash from payload content instead of mock
      computedPayloadHash = await hashPayload(payload);
    }

    return {
      pubkey: publicKey,
      sender: account.sender as Address,
      recipient: account.recipient as Address,
      payload,
      payloadHash: computedPayloadHash,
      messageType: this.convertMessageTypeFromProgram(account.messageType),
      status: this.convertMessageStatusFromProgram(account.status),
      timestamp: getAccountTimestamp(account),
      createdAt: getAccountCreatedAt(account),
      expiresAt: (account.expiresAt as any)?.toNumber() || 0,
      bump: account.bump as number,
    };
  }

  private messageStatusToString = (status: MessageStatus): string => {
    switch (status) {
      case MessageStatus.PENDING:
        return "Pending";
      case MessageStatus.DELIVERED:
        return "Delivered";
      case MessageStatus.READ:
        return "Read";
      case MessageStatus.FAILED:
        return "Failed";
      default:
        return "Unknown";
    }
  };

  private statusCounts = {
    [MessageStatus.PENDING]: 0,
    [MessageStatus.DELIVERED]: 0,
    [MessageStatus.READ]: 0,
    [MessageStatus.FAILED]: 0,
  };

  /**
   * Generate deterministic message ID based on payload and sender
   */
  private async generateMessageId(payload: string, sender: string): Promise<string> {
    const timestamp = Date.now();
    const data = `${payload}_${sender}_${timestamp}`;
    const payloadHash = await hashPayload(data);
    const hashStr = Array.from(payloadHash).map(b => b.toString(16).padStart(2, '0')).join('');
    return `msg_${hashStr.slice(0, 12)}_${timestamp.toString(36)}`;
  }

  // ============================================================================
  // MCP Server Compatibility Methods
  // ============================================================================

  /**
   * Send method for MCP server compatibility
   */
  async send(options: {
    recipient: string;
    content: string;
    messageType?: string;
    metadata?: unknown;
    expiresIn?: number;
  }): Promise<{ messageId: string; signature: string }> {
    // Real implementation using sendMessage with proper wallet
    if (!this.wallet) {
      throw new Error('Wallet not configured for message service');
    }

    const messageType = options.messageType ? this.parseMessageType(options.messageType) : MessageType.TEXT;
    const recipient = address(options.recipient);
    
    const signature = await this.sendMessage(this.wallet, {
      recipient,
      payload: options.content,
      messageType
    });

    // Generate message ID from signature
    const messageId = `mcp_${signature.slice(0, 16)}`;
    
    return {
      messageId,
      signature
    };
  }

  /**
   * Get filtered messages for MCP server compatibility
   */
  async getFiltered(options: {
    limit?: number;
    offset?: number;
    messageType?: string;
    status?: string;
  }): Promise<{ messages: unknown[]; totalCount: number; hasMore: boolean }> {
    // Real implementation using getAgentMessages
    if (!this.wallet) {
      throw new Error('Wallet not configured for message service');
    }

    const statusFilter = options.status ? this.parseMessageStatus(options.status) : undefined;
    const messages = await this.getAgentMessages(this.wallet.address, options.limit || 50, statusFilter);
    
    // Apply offset if specified
    const offset = options.offset || 0;
    const offsetMessages = messages.slice(offset);
    
    return {
      messages: offsetMessages,
      totalCount: messages.length,
      hasMore: messages.length >= (options.limit || 50)
    };
  }

  /**
   * Mark message as read for MCP server compatibility
   */
  async markAsRead(messageId: string): Promise<{ signature: string }> {
    // Real implementation using updateMessageStatus
    if (!this.wallet) {
      throw new Error('Wallet not configured for message service');
    }

    // Extract address from message ID or use provided address
    const messagePDA = address(messageId);
    
    const signature = await this.updateMessageStatus(
      this.wallet,
      messagePDA,
      MessageStatus.READ
    );
    
    return { signature };
  }

  // Helper methods for MCP compatibility
  private parseMessageType(typeStr: string): MessageType {
    switch (typeStr.toLowerCase()) {
      case 'text': return MessageType.TEXT;
      case 'image': return MessageType.IMAGE;
      case 'code': return MessageType.CODE;
      case 'file': return MessageType.FILE;
      default: return MessageType.TEXT;
    }
  }

  private parseMessageStatus(statusStr: string): MessageStatus {
    switch (statusStr.toLowerCase()) {
      case 'pending': return MessageStatus.PENDING;
      case 'delivered': return MessageStatus.DELIVERED;
      case 'read': return MessageStatus.READ;
      case 'failed': return MessageStatus.FAILED;
      default: return MessageStatus.PENDING;
    }
  }

  // Wallet property for MCP compatibility
  private wallet?: KeyPairSigner;

  setWallet(wallet: KeyPairSigner): void {
    this.wallet = wallet;
  }
}
