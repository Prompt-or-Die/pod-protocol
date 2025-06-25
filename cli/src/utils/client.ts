import { PodComClient } from "@pod-protocol/sdk";
import { getNetworkEndpoint, loadKeypair } from "./config.js";
import { generateKeyPairSigner, address } from "@solana/web3.js";
import type { KeyPairSigner, Address } from "@solana/web3.js";

export async function createClient(
  network?: string,
  wallet?: any,
): Promise<PodComClient> {
  const client = new PodComClient({
    endpoint: getNetworkEndpoint(network),
    commitment: "confirmed",
    // Disable IPFS in CLI environments to avoid native module issues
    ipfs: {
      disabled: true,
      timeout: 30000,
      gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
    },
    zkCompression: {
      lightRpcUrl: process.env.LIGHT_RPC_URL,
      compressionRpcUrl: process.env.COMPRESSION_RPC_URL,
      proverUrl: process.env.PROVER_URL,
      photonIndexerUrl: process.env.PHOTON_INDEXER_URL,
      lightSystemProgram: process.env.LIGHT_SYSTEM_PROGRAM
        ? address(process.env.LIGHT_SYSTEM_PROGRAM)
        : undefined,
      nullifierQueuePubkey: process.env.LIGHT_NULLIFIER_QUEUE
        ? address(process.env.LIGHT_NULLIFIER_QUEUE)
        : undefined,
      cpiAuthorityPda: process.env.LIGHT_CPI_AUTHORITY
        ? address(process.env.LIGHT_CPI_AUTHORITY)
        : undefined,
      compressedTokenProgram: process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM
        ? address(process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM)
        : undefined,
      registeredProgramId: process.env.LIGHT_REGISTERED_PROGRAM_ID
        ? address(process.env.LIGHT_REGISTERED_PROGRAM_ID)
        : undefined,
      noopProgram: process.env.LIGHT_NOOP_PROGRAM
        ? address(process.env.LIGHT_NOOP_PROGRAM)
        : undefined,
      accountCompressionAuthority: process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY
        ? address(process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY)
        : undefined,
      accountCompressionProgram: process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM
        ? address(process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM)
        : undefined,
    },
  });
  await client.initialize(wallet);
  return client;
}

export function getWallet(keypairPath?: string): any {
  const keypair = loadKeypair(keypairPath);

  // Return wallet-like interface that Anchor expects
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map((tx) => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
}

export function getKeypair(keypairPath?: string): KeyPairSigner {
  return loadKeypair(keypairPath);
}
