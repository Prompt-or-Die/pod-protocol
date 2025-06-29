import { Address } from '@solana/addresses';
import { KeyPairSigner } from '@solana/signers';
import { BaseService } from "./base";
import { DepositEscrowOptions, WithdrawEscrowOptions, EscrowAccount } from "../types";
/**
 * Escrow service for managing channel deposits and payments
 */
export declare class EscrowService extends BaseService {
    /**
     * Deposit funds to escrow for a channel
     */
    depositEscrow(wallet: KeyPairSigner, options: DepositEscrowOptions): Promise<string>;
    /**
     * Withdraw funds from escrow
     */
    withdrawEscrow(wallet: KeyPairSigner, options: WithdrawEscrowOptions): Promise<string>;
    /**
     * Get escrow account data
     */
    getEscrow(channel: Address, depositor: Address): Promise<EscrowAccount | null>;
    /**
     * Get all escrow accounts by depositor
     */
    getEscrowsByDepositor(depositor: Address, limit?: number): Promise<EscrowAccount[]>;
    private convertEscrowAccountFromProgram;
}
//# sourceMappingURL=escrow.d.ts.map