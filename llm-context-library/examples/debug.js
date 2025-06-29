const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const {
  findAgentPDA,
  findMessagePDA,
  hashPayload,
  getMessageTypeId,
} = require("../sdk/dist/index.js");

// Configure the client
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.PodCom;
const wallet = provider.wallet.payer;

async function debug() {
  try {
    console.log("Wallet pubkey:", wallet.publicKey.toBase58());

    const [agentPDA] = findAgentPDA(wallet.publicKey, program.programId);
    console.log("Agent PDA:", agentPDA.toBase58());

    const agentAccount = await program.account.agentAccount.fetch(agentPDA);
    console.log("Agent account data:");
    console.log("- pubkey:", agentAccount.pubkey.toBase58());
    console.log("- capabilities:", agentAccount.capabilities.toString());
    console.log("- metadataUri:", agentAccount.metadataUri);
    console.log("- reputation:", agentAccount.reputation.toString());

    // Test message PDA calculation using proper SDK functions
    const messageType = { text: {} };
    const payloadHash = new Uint8Array(32).fill(1);

    console.log("\n=== PDA Calculation Comparison ===");

    // ✅ CORRECT: Using SDK function (should match program implementation)
    const [messagePDACorrect] = findMessagePDA(
      agentPDA,
      wallet.publicKey,
      payloadHash,
      messageType,
      program.programId,
    );
    console.log("✅ SDK PDA (CORRECT):", messagePDACorrect.toBase58());

    // ❌ MANUAL: Manual calculation (may not match program)
    const messageTypeId = getMessageTypeId("Text"); // Use proper conversion
    const [messagePDAManual] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"),
        agentPDA.toBuffer(),
        wallet.publicKey.toBuffer(),
        Buffer.from(payloadHash),
        Buffer.from([messageTypeId]),
      ],
      program.programId,
    );
    console.log("🔧 Manual PDA:", messagePDAManual.toBase58());

    // Compare results
    const pdaMatch = messagePDACorrect.equals(messagePDAManual);
    console.log(`🔍 PDA Match: ${pdaMatch ? "✅ YES" : "❌ NO"}`);

    if (!pdaMatch) {
      console.log("⚠️  PDA MISMATCH DETECTED!");
      console.log(
        "   This indicates the manual calculation doesn't match the SDK.",
      );
      console.log(
        "   Always use findMessagePDA() from the SDK for consistency.",
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    console.error("\n💡 Make sure to build the SDK first:");
    console.error("   cd sdk && bun run build");
  }
}

debug();
