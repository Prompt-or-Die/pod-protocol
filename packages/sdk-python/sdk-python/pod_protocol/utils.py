"""
PoD Protocol Python SDK - Utility functions for PDA derivation and cryptography
"""

from solders.pubkey import Pubkey
import hashlib

# PDA utilities

def find_agent_pda(agent_pubkey: Pubkey, program_id: Pubkey):
    seeds = [b"agent", bytes(agent_pubkey)]
    return Pubkey.find_program_address(seeds, program_id)

def find_message_pda(sender: Pubkey, recipient: Pubkey, payload_hash: bytes, program_id: Pubkey):
    seeds = [b"message", bytes(sender), bytes(recipient), payload_hash]
    return Pubkey.find_program_address(seeds, program_id)

def find_channel_pda(creator: Pubkey, name: str, program_id: Pubkey):
    seeds = [b"channel", bytes(creator), name.encode("utf-8")]
    return Pubkey.find_program_address(seeds, program_id)

def find_escrow_pda(channel: Pubkey, depositor: Pubkey, program_id: Pubkey):
    seeds = [b"escrow", bytes(channel), bytes(depositor)]
    return Pubkey.find_program_address(seeds, program_id)

def hash_payload(payload: str) -> bytes:
    return hashlib.sha256(payload.encode("utf-8")).digest()

def verify_payload_hash(payload: str, hash_bytes: bytes) -> bool:
    return hash_payload(payload) == hash_bytes

def lamports_to_sol(lamports: int) -> float:
    return lamports / 1_000_000_000

def sol_to_lamports(sol: float) -> int:
    return int(sol * 1_000_000_000)

def is_valid_public_key(pubkey: str) -> bool:
    try:
        Pubkey.from_string(pubkey)
        return True
    except Exception:
        return False

class SecureMemoryManager:
    """
    Secure memory manager for protecting sensitive data
    """
    def __init__(self):
        self.secure_buffers = set()

    def create_secure_buffer(self, size: int):
        buf = bytearray(size)
        self.secure_buffers.add(id(buf))
        return buf

    def clear_buffer(self, buf):
        for i in range(len(buf)):
            buf[i] = 0
        self.secure_buffers.discard(id(buf))

    def cleanup(self):
        # In Python, garbage collection will handle most cleanup
        self.secure_buffers.clear()
