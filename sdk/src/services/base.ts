import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import type { Rpc } from '@solana/rpc';
import { Program, BorshCoder } from "@coral-xyz/anchor";
import type { Program as ProgramType } from "@coral-xyz/anchor";
type AnchorProgram = ProgramType<any>;

// Use string literal types for commitment in Web3.js v2.0
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
export abstract class BaseService {
  protected programId: Address;
  protected commitment: Commitment;
  protected rpc: Rpc<any>;
  protected coder: BorshCoder;
  protected program?: AnchorProgram;
  protected idl?: any;

  constructor(
    rpcUrl: string,
    programId: string,
    commitment: Commitment = 'confirmed'
  ) {
    this.rpc = createSolanaRpc(rpcUrl);
    this.commitment = commitment;
    this.programId = address(programId);
  }

  /**
   * Get the RPC client
   */
  public getRpc(): Rpc<any> {
    return this.rpc;
  }

  /**
   * Get the program ID
   */
  public getProgramId(): Address {
    return this.programId;
  }

  /**
   * Get commitment level
   */
  public getCommitment(): Commitment {
    return this.commitment;
  }

  /**
   * Helper to create address from string
   */
  protected createAddress(addressString: string): Address {
    return address(addressString);
  }

  /**
   * Validate that an address string is valid
   */
  protected validateAddress(addressString: string): boolean {
    try {
      address(addressString);
      return true;
    } catch {
      return false;
    }
  }

  protected ensureInitialized(): AnchorProgram {
    if (!this.program) {
      throw new Error(
        "Client not initialized with wallet. Call client.initialize(wallet) first.",
      );
    }
    return this.program;
  }

  protected getAccount(accountName: string) {
    const program = this.ensureInitialized();
    const accounts = program.account as any;
    if (!accounts || !accounts[accountName]) {
      throw new Error(
        `Account type '${accountName}' not found in program. Verify IDL is correct.`,
      );
    }
    return accounts[accountName];
  }

  protected getProgramMethods() {
    const program = this.ensureInitialized();
    if (!program.methods) {
      throw new Error(
        "Program methods not available. Verify IDL is correct and program is initialized.",
      );
    }
    return program.methods as any;
  }

  setProgram(program: AnchorProgram) {
    this.program = program;
  }

  /**
   * Remove the program reference to avoid using stale credentials
   */
  clearProgram(): void {
    this.program = undefined;
  }

  /**
   * Set the IDL for read-only operations
   */
  setIDL(idl: any): void {
    if (!idl) {
      throw new Error("Cannot set null or undefined IDL");
    }
    this.idl = idl;
  }

  /**
   * Check if IDL is set for read-only operations
   */
  hasIDL(): boolean {
    return this.idl !== undefined;
  }

  protected ensureIDL(): any {
    if (!this.idl) {
      throw new Error(
        "IDL not set. Call client.initialize() first or ensure IDL is properly imported.",
      );
    }
    return this.idl;
  }
}
