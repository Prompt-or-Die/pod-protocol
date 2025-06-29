import { Rpc } from '@solana/rpc';
import { Address } from '@solana/addresses';
import { Program } from "@coral-xyz/anchor";

type AnchorProgram = Program<any>;
type Commitment = 'confirmed' | 'finalized' | 'processed';
/**
 * Configuration object for BaseService constructor
 */
export interface BaseServiceConfig {
    rpc: Rpc<any>;
    programId: Address;
    commitment: Commitment;
    program?: AnchorProgram;
}
/**
 * Base service class with common functionality for all services
 */
export declare abstract class BaseService {
    protected rpc: Rpc<any>;
    protected programId: Address;
    protected commitment: Commitment;
    protected program?: AnchorProgram;
    protected idl?: any;
    constructor(config: BaseServiceConfig);
    protected ensureInitialized(): AnchorProgram;
    protected getAccount(accountName: string): any;
    protected getProgramMethods(): any;
    setProgram(program: AnchorProgram): void;
    /**
     * Remove the program reference to avoid using stale credentials
     */
    clearProgram(): void;
    /**
     * Set the IDL for read-only operations
     */
    setIDL(idl: any): void;
    /**
     * Check if IDL is set for read-only operations
     */
    hasIDL(): boolean;
    protected ensureIDL(): any;
}
export {};
//# sourceMappingURL=base.d.ts.map