"""
Channel service for managing group communication in the PoD Protocol.
Provides functionality for creating, joining, and managing channels and their participants.
"""

import asyncio
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum
from solana.publickey import PublicKey
from solana.keypair import Keypair
from solana.system_program import CreateAccountParams, create_account
from solana.transaction import Transaction
from solana.rpc.types import TxOpts
from anchorpy import Provider, Program

from .base import BaseService
from ..types import ChannelVisibility, MessageType, MessageStatus
from ..utils import find_agent_pda, find_channel_pda


@dataclass
class CreateChannelOptions:
    """Options for creating a new channel."""
    name: str
    description: str
    visibility: ChannelVisibility
    max_participants: int
    fee_per_message: int


@dataclass
class BroadcastMessageOptions:
    """Options for broadcasting a message to a channel."""
    channel_pda: PublicKey
    content: str
    message_type: Optional[MessageType] = None
    reply_to: Optional[PublicKey] = None


@dataclass
class ChannelAccount:
    """Channel account data structure."""
    pubkey: PublicKey
    creator: PublicKey
    name: str
    description: str
    visibility: ChannelVisibility
    max_participants: int
    participant_count: int
    current_participants: int
    fee_per_message: int
    escrow_balance: int
    created_at: int
    is_active: bool
    bump: int


@dataclass
class ChannelParticipant:
    """Channel participant data structure."""
    channel: PublicKey
    agent: PublicKey
    joined_at: int
    permissions: List[str]
    is_active: bool
    bump: int


@dataclass
class ChannelMessage:
    """Channel message data structure."""
    pubkey: PublicKey
    channel: PublicKey
    sender: PublicKey
    content: str
    message_type: MessageType
    reply_to: Optional[PublicKey]
    created_at: int
    nonce: int
    bump: int


