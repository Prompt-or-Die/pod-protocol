import { Address, KeyPairSigner } from "@solana/web3.js";
import { BaseService } from "./base";
import { AgentAccount, CreateAgentOptions, UpdateAgentOptions } from "../types";
/**
 * Agent-related operations service
 */
export declare class AgentService extends BaseService {
    registerAgent(wallet: KeyPairSigner, options: CreateAgentOptions): Promise<string>;
    updateAgent(wallet: KeyPairSigner, options: UpdateAgentOptions): Promise<string>;
    getAgent(walletPublicKey: Address): Promise<AgentAccount | null>;
    getAllAgents(limit?: number): Promise<AgentAccount[]>;
}
//# sourceMappingURL=agent.d.ts.map