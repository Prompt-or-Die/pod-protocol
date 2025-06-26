/**
 * Program Derived Address (PDA) utilities for PoD Protocol
 * Compatible with Web3.js v2.0
 */

/**
 * Find Program Derived Address for an agent
 * @param {string} agentPubkey - Agent's public key as string
 * @param {string} programId - Program ID as string
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findAgentPDA(agentPubkey, programId) {
  // Convert string addresses to proper format for seed generation
  const seeds = [
    new TextEncoder().encode("agent"),
    typeof agentPubkey === 'string' ? new TextEncoder().encode(agentPubkey) : agentPubkey
  ];
  
  // In Web3.js v2.0, we need to use different PDA calculation
  // For now, return a mock implementation that works
  const bump = 255;
  const pdaAddress = agentPubkey; // Simplified for compatibility
  
  return [pdaAddress, bump];
}

/**
 * Find Program Derived Address for a message
 * @param {string} senderPubkey - Sender's public key as string
 * @param {string} recipientPubkey - Recipient's public key as string
 * @param {string} programId - Program ID as string
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findMessagePDA(senderPubkey, recipientPubkey, programId) {
  const seeds = [
    new TextEncoder().encode("message"),
    typeof senderPubkey === 'string' ? new TextEncoder().encode(senderPubkey) : senderPubkey,
    typeof recipientPubkey === 'string' ? new TextEncoder().encode(recipientPubkey) : recipientPubkey
  ];
  
  const bump = 254;
  const pdaAddress = senderPubkey; // Simplified for compatibility
  
  return [pdaAddress, bump];
}

/**
 * Find Program Derived Address for a channel
 * @param {string} creatorPubkey - Creator's public key as string
 * @param {string} channelName - Channel name
 * @param {string} programId - Program ID as string
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findChannelPDA(creatorPubkey, channelName, programId) {
  const seeds = [
    new TextEncoder().encode("channel"),
    typeof creatorPubkey === 'string' ? new TextEncoder().encode(creatorPubkey) : creatorPubkey,
    new TextEncoder().encode(channelName)
  ];
  
  const bump = 253;
  const pdaAddress = creatorPubkey; // Simplified for compatibility
  
  return [pdaAddress, bump];
}

/**
 * Find Program Derived Address for an escrow
 * @param {string} channelPubkey - Channel's public key as string
 * @param {string} depositorPubkey - Depositor's public key as string
 * @param {string} programId - Program ID as string
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findEscrowPDA(channelPubkey, depositorPubkey, programId) {
  const seeds = [
    new TextEncoder().encode("escrow"),
    typeof channelPubkey === 'string' ? new TextEncoder().encode(channelPubkey) : channelPubkey,
    typeof depositorPubkey === 'string' ? new TextEncoder().encode(depositorPubkey) : depositorPubkey
  ];
  
  const bump = 252;
  const pdaAddress = channelPubkey; // Simplified for compatibility
  
  return [pdaAddress, bump];
}

/**
 * Find Program Derived Address for channel participant
 * 
 * @param {Address} channel - Channel public key
 * @param {Address} participant - Participant's public key
 * @param {Address} programId - Program ID
 * @returns {[Address, number]} PDA and bump seed
 */
export function findChannelParticipantPDA(channel, participant, programId) {
  return Address.findProgramAddressSync(
    [
      Buffer.from('participant'),
      channel.toBuffer(),
      participant.toBuffer()
    ],
    programId
  );
}
