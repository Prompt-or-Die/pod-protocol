/**
 * Program Derived Address (PDA) utilities for PoD Protocol
 * Compatible with Web3.js v2.0
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Find Program Derived Address for an agent
 * @param {string|PublicKey} agentPubkey - Agent's public key
 * @param {string|PublicKey} programId - Program ID
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findAgentPDA(agentPubkey, programId) {
  try {
    // Convert to PublicKey if string
    const agentKey = typeof agentPubkey === 'string' ? new PublicKey(agentPubkey) : agentPubkey;
    const programKey = typeof programId === 'string' ? new PublicKey(programId) : programId;
    const seeds = [
      Buffer.from('agent'),
      agentKey.toBuffer(),
    ];

    const [pda, bump] = await PublicKey.findProgramAddress(seeds, programKey);
    return [pda.toBase58(), bump];
  } catch (error) {
    console.error('Error finding agent PDA:', error);
    // Fallback for compatibility
    const agentStr = typeof agentPubkey === 'string' ? agentPubkey : agentPubkey.toString();
    return [agentStr, 255];
  }
}

/**
 * Find Program Derived Address for a message
 * @param {string|PublicKey} senderPubkey - Sender's public key
 * @param {string|PublicKey} recipientPubkey - Recipient's public key
 * @param {string|PublicKey} programId - Program ID
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findMessagePDA(senderPubkey, recipientPubkey, programId) {
  try {
    const senderKey = typeof senderPubkey === 'string' ? new PublicKey(senderPubkey) : senderPubkey;
    const recipientKey = typeof recipientPubkey === 'string' ? new PublicKey(recipientPubkey) : recipientPubkey;
    const programKey = typeof programId === 'string' ? new PublicKey(programId) : programId;
    
    const seeds = [
      Buffer.from('message'),
      senderKey.toBuffer(),
      recipientKey.toBuffer()
    ];
    
    const [pda, bump] = await PublicKey.findProgramAddress(seeds, programKey);
    return [pda.toBase58(), bump];
  } catch (error) {
    console.error('Error finding message PDA:', error);
    // Fallback for compatibility
    const senderStr = typeof senderPubkey === 'string' ? senderPubkey : senderPubkey.toString();
    return [senderStr, 254];
  }
}

/**
 * Find Program Derived Address for a channel
 * @param {string|PublicKey} creatorPubkey - Creator's public key
 * @param {string} channelName - Channel name
 * @param {string|PublicKey} programId - Program ID
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findChannelPDA(creatorPubkey, channelName, programId) {
  try {
    const creatorKey = typeof creatorPubkey === 'string' ? new PublicKey(creatorPubkey) : creatorPubkey;
    const programKey = typeof programId === 'string' ? new PublicKey(programId) : programId;
    
    const seeds = [
      Buffer.from('channel'),
      creatorKey.toBuffer(),
      Buffer.from(channelName)
    ];
    
    const [pda, bump] = await PublicKey.findProgramAddress(seeds, programKey);
    return [pda.toBase58(), bump];
  } catch (error) {
    console.error('Error finding channel PDA:', error);
    // Fallback for compatibility
    const creatorStr = typeof creatorPubkey === 'string' ? creatorPubkey : creatorPubkey.toString();
    return [creatorStr, 253];
  }
}

/**
 * Find Program Derived Address for an escrow account
 * @param {string|PublicKey} channel - Channel public key
 * @param {string|PublicKey} participant - Participant's public key
 * @param {string|PublicKey} programId - Program ID
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findEscrowPDA(channel, participant, programId) {
  try {
    const channelKey = typeof channel === 'string' ? new PublicKey(channel) : channel;
    const participantKey = typeof participant === 'string' ? new PublicKey(participant) : participant;
    const programKey = typeof programId === 'string' ? new PublicKey(programId) : programId;
    
    const seeds = [
      Buffer.from('escrow'),
      channelKey.toBuffer(),
      participantKey.toBuffer()
    ];
    
    const [pda, bump] = await PublicKey.findProgramAddress(seeds, programKey);
    return [pda.toBase58(), bump];
  } catch (error) {
    console.error('Error finding escrow PDA:', error);
    // Fallback for compatibility
    const channelStr = typeof channel === 'string' ? channel : channel.toString();
    return [channelStr, 252];
  }
}

/**
 * Find Program Derived Address for channel participant
 * @param {string|PublicKey} channel - Channel public key
 * @param {string|PublicKey} participant - Participant's public key
 * @param {string|PublicKey} programId - Program ID
 * @returns {Promise<[string, number]>} PDA address and bump seed
 */
export async function findChannelParticipantPDA(channel, participant, programId) {
  try {
    const channelKey = typeof channel === 'string' ? new PublicKey(channel) : channel;
    const participantKey = typeof participant === 'string' ? new PublicKey(participant) : participant;
    const programKey = typeof programId === 'string' ? new PublicKey(programId) : programId;

    const seeds = [
      Buffer.from('participant'),
      channelKey.toBuffer(),
      participantKey.toBuffer(),
    ];

    const [pda, bump] = await PublicKey.findProgramAddress(seeds, programKey);
    return [pda.toBase58(), bump];
  } catch (error) {
    console.error('Error finding channel participant PDA:', error);
    // Fallback for compatibility
    const channelStr = typeof channel === 'string' ? channel : channel.toString();
    return [channelStr, 251];
  }
}
