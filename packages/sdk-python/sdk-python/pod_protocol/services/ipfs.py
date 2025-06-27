"""
IPFS service for handling off-chain storage of PoD Protocol data.
Integrates with ZK compression for cost-effective data management.
"""

import time
import json
import hashlib
from typing import List, Optional, Dict, Any, Union, NamedTuple
from dataclasses import dataclass

from .base import BaseService


@dataclass
class IPFSConfig:
    """IPFS configuration options."""
    disabled: bool = False
    timeout: int = 30000
    gateway_url: str = "https://ipfs.io/ipfs"


@dataclass
class ChannelMessageContent:
    """Channel message content structure for IPFS storage."""
    content: str
    attachments: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: int = 0
    version: str = "1.0.0"
    
    def __post_init__(self):
        if self.timestamp == 0:
            self.timestamp = int(time.time() * 1000)
        if self.attachments is None:
            self.attachments = []
        if self.metadata is None:
            self.metadata = {}


@dataclass
class ParticipantExtendedMetadata:
    """Participant extended metadata structure for IPFS storage."""
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    permissions: Optional[List[str]] = None
    custom_data: Optional[Dict[str, Any]] = None
    last_updated: int = 0
    
    def __post_init__(self):
        if self.last_updated == 0:
            self.last_updated = int(time.time() * 1000)
        if self.permissions is None:
            self.permissions = []
        if self.custom_data is None:
            self.custom_data = {}


@dataclass
class IPFSStorageResult:
    """IPFS storage result."""
    hash: str
    cid: str  # Same as hash for compatibility
    size: int
    url: str


