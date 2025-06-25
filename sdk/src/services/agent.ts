import { Address, KeyPairSigner, generateKeyPairSigner } from '@solana/web3.js';
import anchor from "@coral-xyz/anchor";
const { BN, AnchorProvider, web3, Program } = anchor;
import { BaseService } from "./base";
import { AgentAccount, CreateAgentOptions, UpdateAgentOptions } from "../types";
import { findAgentPDA, retry, getAccountLastUpdated } from "../utils";

/**
 * Agent-related operations service
 */
export class AgentService extends BaseService {
  async registerAgent(
    wallet: KeyPairSigner,
    options: CreateAgentOptions,
  ): Promise<string> {
    const [agentPDA] = findAgentPDA(wallet.address, this.programId);

    return retry(async () => {
      // Always prefer using the pre-initialized program if available
      let program;
      if (this.program) {
        // Program was pre-initialized with the wallet - use it directly
        program = this.program;
      } else {
        // This should not happen if client.initialize(wallet) was called properly
        throw new Error(
          "No program instance available. Ensure client.initialize(wallet) was called successfully.",
        );
      }

      try {
        const tx = await (program.methods as any)
          .registerAgent(new BN(options.capabilities), options.metadataUri)
          .accounts({
            agentAccount: agentPDA,
            signer: wallet.address,
            systemProgram: "11111111111111111111111111111112", // System Program ID
          })
          .rpc();

        return tx;
      } catch (error: any) {
        // Provide more specific error messages
        if (error.message?.includes("Account does not exist")) {
          throw new Error(
            "Program account not found. Verify the program is deployed and the program ID is correct.",
          );
        }
        if (error.message?.includes("insufficient funds")) {
          throw new Error(
            "Insufficient SOL balance to pay for transaction fees and rent.",
          );
        }
        if (error.message?.includes("custom program error")) {
          throw new Error(
            `Program error: ${error.message}. Check program logs for details.`,
          );
        }
        throw new Error(`Agent registration failed: ${error.message}`);
      }
    });
  }

  async updateAgent(
    wallet: KeyPairSigner,
    options: UpdateAgentOptions,
  ): Promise<string> {
    const [agentPDA] = findAgentPDA(wallet.address, this.programId);

    return retry(async () => {
      // Use the program if it was initialized with a wallet, otherwise create a fresh one
      let program;
      if (this.program) {
        // Program was pre-initialized with the wallet
        program = this.program;
      } else {
        // Fallback: create a fresh provider with the actual wallet for this transaction
        const provider = new AnchorProvider(
          this.rpc as any,
          wallet as any,
          {
            commitment: this.commitment,
            skipPreflight: true,
          },
        );

        // Get the IDL directly (no dummy wallet involved)
        const idl = this.ensureIDL();

        // Create a new program instance with the proper wallet
        program = new Program(idl, provider);
      }

      const tx = await (program.methods as any)
        .updateAgent(
          options.capabilities !== undefined
            ? new BN(options.capabilities)
            : null,
          options.metadataUri !== undefined ? options.metadataUri : null,
        )
        .accounts({
          agentAccount: agentPDA,
          signer: wallet.address,
        })
        .rpc();

      return tx;
    });       
  }

  async getAgent(walletAddress: Address): Promise<AgentAccount | null> {
    const [agentPDA] = findAgentPDA(walletAddress, this.programId);

    try {
      // Use the program if it was initialized, otherwise create a temporary one
      let program;
      if (this.program) {
        // Program was pre-initialized, use it
        program = this.program;
      } else {
        // For read operations, use a read-only provider without wallet
        const tempKeyPairSigner = await generateKeyPairSigner();
        const readOnlyProvider = new AnchorProvider(
          this.rpc as any,
          { publicKey: tempKeyPairSigner.address, signTransaction: async () => { throw new Error('Read-only wallet'); }, signAllTransactions: async () => { throw new Error('Read-only wallet'); } } as any, // Read-only wallet
          { commitment: 'confirmed' }
        );

        const idl = this.ensureIDL();
        program = new Program(idl, readOnlyProvider);
      }

      const agentAccount = this.getAccount("agentAccount");
      const account = await agentAccount.fetch(agentPDA);
      return {
        pubkey: agentPDA,
        capabilities: account.capabilities.toNumber(),
        metadataUri: account.metadataUri,
        reputation: account.reputation?.toNumber() || 0,
        lastUpdated: getAccountLastUpdated(account),
        invitesSent: account.invitesSent?.toNumber() || 0,
        lastInviteAt: account.lastInviteAt?.toNumber() || 0,
        bump: account.bump,
      };
    } catch (error: any) {
      if (error?.message?.includes("Account does not exist")) {
        return null;
      }
      throw error;
    }
  }

  async getAllAgents(limit: number = 100): Promise<AgentAccount[]> {
    try {
      // For read operations, use a read-only provider without wallet
      const readOnlyProvider = new AnchorProvider(
         this.rpc as any,
         {} as any, // No wallet needed for read operations
         { commitment: 'confirmed' }
       );

       const idl = this.ensureIDL();
       const program = new Program(idl, readOnlyProvider);

      const agentAccount = this.getAccount("agentAccount");
      const accounts = await agentAccount.all();

      return accounts.slice(0, limit).map((acc: any) => ({
        pubkey: acc.publicKey,
        capabilities: acc.account.capabilities.toNumber(),
        metadataUri: acc.account.metadataUri,
        reputation: acc.account.reputation?.toNumber() || 0,
        lastUpdated: getAccountLastUpdated(acc.account),
        bump: acc.account.bump,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }
  }
}
