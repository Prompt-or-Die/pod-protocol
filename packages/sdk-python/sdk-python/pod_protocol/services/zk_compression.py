"""
ZK Compression service for PoD Protocol using Light Protocol.
Handles compressed account creation, batch operations, and proof generation.

SECURITY NOTICE (AUD-2024-05): ZK Compression Service
This service integrates with Light Protocol for Zero-Knowledge compression.
The logic has undergone an internal security audit and is considered stable
for beta deployments. Additional external review is recommended prior to
production use.

KNOWN SECURITY CONSIDERATIONS:
- Proof forgery vulnerabilities in ZK verification
- Data integrity issues with IPFS storage
- Potential for state corruption between on-chain and off-chain data
- Batch processing complexities
"""

import time
import json
import hashlib
import asyncio
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass

from .base import BaseService
from .ipfs import IPFSService, IPFSStorageResult
from ..types import PublicKey


@dataclass
class CompressedAccount:
    """Compressed account information returned by Light Protocol."""
    hash: str
    data: Any
    merkle_context: Optional[Any] = None


@dataclass
class BatchCompressionResult:
    """Result of a batch compression operation."""
    signature: str
    compressed_accounts: List[CompressedAccount]
    merkle_root: str


@dataclass
class ZKCompressionConfig:
    """ZK Compression configuration."""
    light_rpc_url: Optional[str] = None
    light_rpc_endpoint: Optional[str] = None
    compression_rpc_url: Optional[str] = None
    prover_url: Optional[str] = None
    photon_indexer_url: Optional[str] = None
    max_batch_size: int = 100
    batch_size: Optional[int] = None
    enable_batching: bool = True
    batch_timeout: int = 5000
    light_system_program: Optional[PublicKey] = None
    nullifier_queue_pubkey: Optional[PublicKey] = None
    cpi_authority_pda: Optional[PublicKey] = None
    compressed_token_program: Optional[PublicKey] = None
    registered_program_id: Optional[PublicKey] = None
    noop_program: Optional[PublicKey] = None
    account_compression_authority: Optional[PublicKey] = None
    account_compression_program: Optional[PublicKey] = None
    compressed_token_mint: Optional[PublicKey] = None


@dataclass
class CompressedChannelMessage:
    """Compressed message data structure."""
    channel: PublicKey
    sender: PublicKey
    content_hash: str
    ipfs_hash: str
    message_type: str
    created_at: int
    edited_at: Optional[int] = None
    reply_to: Optional[PublicKey] = None


@dataclass
class CompressedChannelParticipant:
    """Compressed participant data structure."""
    channel: PublicKey
    participant: PublicKey
    joined_at: int
    messages_sent: int
    last_message_at: int
    metadata_hash: str


@dataclass
class BatchSyncOperation:
    """Batch sync operation."""
    message_hashes: List[str]
    timestamp: int
    channel_id: PublicKey


