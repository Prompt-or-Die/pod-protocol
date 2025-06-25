import { Address, address } from '@solana/web3.js';
import { BaseService } from "./base";
import { MessageStatus, } from "../types";
import { findAgentPDA, findMessagePDA, hashPayload, retry, convertMessageTypeToProgram, convertMessageTypeFromProgram, getAccountTimestamp, getAccountCreatedAt, } from "../utils";
/**
 * Message-related operations service
 */
export class MessageService extends BaseService {
    async sendMessage(wallet, options) {
        const program = this.ensureInitialized();
        // Derive sender agent PDA
        const [senderAgentPDA] = findAgentPDA(wallet.publicKey, this.programId);
        // Hash the payload
        const payloadHash = await hashPayload(options.payload);
        // Convert message type
        const messageTypeObj = this.convertMessageType(options.messageType, options.customValue);
        // Find message PDA
        const [messagePDA] = findMessagePDA(senderAgentPDA, options.recipient, payloadHash, messageTypeObj, this.programId);
        return retry(async () => {
            const tx = await program.methods
                .sendMessage(options.recipient, Array.from(payloadHash), messageTypeObj)
                .accounts({
                messageAccount: messagePDA,
                senderAgent: senderAgentPDA,
                signer: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
                .signers([wallet])
                .rpc({ commitment: this.commitment });
            return tx;
        });
    }
    async updateMessageStatus(wallet, messagePDA, newStatus) {
        return retry(async () => {
            const methods = this.getProgramMethods();
            const tx = await methods
                .updateMessageStatus(this.convertMessageStatus(newStatus))
                .accounts({
                messageAccount: messagePDA,
                authority: wallet.publicKey,
            })
                .signers([wallet])
                .rpc({ commitment: this.commitment });
            return tx;
        });
    }
    async getMessage(messagePDA) {
        try {
            const account = await this.getAccount("messageAccount").fetch(messagePDA);
            return this.convertMessageAccountFromProgram(account, messagePDA);
        }
        catch (error) {
            if (error?.message?.includes("Account does not exist")) {
                return null;
            }
            throw error;
        }
    }
    async getAgentMessages(agentAddress, limit = 50, statusFilter) {
        try {
            const filters = [
                {
                    memcmp: {
                        offset: 8 + 32,
                        bytes: agentAddress,
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
            const accounts = await this.connection.getProgramAccounts(this.programId, {
                filters,
                commitment: this.commitment,
            });
            return accounts.slice(0, limit).map((acc) => {
                const account = this.ensureInitialized().coder.accounts.decode("messageAccount", acc.account.data);
                return this.convertMessageAccountFromProgram(account, acc.pubkey);
            });
        }
        catch (error) {
            throw new Error(`Failed to fetch agent messages: ${error.message}`);
        }
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    convertMessageType(messageType, customValue) {
        return convertMessageTypeToProgram(messageType, customValue);
    }
    convertMessageTypeFromProgram(programType) {
        const result = convertMessageTypeFromProgram(programType);
        return result.type;
    }
    convertMessageStatus(status) {
        switch (status) {
            case MessageStatus.Pending:
                return { pending: {} };
            case MessageStatus.Delivered:
                return { delivered: {} };
            case MessageStatus.Read:
                return { read: {} };
            case MessageStatus.Failed:
                return { failed: {} };
            default:
                throw new Error(`Unknown message status: ${status}`);
        }
    }
    convertMessageStatusFromProgram(programStatus) {
        if (programStatus.pending)
            return MessageStatus.Pending;
        if (programStatus.delivered)
            return MessageStatus.Delivered;
        if (programStatus.read)
            return MessageStatus.Read;
        if (programStatus.failed)
            return MessageStatus.Failed;
        throw new Error(`Unknown program status: ${JSON.stringify(programStatus)}`);
    }
    convertMessageAccountFromProgram(account, publicKey) {
        return {
            pubkey: publicKey,
            sender: new Address(account.sender),
            recipient: new Address(account.recipient),
            payload: account.payload || account.content || "",
            payloadHash: account.payloadHash,
            messageType: this.convertMessageTypeFromProgram(account.messageType),
            status: this.convertMessageStatusFromProgram(account.status),
            timestamp: getAccountTimestamp(account),
            createdAt: getAccountCreatedAt(account),
            expiresAt: account.expiresAt?.toNumber() || 0,
            bump: account.bump,
        };
    }
}
//# sourceMappingURL=message.js.map