/**
 * PDA (Program Derived Address) utilities for PoD Protocol
 */

import { Address, address } from '@solana/web3.js';

/**
 * Find Program Derived Address for an agent
 * 
 * @param {Address} agentPubkey - Agent's public key
 * @param {Address} programId - Program ID
 * @returns {[Address, number]} PDA and bump seed
 */
export function findAgentPDA(agentPubkey, programId) {
  return Address.findProgramAddressSync(
    [Buffer.from('agent'), agentPubkey.toBuffer()],
    programId
  );
}

/**
 * Find Program Derived Address for a message
 * 
 * @param {Address} sender - Sender's public key
 * @param {Address} recipient - Recipient's public key
 * @param {Buffer} payloadHash - Message payload hash
 * @param {Address} programId - Program ID
 * @returns {[Address, number]} PDA and bump seed
 */
export function findMessagePDA(sender, recipient, payloadHash, programId) {
  return Address.findProgramAddressSync(
    [
      Buffer.from('message'),
      sender.toBuffer(),
      recipient.toBuffer(),
      payloadHash
    ],
    programId
  );
}

/**
 * Find Program Derived Address for a channel
 * 
 * @param {Address} creator - Channel creator's public key
 * @param {string} name - Channel name
 * @param {Address} programId - Program ID
 * @returns {[Address, number]} PDA and bump seed
 */
export function findChannelPDA(creator, name, programId) {
  return Address.findProgramAddressSync(
    [
      Buffer.from('channel'),
      creator.toBuffer(),
      Buffer.from(name, 'utf-8')
    ],
    programId
  );
}

/**
 * Find Program Derived Address for escrow
 * 
 * @param {Address} channel - Channel public key
 * @param {Address} depositor - Depositor's public key
 * @param {Address} programId - Program ID
 * @returns {[Address, number]} PDA and bump seed
 */
export function findEscrowPDA(channel, depositor, programId) {
  return Address.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      channel.toBuffer(),
      depositor.toBuffer()
    ],
    programId
  );
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
