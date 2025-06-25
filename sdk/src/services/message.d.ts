import { Address, KeyPairSigner } from "@solana/web3.js";
import { BaseService } from "./base";
import { MessageAccount, SendMessageOptions, MessageStatus } from "../types";
/**
 * Message-related operations service
 */
export declare class MessageService extends BaseService {
    sendMessage(wallet: KeyPairSigner, options: SendMessageOptions): Promise<string>;
    updateMessageStatus(wallet: KeyPairSigner, messagePDA: Address, newStatus: MessageStatus): Promise<string>;
    getMessage(messagePDA: Address): Promise<MessageAccount | null>;
    getAgentMessages(agentPublicKey: Address, limit?: number, statusFilter?: MessageStatus): Promise<MessageAccount[]>;
    private convertMessageType;
    private convertMessageTypeFromProgram;
    private convertMessageStatus;
    private convertMessageStatusFromProgram;
    private convertMessageAccountFromProgram;
}
//# sourceMappingURL=message.d.ts.map