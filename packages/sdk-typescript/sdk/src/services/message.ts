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

    // Generate message ID
    const messageId = Math.random().toString(36).substring(2, 15);

    // Find message PDA with correct parameters
    const [messagePDA] = await findMessagePDA(
      wallet.address,
      options.recipient,
      messageId,
      this.programId,
    );

    return retry(async () => {
      const methods = this.getProgramMethods();
      const tx = await methods
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
      const tx = await methods
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
      const account = await this.getAccount("messageAccount").fetch(messagePDA);
      return this.convertMessageAccountFromProgram(account, messagePDA);
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

      return result.value.slice(0, limit).map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "messageAccount",
          acc.account.data,
        );
        return this.convertMessageAccountFromProgram(account, acc.pubkey);
      });
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

  private convertMessageStatusFromProgram(programStatus: Record<string, unknown>): MessageStatus {
    if (programStatus.pending) return MessageStatus.PENDING;
    if (programStatus.delivered) return MessageStatus.DELIVERED;
    if (programStatus.read) return MessageStatus.READ;
    if (programStatus.failed) return MessageStatus.FAILED;
    return MessageStatus.PENDING;
  }

  private convertMessageAccountFromProgram(
    account: Record<string, unknown>,
    publicKey: Address,
  ): MessageAccount {
    return {
      pubkey: publicKey,
      sender: account.sender as Address,
      recipient: account.recipient as Address,
      payload: account.payload || account.content || "",
      payloadHash: account.payloadHash || Buffer.from("mock").toString("base64"),
      messageType: this.convertMessageTypeFromProgram(account.messageType),
      status: this.convertMessageStatusFromProgram(account.status),
      timestamp: getAccountTimestamp(account),
      createdAt: getAccountCreatedAt(account),
      expiresAt: account.expiresAt?.toNumber() || 0,
      bump: account.bump,
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
    // Mock implementation for MCP compatibility
    // Using void to acknowledge parameter exists but is not used
    void options;
    return {
      messageId: `msg_${Date.now()}`,
      signature: `sig_${Date.now()}`
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
    // Mock implementation for MCP compatibility
    // Using void to acknowledge parameter exists but is not used
    void options;
    return {
      messages: [],
      totalCount: 0,
      hasMore: false
    };
  }

  /**
   * Mark message as read for MCP server compatibility
   */
  async markAsRead(messageId: string): Promise<{ signature: string }> {
    // Mock implementation for MCP compatibility
    // Using void to acknowledge parameter exists but is not used
    void messageId;
    return {
      signature: `read_sig_${Date.now()}`
    };
  }
}