class IPFSService(BaseService):
    """
    IPFS Service for handling off-chain storage of PoD Protocol data.
    
    Note: This is a mock implementation for environments where IPFS is not available.
    In production, this would integrate with actual IPFS nodes or services.
    """

    def __init__(self, base_config, ipfs_config: Optional[IPFSConfig] = None):
        """
        Initialize IPFS service.
        
        Args:
            base_config: Base service configuration
            ipfs_config: IPFS-specific configuration
        """
        super().__init__(base_config)
        self.config = ipfs_config or IPFSConfig()
        self._storage = {}  # Mock storage for development/testing

    async def store_message_content(
        self,
        content: str,
        attachments: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> IPFSStorageResult:
        """
        Store channel message content on IPFS.
        
        Args:
            content: Message content
            attachments: List of attachment hashes
            metadata: Additional metadata
            
        Returns:
            IPFS storage result
        """
        message_content = ChannelMessageContent(
            content=content,
            attachments=attachments or [],
            metadata=metadata or {}
        )
        
        return await self.store_json(message_content.__dict__)

    async def store_participant_metadata(
        self,
        display_name: str,
        avatar: Optional[str] = None,
        permissions: Optional[List[str]] = None,
        custom_data: Optional[Dict[str, Any]] = None
    ) -> IPFSStorageResult:
        """
        Store participant extended metadata on IPFS.
        
        Args:
            display_name: Display name
            avatar: Avatar URL or hash
            permissions: List of permissions
            custom_data: Custom metadata
            
        Returns:
            IPFS storage result
        """
        participant_metadata = ParticipantExtendedMetadata(
            display_name=display_name,
            avatar=avatar,
            permissions=permissions or [],
            custom_data=custom_data or {}
        )
        
        return await self.store_json(participant_metadata.__dict__)

    async def store_json(self, data: Any) -> IPFSStorageResult:
        """
        Store arbitrary JSON data on IPFS.
        
        Args:
            data: Data to store
            
        Returns:
            IPFS storage result
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # Serialize data
            json_string = json.dumps(data, sort_keys=True)
            json_bytes = json_string.encode('utf-8')
            
            # Create hash (mock CID)
            hash_obj = hashlib.sha256(json_bytes)
            content_hash = hash_obj.hexdigest()
            
            # Store in mock storage
            self._storage[content_hash] = json_bytes
            
            return IPFSStorageResult(
                hash=content_hash,
                cid=content_hash,
                size=len(json_bytes),
                url=f"{self.config.gateway_url}/{content_hash}"
            )
        except Exception as e:
            raise Exception(f"Failed to store data on IPFS: {e}")

    async def store_file(
        self,
        data: Union[bytes, str],
        filename: Optional[str] = None
    ) -> IPFSStorageResult:
        """
        Store raw file data on IPFS.
        
        Args:
            data: File data
            filename: Optional filename
            
        Returns:
            IPFS storage result
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # Convert to bytes if string
            if isinstance(data, str):
                file_bytes = data.encode('utf-8')
            else:
                file_bytes = data
            
            # Create hash (mock CID)
            hash_obj = hashlib.sha256(file_bytes)
            content_hash = hash_obj.hexdigest()
            
            # Store in mock storage
            self._storage[content_hash] = file_bytes
            
            return IPFSStorageResult(
                hash=content_hash,
                cid=content_hash,
                size=len(file_bytes),
                url=f"{self.config.gateway_url}/{content_hash}"
            )
        except Exception as e:
            raise Exception(f"Failed to store file on IPFS: {e}")

    async def retrieve_json(self, hash: str, target_type: type = dict) -> Any:
        """
        Retrieve JSON data from IPFS.
        
        Args:
            hash: Content hash
            target_type: Target type for deserialization
            
        Returns:
            Retrieved data
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # Retrieve from mock storage
            if hash not in self._storage:
                raise Exception(f"Content not found: {hash}")
            
            json_bytes = self._storage[hash]
            json_string = json_bytes.decode('utf-8')
            data = json.loads(json_string)
            
            return data
        except Exception as e:
            raise Exception(f"Failed to retrieve data from IPFS: {e}")

    async def retrieve_message_content(self, hash: str) -> ChannelMessageContent:
        """
        Retrieve message content from IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            Channel message content
        """
        data = await self.retrieve_json(hash)
        return ChannelMessageContent(**data)

    async def retrieve_participant_metadata(self, hash: str) -> ParticipantExtendedMetadata:
        """
        Retrieve participant metadata from IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            Participant extended metadata
        """
        data = await self.retrieve_json(hash)
        return ParticipantExtendedMetadata(**data)

    async def retrieve_file(self, hash: str) -> bytes:
        """
        Retrieve raw file data from IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            File data as bytes
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # Retrieve from mock storage
            if hash not in self._storage:
                raise Exception(f"Content not found: {hash}")
            
            return self._storage[hash]
        except Exception as e:
            raise Exception(f"Failed to retrieve file from IPFS: {e}")

    async def pin_content(self, hash: str) -> None:
        """
        Pin content to ensure it stays available.
        
        Args:
            hash: Content hash to pin
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # In a real implementation, this would pin content
            # For mock implementation, we just verify it exists
            if hash not in self._storage:
                raise Exception(f"Content not found: {hash}")
            
        except Exception as e:
            raise Exception(f"Failed to pin content: {e}")

    async def unpin_content(self, hash: str) -> None:
        """
        Unpin content to allow garbage collection.
        
        Args:
            hash: Content hash to unpin
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            # In a real implementation, this would unpin content
            # For mock implementation, we just verify it exists
            if hash not in self._storage:
                raise Exception(f"Content not found: {hash}")
            
        except Exception as e:
            raise Exception(f"Failed to unpin content: {e}")

    async def get_node_info(self) -> Dict[str, Any]:
        """
        Get IPFS node info.
        
        Returns:
            Node information
        """
        try:
            if self.config.disabled:
                raise Exception("IPFS functionality is disabled")
            
            return {
                "id": "mock-ipfs-node",
                "agent_version": "mock-ipfs-python",
                "protocol_version": "1.0.0",
                "storage_items": len(self._storage)
            }
        except Exception as e:
            raise Exception(f"Failed to get IPFS node info: {e}")

    async def content_exists(self, hash: str) -> bool:
        """
        Check if content exists on IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            True if content exists
        """
        try:
            if self.config.disabled:
                return False
            
            return hash in self._storage
        except Exception:
            return False

    async def store_channel_message_content(
        self, 
        content: ChannelMessageContent
    ) -> IPFSStorageResult:
        """
        Store channel message content on IPFS.
        
        Args:
            content: Channel message content
            
        Returns:
            IPFS storage result
        """
        return await self.store_json(content.__dict__)

    async def store_participant_extended_metadata(
        self, 
        metadata: ParticipantExtendedMetadata
    ) -> IPFSStorageResult:
        """
        Store participant extended metadata on IPFS.
        
        Args:
            metadata: Participant extended metadata
            
        Returns:
            IPFS storage result
        """
        return await self.store_json(metadata.__dict__)

    async def retrieve_channel_message_content(
        self, 
        hash: str
    ) -> ChannelMessageContent:
        """
        Retrieve channel message content from IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            Channel message content
        """
        return await self.retrieve_message_content(hash)

    async def retrieve_participant_extended_metadata(
        self, 
        hash: str
    ) -> ParticipantExtendedMetadata:
        """
        Retrieve participant extended metadata from IPFS.
        
        Args:
            hash: Content hash
            
        Returns:
            Participant extended metadata
        """
        return await self.retrieve_participant_metadata(hash)

    async def batch_store(
        self, 
        items: List[Dict[str, Any]]
    ) -> List[IPFSStorageResult]:
        """
        Batch store multiple content items.
        
        Args:
            items: List of items to store, each with 'content' and optional 'filename'
            
        Returns:
            List of IPFS storage results
        """
        results = []
        
        for item in items:
            content = item.get('content')
            filename = item.get('filename')
            
            if isinstance(content, (str, bytes)):
                result = await self.store_file(content, filename)
            else:
                result = await self.store_json(content)
            
            results.append(result)
        
        return results

    def get_gateway_url(self, hash: str, gateway: str = "https://ipfs.io/ipfs/") -> str:
        """
        Get gateway URL for content.
        
        Args:
            hash: Content hash
            gateway: Gateway base URL
            
        Returns:
            Full gateway URL
        """
        return f"{gateway}{hash}"

    @staticmethod
    def is_valid_ipfs_hash(hash: str) -> bool:
        """
        Validate IPFS hash format.
        
        Args:
            hash: Hash to validate
            
        Returns:
            True if valid hash format
        """
        try:
            # Basic validation - check if it's a hex string of appropriate length
            if len(hash) == 64 and all(c in '0123456789abcdef' for c in hash.lower()):
                return True
            # Could add more sophisticated CID validation here
            return False
        except:
            return False

    @staticmethod
    def create_content_hash(content: str) -> str:
        """
        Create a content hash for verification.
        Matches the Rust program's hash_to_bn254_field_size_be function.
        
        Args:
            content: Content to hash
            
        Returns:
            Content hash
        """
        # Equivalent to `hash_to_bn254_field_size_be` in Rust
        # 1. Hash the UTF-8 bytes with SHA256 and a bump seed (0xff)
        content_bytes = content.encode('utf-8')
        bump_seed = bytes([0xff])
        combined = content_bytes + bump_seed
        
        hash_obj = hashlib.sha256(combined)
        field_sized_hash = bytearray(hash_obj.digest())
        
        # 2. Zero the first byte so the result fits within the BN254 field
        field_sized_hash[0] = 0
        
        return field_sized_hash.hex()

    @staticmethod
    def create_metadata_hash(metadata: ParticipantExtendedMetadata) -> str:
        """
        Create a metadata hash for participant data.
        Matches the Rust program's metadata hashing.
        
        Args:
            metadata: Participant metadata
            
        Returns:
            Metadata hash
        """
        metadata_dict = {
            "display_name": metadata.display_name or "",
            "avatar": metadata.avatar or "",
            "permissions": metadata.permissions or [],
            "last_updated": metadata.last_updated
        }
        
        metadata_string = json.dumps(metadata_dict, sort_keys=True)
        return IPFSService.create_content_hash(metadata_string)