class ChannelService(BaseService):
    """Service for managing group communication channels."""

    async def create_channel(
        self, 
        wallet: Keypair, 
        options: CreateChannelOptions
    ) -> str:
        """
        Create a new channel.
        
        Args:
            wallet: The wallet keypair for signing
            options: Channel creation options
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive channel PDA
        channel_pda, _ = find_channel_pda(
            wallet.public_key, 
            options.name, 
            self.program_id
        )
        
        # Derive participant PDA for creator
        participant_pda, _ = self._find_participant_pda(channel_pda, agent_pda)
        
        # Convert visibility to program format
        visibility_obj = self._convert_channel_visibility(options.visibility)
        
        # Create transaction
        tx = await program.methods.create_channel(
            options.name,
            options.description,
            visibility_obj,
            options.max_participants,
            options.fee_per_message
        ).accounts({
            "agent_account": agent_pda,
            "channel_account": channel_pda,
            "participant_account": participant_pda,
            "creator": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts=TxOpts(commitment=self.commitment))
        
        return tx

    async def get_channel(self, channel_pda: PublicKey) -> Optional[ChannelAccount]:
        """
        Get channel data.
        
        Args:
            channel_pda: Channel PDA to fetch
            
        Returns:
            Channel account data or None if not found
        """
        try:
            program = self.ensure_initialized()
            account = await program.account.channel_account.fetch(channel_pda)
            return self._convert_channel_account_from_program(account, channel_pda)
        except Exception as e:
            print(f"Channel not found: {channel_pda}, error: {e}")
            return None

    async def get_all_channels(
        self, 
        limit: int = 50,
        visibility_filter: Optional[ChannelVisibility] = None
    ) -> List[ChannelAccount]:
        """
        Get all channels with optional filtering.
        
        Args:
            limit: Maximum number of channels to return
            visibility_filter: Filter by channel visibility
            
        Returns:
            List of channel accounts
        """
        try:
            program = self.ensure_initialized()
            filters = []
            
            if visibility_filter:
                # Add visibility filter
                visibility_byte = 0 if visibility_filter == ChannelVisibility.PUBLIC else 1
                filters.append({
                    "memcmp": {
                        "offset": 8 + 32 + 4 + 50 + 4 + 200,  # After name and description
                        "bytes": [visibility_byte]
                    }
                })
            
            accounts = await program.account.channel_account.all(filters=filters)
            
            result = []
            for acc in accounts[:limit]:
                channel_account = self._convert_channel_account_from_program(
                    acc.account, 
                    acc.public_key
                )
                result.append(channel_account)
            
            return result
        except Exception as e:
            print(f"Error fetching channels: {e}")
            return []

    async def get_channels_by_creator(
        self, 
        creator: PublicKey, 
        limit: int = 50
    ) -> List[ChannelAccount]:
        """
        Get channels created by a specific user.
        
        Args:
            creator: Creator's public key
            limit: Maximum number of channels to return
            
        Returns:
            List of channel accounts
        """
        try:
            program = self.ensure_initialized()
            filters = [
                {
                    "memcmp": {
                        "offset": 8,  # After discriminator
                        "bytes": str(creator)
                    }
                }
            ]
            
            accounts = await program.account.channel_account.all(filters=filters)
            
            result = []
            for acc in accounts[:limit]:
                channel_account = self._convert_channel_account_from_program(
                    acc.account, 
                    acc.public_key
                )
                result.append(channel_account)
            
            return result
        except Exception as e:
            print(f"Error fetching channels by creator: {e}")
            return []

    async def join_channel(self, wallet: Keypair, channel_pda: PublicKey) -> str:
        """
        Join a channel.
        
        Args:
            wallet: The wallet keypair for signing
            channel_pda: Channel PDA to join
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive participant PDA
        participant_pda, _ = self._find_participant_pda(channel_pda, agent_pda)
        
        # Check if invitation exists for private channels
        invitation_pda, _ = PublicKey.find_program_address(
            [
                b"invitation",
                bytes(channel_pda),
                bytes(wallet.public_key)
            ],
            self.program_id
        )
        
        # Try to fetch invitation account
        invitation_account = None
        try:
            invitation_account = await program.account.channel_invitation.fetch(invitation_pda)
        except:
            pass  # Invitation doesn't exist, which is fine for public channels
        
        tx = await program.methods.join_channel().accounts({
            "channel_account": channel_pda,
            "participant_account": participant_pda,
            "agent_account": agent_pda,
            "invitation_account": invitation_pda if invitation_account else None,
            "user": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts=TxOpts(commitment=self.commitment))
        
        return tx

    async def leave_channel(self, wallet: Keypair, channel_pda: PublicKey) -> str:
        """
        Leave a channel.
        
        Args:
            wallet: The wallet keypair for signing
            channel_pda: Channel PDA to leave
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive participant PDA
        participant_pda, _ = self._find_participant_pda(channel_pda, agent_pda)
        
        tx = await program.methods.leave_channel().accounts({
            "channel_account": channel_pda,
            "participant_account": participant_pda,
            "agent_account": agent_pda,
            "user": wallet.public_key,
        }).signers([wallet]).rpc(opts=TxOpts(commitment=self.commitment))
        
        return tx

    async def broadcast_message(
        self, 
        wallet: Keypair, 
        options: BroadcastMessageOptions
    ) -> str:
        """
        Broadcast a message to a channel.
        
        Args:
            wallet: The wallet keypair for signing
            options: Message broadcast options
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Generate unique nonce for message
        import time
        nonce = int(time.time() * 1000)
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive participant PDA
        participant_pda, _ = self._find_participant_pda(options.channel_pda, agent_pda)
        
        # Derive message PDA
        nonce_bytes = nonce.to_bytes(8, byteorder='little')
        message_pda, _ = PublicKey.find_program_address(
            [
                b"channel_message",
                bytes(options.channel_pda),
                bytes(wallet.public_key),
                nonce_bytes
            ],
            self.program_id
        )
        
        message_type_obj = self._convert_message_type(
            options.message_type or MessageType.TEXT
        )
        
        tx = await program.methods.broadcast_message(
            options.content,
            message_type_obj,
            options.reply_to,
            nonce
        ).accounts({
            "channel_account": options.channel_pda,
            "participant_account": participant_pda,
            "agent_account": agent_pda,
            "message_account": message_pda,
            "user": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts=TxOpts(commitment=self.commitment))
        
        return tx

    async def invite_to_channel(
        self, 
        wallet: Keypair, 
        channel_pda: PublicKey, 
        invitee: PublicKey
    ) -> str:
        """
        Invite a user to a channel.
        
        Args:
            wallet: The wallet keypair for signing
            channel_pda: Channel PDA
            invitee: User to invite
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive participant PDA (for inviter)
        participant_pda, _ = self._find_participant_pda(channel_pda, agent_pda)
        
        # Derive invitation PDA
        invitation_pda, _ = PublicKey.find_program_address(
            [
                b"invitation",
                bytes(channel_pda),
                bytes(invitee)
            ],
            self.program_id
        )
        
        tx = await program.methods.invite_to_channel(invitee).accounts({
            "channel_account": channel_pda,
            "participant_account": participant_pda,
            "agent_account": agent_pda,
            "invitation_account": invitation_pda,
            "inviter": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts=TxOpts(commitment=self.commitment))
        
        return tx

    async def get_channel_participants(
        self, 
        channel_pda: PublicKey, 
        limit: int = 50
    ) -> List[ChannelParticipant]:
        """
        Get channel participants.
        
        Args:
            channel_pda: Channel PDA
            limit: Maximum number of participants to return
            
        Returns:
            List of channel participants
        """
        try:
            program = self.ensure_initialized()
            filters = [
                {
                    "memcmp": {
                        "offset": 8,  # After discriminator
                        "bytes": str(channel_pda)
                    }
                }
            ]
            
            accounts = await program.account.channel_participant.all(filters=filters)
            
            result = []
            for acc in accounts[:limit]:
                participant = ChannelParticipant(
                    channel=acc.account.channel,
                    agent=acc.account.agent,
                    joined_at=acc.account.joined_at,
                    permissions=acc.account.permissions or [],
                    is_active=acc.account.is_active,
                    bump=acc.account.bump
                )
                result.append(participant)
            
            return result
        except Exception as e:
            print(f"Error fetching channel participants: {e}")
            return []

    async def get_channel_messages(
        self, 
        channel_pda: PublicKey, 
        limit: int = 50
    ) -> List[ChannelMessage]:
        """
        Get channel messages.
        
        Args:
            channel_pda: Channel PDA
            limit: Maximum number of messages to return
            
        Returns:
            List of channel messages
        """
        try:
            program = self.ensure_initialized()
            filters = [
                {
                    "memcmp": {
                        "offset": 8,  # After discriminator
                        "bytes": str(channel_pda)
                    }
                }
            ]
            
            accounts = await program.account.channel_message.all(filters=filters)
            
            result = []
            for acc in accounts[:limit]:
                message = ChannelMessage(
                    pubkey=acc.public_key,
                    channel=acc.account.channel,
                    sender=acc.account.sender,
                    content=acc.account.content,
                    message_type=self._convert_message_type_from_program(acc.account.message_type),
                    reply_to=acc.account.reply_to,
                    created_at=acc.account.created_at,
                    nonce=acc.account.nonce,
                    bump=acc.account.bump
                )
                result.append(message)
            
            return result
        except Exception as e:
            print(f"Error fetching channel messages: {e}")
            return []

    # Helper Methods
    def _convert_channel_visibility(self, visibility: ChannelVisibility) -> Dict[str, Any]:
        """Convert channel visibility to program format."""
        if visibility == ChannelVisibility.PUBLIC:
            return {"public": {}}
        elif visibility == ChannelVisibility.PRIVATE:
            return {"private": {}}
        else:
            return {"public": {}}

    def _convert_channel_visibility_from_program(self, program_visibility: Dict[str, Any]) -> ChannelVisibility:
        """Convert channel visibility from program format."""
        if "public" in program_visibility:
            return ChannelVisibility.PUBLIC
        elif "private" in program_visibility:
            return ChannelVisibility.PRIVATE
        else:
            return ChannelVisibility.PUBLIC

    def _convert_message_type(self, message_type: MessageType) -> Dict[str, Any]:
        """Convert message type to program format."""
        type_map = {
            MessageType.TEXT: {"text": {}},
            MessageType.DATA: {"data": {}},
            MessageType.COMMAND: {"command": {}},
            MessageType.RESPONSE: {"response": {}}
        }
        return type_map.get(message_type, {"text": {}})

    def _convert_message_type_from_program(self, program_type: Dict[str, Any]) -> MessageType:
        """Convert message type from program format."""
        if "text" in program_type:
            return MessageType.TEXT
        elif "data" in program_type:
            return MessageType.DATA
        elif "command" in program_type:
            return MessageType.COMMAND
        elif "response" in program_type:
            return MessageType.RESPONSE
        else:
            return MessageType.TEXT

    def _convert_channel_account_from_program(
        self, 
        account: Any, 
        public_key: PublicKey
    ) -> ChannelAccount:
        """Convert channel account from program format."""
        return ChannelAccount(
            pubkey=public_key,
            creator=account.creator,
            name=account.name,
            description=account.description,
            visibility=self._convert_channel_visibility_from_program(account.visibility),
            max_participants=account.max_participants,
            participant_count=account.current_participants,
            current_participants=account.current_participants,
            fee_per_message=account.fee_per_message or 0,
            escrow_balance=account.escrow_balance or 0,
            created_at=account.created_at or int(time.time() * 1000),
            is_active=True,
            bump=account.bump
        )

    def _find_participant_pda(self, channel_pda: PublicKey, agent_pda: PublicKey) -> tuple[PublicKey, int]:
        """Find participant PDA."""
        return PublicKey.find_program_address(
            [
                b"participant",
                bytes(channel_pda),
                bytes(agent_pda)
            ],
            self.program_id
        )