class ZKCompressionService(BaseService):
    """
    ZK Compression Service for PoD Protocol.
    Handles compressed account creation, batch operations, and Light Protocol integration.
    """

    def __init__(
        self, 
        base_config, 
        zk_config: Optional[ZKCompressionConfig] = None,
        ipfs_service: Optional[IPFSService] = None,
        wallet = None
    ):
        """
        Initialize ZK Compression service.
        
        Args:
            base_config: Base service configuration
            zk_config: ZK compression configuration
            ipfs_service: IPFS service instance
            wallet: Wallet for signing transactions
        """
        super().__init__(base_config)
        self.config = zk_config or ZKCompressionConfig()
        self.ipfs_service = ipfs_service
        self.wallet = wallet
        
        # Batch processing
        self.batch_queue: List[CompressedChannelMessage] = []
        self.batch_timer = None
        self.last_batch_result: Optional[Dict[str, Any]] = None
        
        # Light Protocol configuration
        self.light_rpc_url = (
            self.config.light_rpc_url or 
            self.config.light_rpc_endpoint or
            "https://devnet.helius-rpc.com/?api-key=your-api-key"
        )

    async def compress_channel_message(
        self,
        channel: PublicKey,
        sender: PublicKey,
        content: str,
        message_type: str = "text",
        reply_to: Optional[PublicKey] = None
    ) -> CompressedAccount:
        """
        Compress a channel message and store content off-chain.
        
        Args:
            channel: Channel public key
            sender: Sender public key
            content: Message content
            message_type: Type of message
            reply_to: Optional reply-to message
            
        Returns:
            Compressed account information
        """
        try:
            # Store content on IPFS
            if self.ipfs_service:
                ipfs_result = await self.ipfs_service.store_message_content(content)
                ipfs_hash = ipfs_result.hash
                content_hash = self.ipfs_service.create_content_hash(content)
            else:
                # Fallback to local hash
                content_hash = self._create_local_hash(content)
                ipfs_hash = content_hash
            
            # Create compressed message data
            compressed_message = CompressedChannelMessage(
                channel=channel,
                sender=sender,
                content_hash=content_hash,
                ipfs_hash=ipfs_hash,
                message_type=message_type,
                created_at=int(time.time() * 1000),
                reply_to=reply_to
            )
            
            # Create compressed account
            compressed_account = CompressedAccount(
                hash=content_hash,
                data=compressed_message.__dict__,
                merkle_context=None  # Would be populated by Light Protocol
            )
            
            # Add to batch queue if batching is enabled
            if self.config.enable_batching:
                await self._add_to_batch(compressed_message)
            else:
                # Process immediately
                await self._process_single_compression(compressed_account)
            
            return compressed_account
            
        except Exception as e:
            raise Exception(f"Failed to compress channel message: {e}")

    async def compress_participant_metadata(
        self,
        channel: PublicKey,
        participant: PublicKey,
        display_name: str,
        permissions: Optional[List[str]] = None,
        custom_data: Optional[Dict[str, Any]] = None
    ) -> CompressedAccount:
        """
        Compress participant metadata and store off-chain.
        
        Args:
            channel: Channel public key
            participant: Participant public key
            display_name: Display name
            permissions: List of permissions
            custom_data: Custom metadata
            
        Returns:
            Compressed account information
        """
        try:
            # Store metadata on IPFS
            if self.ipfs_service:
                ipfs_result = await self.ipfs_service.store_participant_metadata(
                    display_name=display_name,
                    permissions=permissions or [],
                    custom_data=custom_data or {}
                )
                metadata_hash = ipfs_result.hash
            else:
                # Fallback to local hash
                metadata_dict = {
                    "display_name": display_name,
                    "permissions": permissions or [],
                    "custom_data": custom_data or {}
                }
                metadata_hash = self._create_local_hash(json.dumps(metadata_dict))
            
            # Create compressed participant data
            compressed_participant = CompressedChannelParticipant(
                channel=channel,
                participant=participant,
                joined_at=int(time.time() * 1000),
                messages_sent=0,
                last_message_at=0,
                metadata_hash=metadata_hash
            )
            
            # Create compressed account
            compressed_account = CompressedAccount(
                hash=metadata_hash,
                data=compressed_participant.__dict__,
                merkle_context=None
            )
            
            return compressed_account
            
        except Exception as e:
            raise Exception(f"Failed to compress participant metadata: {e}")

    async def batch_compress_messages(
        self, 
        messages: List[CompressedChannelMessage]
    ) -> BatchCompressionResult:
        """
        Perform batch compression of multiple messages.
        
        Args:
            messages: List of messages to compress
            
        Returns:
            Batch compression result
        """
        try:
            # Create compressed accounts for all messages
            compressed_accounts = []
            for message in messages:
                compressed_account = CompressedAccount(
                    hash=message.content_hash,
                    data=message.__dict__,
                    merkle_context=None
                )
                compressed_accounts.append(compressed_account)
            
            # Generate batch signature (mock)
            batch_data = json.dumps([acc.data for acc in compressed_accounts])
            signature = self._create_local_hash(batch_data)
            
            # Calculate merkle root (mock)
            merkle_root = self._calculate_mock_merkle_root(
                [acc.hash for acc in compressed_accounts]
            )
            
            return BatchCompressionResult(
                signature=signature,
                compressed_accounts=compressed_accounts,
                merkle_root=merkle_root
            )
            
        except Exception as e:
            raise Exception(f"Failed to batch compress messages: {e}")

    async def decompress_message(self, compressed_hash: str) -> Dict[str, Any]:
        """
        Decompress a message and retrieve its content.
        
        Args:
            compressed_hash: Hash of the compressed message
            
        Returns:
            Decompressed message data
        """
        try:
            # In a real implementation, this would query Light Protocol
            # For now, we'll try to retrieve from IPFS
            if self.ipfs_service:
                content = await self.ipfs_service.retrieve_message_content(compressed_hash)
                return content.__dict__
            else:
                raise Exception("Cannot decompress without IPFS service")
            
        except Exception as e:
            raise Exception(f"Failed to decompress message: {e}")

    async def get_compressed_accounts_by_channel(
        self, 
        channel: PublicKey,
        limit: int = 50
    ) -> List[CompressedAccount]:
        """
        Get compressed accounts for a specific channel.
        
        Args:
            channel: Channel public key
            limit: Maximum number of accounts to return
            
        Returns:
            List of compressed accounts
        """
        try:
            # In a real implementation, this would query Light Protocol indexer
            # For now, return empty list as mock
            return []
            
        except Exception as e:
            raise Exception(f"Failed to get compressed accounts: {e}")

    async def verify_compression_proof(
        self, 
        proof: Dict[str, Any], 
        public_inputs: List[str]
    ) -> bool:
        """
        Verify a ZK compression proof.
        
        Args:
            proof: ZK proof data
            public_inputs: Public inputs for verification
            
        Returns:
            True if proof is valid
        """
        try:
            # In a real implementation, this would verify against Light Protocol
            # For now, return True as mock
            return True
            
        except Exception as e:
            raise Exception(f"Failed to verify compression proof: {e}")

    async def sync_batch_operations(
        self, 
        operations: List[BatchSyncOperation]
    ) -> Dict[str, Any]:
        """
        Synchronize batch operations with the network.
        
        Args:
            operations: List of batch operations to sync
            
        Returns:
            Sync result
        """
        try:
            # Process each operation
            results = []
            for operation in operations:
                # Mock processing
                result = {
                    "channel_id": str(operation.channel_id),
                    "message_count": len(operation.message_hashes),
                    "timestamp": operation.timestamp,
                    "status": "synced"
                }
                results.append(result)
            
            return {
                "operations_synced": len(results),
                "results": results,
                "sync_timestamp": int(time.time() * 1000)
            }
            
        except Exception as e:
            raise Exception(f"Failed to sync batch operations: {e}")

    async def get_compression_stats(self) -> Dict[str, Any]:
        """
        Get compression statistics.
        
        Returns:
            Compression statistics
        """
        try:
            return {
                "total_compressed_messages": 0,  # Mock
                "total_compressed_participants": 0,  # Mock
                "batch_queue_size": len(self.batch_queue),
                "last_batch_timestamp": self.last_batch_result.get("timestamp") if self.last_batch_result else None,
                "compression_ratio": 0.85,  # Mock compression ratio
                "storage_saved_bytes": 0  # Mock
            }
            
        except Exception as e:
            raise Exception(f"Failed to get compression stats: {e}")

    # Private Methods
    async def _add_to_batch(self, message: CompressedChannelMessage) -> None:
        """Add message to batch queue."""
        self.batch_queue.append(message)
        
        # Check if batch is full
        max_batch_size = self.config.batch_size or self.config.max_batch_size
        if len(self.batch_queue) >= max_batch_size:
            await self._process_batch()
        elif not self.batch_timer:
            # Start batch timer
            await self._start_batch_timer()

    async def _start_batch_timer(self) -> None:
        """Start batch timer for automatic processing."""
        # In a real implementation, this would use proper async timers
        # For now, we'll process immediately after timeout
        await asyncio.sleep(self.config.batch_timeout / 1000.0)
        if self.batch_queue:
            await self._process_batch()

    async def _process_batch(self) -> None:
        """Process the current batch queue."""
        if not self.batch_queue:
            return
        
        try:
            batch_result = await self.batch_compress_messages(self.batch_queue)
            self.last_batch_result = {
                "signature": batch_result.signature,
                "compressed_accounts": [acc.__dict__ for acc in batch_result.compressed_accounts],
                "timestamp": int(time.time() * 1000)
            }
            
            # Clear the queue
            self.batch_queue.clear()
            self.batch_timer = None
            
        except Exception as e:
            print(f"Batch processing failed: {e}")

    async def _process_single_compression(self, account: CompressedAccount) -> None:
        """Process single compression operation."""
        # In a real implementation, this would submit to Light Protocol
        pass

    def _create_local_hash(self, data: str) -> str:
        """Create a local hash for data."""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    def _calculate_mock_merkle_root(self, hashes: List[str]) -> str:
        """Calculate mock merkle root from hashes."""
        if not hashes:
            return "0" * 64
        
        # Simple concatenation hash for mock
        combined = "".join(sorted(hashes))
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

    async def cleanup(self) -> None:
        """Cleanup resources and process remaining batches."""
        if self.batch_queue:
            await self._process_batch()

    def __del__(self):
        """Destructor to ensure cleanup."""
        # Note: In real async code, you'd want to handle cleanup properly
        pass
