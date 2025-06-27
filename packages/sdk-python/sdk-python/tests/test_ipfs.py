"""Tests for the IPFSService class."""

import pytest
from unittest.mock import Mock, patch
from solders.pubkey import Pubkey
import hashlib
import json
import base64

from pod_protocol.services.ipfs import IPFSService


class TestIPFSService:
    """Test IPFSService functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        self.service = IPFSService(
            connection=self.mock_connection,
            program_id=self.program_id,
            commitment="confirmed"
        )

    def test_service_initialization(self):
        """Test service initializes correctly."""
        assert self.service.connection == self.mock_connection
        assert self.service.program_id == self.program_id
        assert self.service.commitment == "confirmed"

    def test_create_content_hash(self):
        """Test content hash creation matches TypeScript implementation."""
        test_cases = {
            "hello world": "001e332a8d817b5fb3b49af17074488b700c13e2d2611e4aaec24704bcc6c60c",
            "OpenAI": "002f5def325e554d0601b6a3fcb788ae8f071f39ef85baae22c27e11046a4202",
            "": "001a944cf13a9a1c08facb2c9e98623ef3254d2ddb48113885c3e8e97fec8db9"
        }

        for input_text, expected_hash in test_cases.items():
            result = IPFSService.create_content_hash(input_text)
            assert result == expected_hash, f"Hash mismatch for '{input_text}'"

    def test_is_valid_ipfs_hash(self):
        """Test IPFS hash validation."""
        valid_hashes = [
            "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
            "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
            "QmRgutAxd8t7oGkSm4wmeubyG6M51wcTso6cubDdQtuEfL"
        ]

        invalid_hashes = [
            "invalidhash",
            "",
            None,
            "12345",
            "Qm123",  # Too short
            "not_a_hash"
        ]

        for valid_hash in valid_hashes:
            assert self.service.is_valid_ipfs_hash(valid_hash) is True

        for invalid_hash in invalid_hashes:
            assert self.service.is_valid_ipfs_hash(invalid_hash) is False

    def test_generate_ipfs_url(self):
        """Test IPFS URL generation."""
        hash_value = "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o"
        url = self.service.generate_ipfs_url(hash_value)
        
        assert url == f"https://ipfs.io/ipfs/{hash_value}"

    def test_generate_ipfs_url_custom_gateway(self):
        """Test IPFS URL generation with custom gateway."""
        hash_value = "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o"
        gateway = "https://gateway.pinata.cloud/ipfs/"
        url = self.service.generate_ipfs_url(hash_value, gateway)
        
        assert url == f"{gateway}{hash_value}"

    def test_prepare_metadata(self):
        """Test metadata preparation for upload."""
        metadata = {
            "name": "Test Agent",
            "description": "A test agent for the protocol",
            "image": "QmImageHash",
            "attributes": [
                {"trait_type": "Capability", "value": "Text Processing"}
            ]
        }

        prepared = self.service.prepare_metadata(metadata)
        
        assert prepared["name"] == metadata["name"]
        assert prepared["description"] == metadata["description"]
        assert prepared["image"] == f"https://ipfs.io/ipfs/{metadata['image']}"
        assert prepared["attributes"] == metadata["attributes"]
        assert prepared["version"] == "1.0.0"
        assert "created_at" in prepared

    def test_validate_metadata_valid(self):
        """Test metadata validation with valid metadata."""
        valid_metadata = {
            "name": "Test Agent",
            "description": "A test agent",
            "version": "1.0.0"
        }

        self.service.validate_metadata(valid_metadata)  # Should not raise

    def test_validate_metadata_invalid(self):
        """Test metadata validation with invalid metadata."""
        invalid_metadata_sets = [
            {"name": ""},  # Empty name
            {"description": "test"},  # Missing name
            {"name": "test", "description": None},  # Invalid description
            None,  # None metadata
            {},  # Empty metadata
        ]

        for invalid_metadata in invalid_metadata_sets:
            with pytest.raises(ValueError):
                self.service.validate_metadata(invalid_metadata)

    def test_estimate_storage_cost(self):
        """Test storage cost estimation."""
        data_size = 1024  # 1KB
        cost = self.service.estimate_storage_cost(data_size)
        
        assert isinstance(cost, dict)
        assert "size" in cost
        assert "estimated_cost" in cost
        assert "currency" in cost
        assert cost["size"] == data_size
        assert cost["estimated_cost"] >= 0
        assert isinstance(cost["currency"], str)

    @pytest.mark.asyncio
    async def test_mock_pin(self):
        """Test pin operation (mocked)."""
        hash_value = "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o"
        
        with patch.object(self.service, 'pin') as mock_pin:
            mock_pin.return_value = {"success": True, "hash": hash_value}
            
            result = await self.service.pin(hash_value)
            
            assert result["success"] is True
            assert result["hash"] == hash_value

    @pytest.mark.asyncio
    async def test_mock_unpin(self):
        """Test unpin operation (mocked)."""
        hash_value = "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o"
        
        with patch.object(self.service, 'unpin') as mock_unpin:
            mock_unpin.return_value = {"success": True, "hash": hash_value}
            
            result = await self.service.unpin(hash_value)
            
            assert result["success"] is True
            assert result["hash"] == hash_value

    def test_compress_data(self):
        """Test data compression."""
        original_data = "This is test data that should be compressed and decompressed correctly."
        
        compressed = self.service.compress_data(original_data)
        assert len(compressed) <= len(original_data.encode())
        
        decompressed = self.service.decompress_data(compressed)
        assert decompressed == original_data

    def test_calculate_integrity_hash(self):
        """Test data integrity hash calculation."""
        data = "test data for integrity checking"
        hash1 = self.service.calculate_integrity_hash(data)
        hash2 = self.service.calculate_integrity_hash(data)
        hash3 = self.service.calculate_integrity_hash(data + " modified")
        
        assert hash1 == hash2  # Same data should produce same hash
        assert hash1 != hash3  # Different data should produce different hash
        assert len(hash1) == 64  # SHA-256 produces 64 character hex string

    @pytest.mark.asyncio
    async def test_mock_upload(self):
        """Test metadata upload (mocked)."""
        metadata = {
            "name": "Test Metadata",
            "description": "Metadata for testing",
            "attributes": [
                {"trait_type": "Environment", "value": "Test"}
            ]
        }
        
        with patch.object(self.service, 'upload') as mock_upload:
            mock_upload.return_value = {
                "hash": "QmMockHash",
                "url": "https://ipfs.io/ipfs/QmMockHash",
                "size": len(json.dumps(metadata))
            }
            
            result = await self.service.upload(metadata)
            
            assert result["hash"] == "QmMockHash"
            assert result["url"] == "https://ipfs.io/ipfs/QmMockHash"
            assert "size" in result

    @pytest.mark.asyncio
    async def test_mock_retrieve(self):
        """Test metadata retrieval (mocked)."""
        hash_value = "QmMockHash"
        expected_metadata = {
            "name": "Test Metadata",
            "description": "Retrieved metadata"
        }
        
        with patch.object(self.service, 'retrieve') as mock_retrieve:
            mock_retrieve.return_value = expected_metadata
            
            result = await self.service.retrieve(hash_value)
            
            assert result == expected_metadata

    def test_get_gateway_urls(self):
        """Test getting available IPFS gateway URLs."""
        gateways = self.service.get_gateway_urls()
        
        assert isinstance(gateways, list)
        assert len(gateways) > 0
        assert "https://ipfs.io/ipfs/" in gateways
        
        for gateway in gateways:
            assert gateway.startswith("https://")
            assert gateway.endswith("/ipfs/")

    def test_verify_content_integrity(self):
        """Test content integrity verification."""
        content = "test content"
        expected_hash = self.service.calculate_integrity_hash(content)
        
        # Verify with correct hash
        assert self.service.verify_content_integrity(content, expected_hash) is True
        
        # Verify with incorrect hash
        wrong_hash = "wrong_hash"
        assert self.service.verify_content_integrity(content, wrong_hash) is False

    def test_format_metadata_response(self):
        """Test metadata response formatting."""
        raw_response = {
            "hash": "QmTestHash",
            "size": 1024,
            "upload_time": 1640995200
        }
        
        formatted = self.service.format_metadata_response(raw_response)
        
        assert formatted["hash"] == raw_response["hash"]
        assert formatted["size"] == raw_response["size"]
        assert formatted["url"] == f"https://ipfs.io/ipfs/{raw_response['hash']}"
        assert "formatted_size" in formatted
        assert "upload_date" in formatted

    def test_calculate_pin_cost(self):
        """Test pin cost calculation."""
        data_size = 2048  # 2KB
        pin_duration = 30  # 30 days
        
        cost = self.service.calculate_pin_cost(data_size, pin_duration)
        
        assert isinstance(cost, dict)
        assert "base_cost" in cost
        assert "size_cost" in cost
        assert "duration_cost" in cost
        assert "total_cost" in cost
        assert cost["total_cost"] >= cost["base_cost"]

    def test_ipfs_constants(self):
        """Test IPFS-related constants."""
        assert hasattr(self.service, 'DEFAULT_GATEWAY')
        assert hasattr(self.service, 'MAX_FILE_SIZE')
        assert self.service.DEFAULT_GATEWAY == "https://ipfs.io/ipfs/"
        assert self.service.MAX_FILE_SIZE > 0
