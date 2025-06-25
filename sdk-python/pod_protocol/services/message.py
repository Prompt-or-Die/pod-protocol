"""
Message service for PoD Protocol Python SDK
"""

import time
from typing import Optional, List, Dict, Any
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from anchorpy import Context
from .base import BaseService
from ..types import MessageAccount, SendMessageOptions, MessageType
from ..utils import find_agent_pda, find_message_pda, hash_payload
from ..exceptions import PodProtocolError

class MessageService(BaseService):
    """
    Service for managing messages in the PoD Protocol
    """
    async def send(self, options: SendMessageOptions, wallet: Keypair) -> str:
        """
        Send a message to another agent
        Args:
            options: Message options
            wallet: Sender's wallet
        Returns:
            Transaction signature
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        recipient_pda, _ = find_agent_pda(options.recipient, self.program_id)
        try:
            await self.program.account["agent_account"].fetch(recipient_pda)
        except Exception:
            raise PodProtocolError("Recipient agent not found")
        payload_hash = hash_payload(options.content)
        message_pda, _ = find_message_pda(wallet.pubkey(), options.recipient, payload_hash, self.program_id)
        expiration_days = options.expiration_days if hasattr(options, 'expiration_days') else 7
        
        # Calculate expiration timestamp (current time + expiration days in seconds)
        expires_at = int(time.time()) + (expiration_days * 24 * 60 * 60)
        tx = await self.program.rpc["send_message"](
            list(payload_hash),
            options.content,
            options.message_type if hasattr(options, 'message_type') else MessageType.TEXT,
            expires_at,
            ctx=Context(
                accounts={
                    "message_account": message_pda,
                    "sender": wallet.pubkey(),
                    "recipient": options.recipient,
                },
                signers=[wallet],
            ),
        )
        return tx

    async def get(self, message_pda: Pubkey) -> Optional[MessageAccount]:
        """
        Get a message by its PDA
        Args:
            message_pda: Message PDA
        Returns:
            Message account data or None if not found
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        try:
            account = await self.program.account["message_account"].fetch(message_pda)
            return MessageAccount(
                pubkey=message_pda,
                sender=account.sender,
                recipient=account.recipient,
                payload_hash=account.payload_hash,
                payload=account.payload,
                message_type=account.message_type,
                timestamp=account.timestamp,
                created_at=account.timestamp,
                expires_at=account.expires_at,
                status=account.status,
                bump=account.bump,
            )
        except Exception as e:
            if "Account does not exist" in str(e):
                return None
            raise

    async def get_for_agent(self, agent_pubkey: Pubkey, direction: str = 'both', limit: int = 100, status: Optional[str] = None) -> List[MessageAccount]:
        """
        Get messages for an agent (sent or received)
        Args:
            agent_pubkey: Agent's public key
            direction: 'sent', 'received', or 'both'
            limit: Maximum number of messages
            status: Filter by message status
        Returns:
            List of message accounts
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        accounts = await self.program.account["message_account"].all()
        messages = []
        for acc in accounts:
            msg = MessageAccount(
                pubkey=acc.public_key,
                sender=acc.account.sender,
                recipient=acc.account.recipient,
                payload_hash=acc.account.payload_hash,
                payload=acc.account.payload,
                message_type=acc.account.message_type,
                timestamp=acc.account.timestamp,
                created_at=acc.account.timestamp,
                expires_at=acc.account.expires_at,
                status=acc.account.status,
                bump=acc.account.bump,
            )
            if direction == 'sent' and msg.sender != agent_pubkey:
                continue
            if direction == 'received' and msg.recipient != agent_pubkey:
                continue
            if status and msg.status != status:
                continue
            messages.append(msg)
        messages.sort(key=lambda m: m.timestamp, reverse=True)
        return messages[:limit]
