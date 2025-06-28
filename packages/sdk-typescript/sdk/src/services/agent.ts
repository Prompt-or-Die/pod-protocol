import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { generateKeyPairSigner } from '@solana/signers';
import * as anchor from "@coral-xyz/anchor";
const { BN, AnchorProvider, Program } = anchor;
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
    const [agentPDA] = await findAgentPDA(wallet.address, this.programId);

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
        const tx = await (program.methods as unknown as {
          // eslint-disable-next-line no-unused-vars
          registerAgent: (_capabilities: anchor.BN, _metadataUri: string) => {
            // eslint-disable-next-line no-unused-vars
            accounts: (_accounts: {
              agentAccount: Address;
              signer: Address;
              systemProgram: string;
            }) => {
              rpc: () => Promise<string>;
            };
          };
        })
          .registerAgent(new BN(options.capabilities), options.metadataUri)
          .accounts({
            agentAccount: agentPDA,
            signer: wallet.address,
            systemProgram: "11111111111111111111111111111112", // System Program ID
          })
          .rpc();

        return tx;
      } catch (error: unknown) {
        // Provide more specific error messages
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes("Account does not exist")) {
          throw new Error(
            "Program account not found. Verify the program is deployed and the program ID is correct.",
          );
        }
        if (errorMessage?.includes("insufficient funds")) {
          throw new Error(
            "Insufficient SOL balance to pay for transaction fees and rent.",
          );
        }
        if (errorMessage?.includes("custom program error")) {
          throw new Error(
            `Program error: ${errorMessage}. Check program logs for details.`,
          );
        }
        throw new Error(`Agent registration failed: ${errorMessage}`);
      }
    });
  }

  async updateAgent(
    wallet: KeyPairSigner,
    options: UpdateAgentOptions,
  ): Promise<string> {
    const [agentPDA] = await findAgentPDA(wallet.address, this.programId);

    return retry(async () => {
      // Use the program if it was initialized with a wallet, otherwise create a fresh one
      let program;
      if (this.program) {
        // Program was pre-initialized with the wallet
        program = this.program;
      } else {
        // Fallback: create a fresh provider with the actual wallet for this transaction
        const provider = new AnchorProvider(
          this.rpc as unknown as anchor.Provider['connection'],
          wallet as unknown as anchor.Wallet,
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

      const tx = await (program.methods as unknown as {
        // eslint-disable-next-line no-unused-vars
        updateAgent: (_capabilities: anchor.BN | null, _metadataUri: string | null) => {
          // eslint-disable-next-line no-unused-vars
          accounts: (_accounts: {
            agentAccount: Address;
            signer: Address;
          }) => {
            rpc: () => Promise<string>;
          };
        };
      })
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
    const [agentPDA] = await findAgentPDA(walletAddress, this.programId);

    try {
      // Use the program if it was initialized, otherwise create a temporary one
      let program;
      if (this.program) {
        // Program was pre-initialized, use it
        program = this.program;
      } else {
        // For read operations, use a read-only provider without wallet
        const tempKeyPairSigner = await generateKeyPairSigner();
        const readOnlyWallet = {
          publicKey: tempKeyPairSigner.address as unknown as anchor.web3.PublicKey,
          signTransaction: async () => { throw new Error('Read-only wallet'); },
          signAllTransactions: async () => { throw new Error('Read-only wallet'); },
          payer: {} as any // Add missing payer property
        } as anchor.Wallet;
        const readOnlyProvider = new AnchorProvider(
          this.rpc as unknown as anchor.Provider['connection'],
          readOnlyWallet,
          { commitment: 'confirmed' }
        );

        const idl = this.ensureIDL();
        program = new Program(idl, readOnlyProvider);
      }

      // eslint-disable-next-line no-unused-vars
      const agentAccount = (program.account as unknown as { agentAccount: { fetch: (_address: Address) => Promise<unknown> } }).agentAccount;
      const account = await agentAccount.fetch(agentPDA) as {
        capabilities: anchor.BN;
        metadataUri: string;
        reputation?: anchor.BN;
        invitesSent?: anchor.BN;
        lastInviteAt?: anchor.BN;
        bump: number;
        [key: string]: unknown;
      };
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
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes("Account does not exist")) {
        return null;
      }
      throw error;
    }
  }

  async getAllAgents(limit: number = 100): Promise<AgentAccount[]> {
    try {
      // For read operations, use a read-only provider without wallet
      const tempKeyPairSigner = await generateKeyPairSigner();
      const readOnlyWallet = {
        publicKey: tempKeyPairSigner.address as unknown as anchor.web3.PublicKey,
        signTransaction: async () => { throw new Error('Read-only wallet'); },
        signAllTransactions: async () => { throw new Error('Read-only wallet'); },
        payer: {} as any // Add missing payer property
      } as anchor.Wallet;
      const readOnlyProvider = new AnchorProvider(
         this.rpc as unknown as anchor.Provider['connection'],
         readOnlyWallet,
         { commitment: 'confirmed' }
       );

       const idl = this.ensureIDL();
       const program = new Program(idl, readOnlyProvider);

      const agentAccount = (program.account as unknown as { agentAccount: { all: () => Promise<unknown[]> } }).agentAccount;
      const accounts = await agentAccount.all();

      return accounts.slice(0, limit).map((acc: {
        publicKey: Address;
        account: {
          capabilities: anchor.BN;
          metadataUri: string;
          reputation?: anchor.BN;
          bump: number;
          [key: string]: unknown;
        };
      }) => ({
        pubkey: acc.publicKey,
        capabilities: acc.account.capabilities.toNumber(),
        metadataUri: acc.account.metadataUri,
        reputation: acc.account.reputation?.toNumber() || 0,
        lastUpdated: getAccountLastUpdated(acc.account),
        invitesSent: 0,
        lastInviteAt: 0,
        bump: acc.account.bump,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch agents: ${errorMessage}`);
    }
  }
}
