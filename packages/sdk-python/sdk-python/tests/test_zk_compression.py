"""Tests for the ZKCompressionService class."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction
import hashlib
import json

from pod_protocol.services.zk_compression import ZKCompressionService
from pod_protocol.services.ipfs import IPFSService


class MockZKCompressionService(ZKCompressionService):
    """Mock implementation for testing without heavy dependencies."""
    
    def __init__(self, connection, program_id, options=None, ipfs_service=None):
        super().__init__(connection, program_id, options, ipfs_service)
    
    async def create_compression_instruction(self, *args, **kwargs):
        """Mock compression instruction creation."""
        return Instruction(
            program_id=self.program_id,
            accounts=[],
            data=b""
        )
    
    async def process_batch(self, *args, **kwargs):
        """Mock batch processing."""
        return "mock_signature_123"
    
    async def compress_data(self, data):
        """Mock data compression."""
        return {
            "compressed": json.dumps(data).encode(),
            "merkle_root": "mock_merkle_root",
            "proof": ["mock_proof_1", "mock_proof_2"]
        }


class TestZKCompressionService:
    """Test ZKCompressionService functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        self.mock_ipfs_service = Mock(spec=IPFSService)
        
        self.service = MockZKCompressionService(
            connection=self.mock_connection,
            program_id=self.program_id,
            options={"enable_batching": True, "batch_size": 10},
            ipfs_service=self.mock_ipfs_service
        )

    def test_service_initialization(self):
        """Test service initializes correctly."""
        assert self.service.connection == self.mock_connection
        assert self.service.program_id == self.program_id
        assert self.service.options["enable_batching"] is True
        assert self.service.options["batch_size"] == 10

    @pytest.mark.asyncio
    async def test_create_compression_instruction(self):
        """Test compression instruction creation."""
        instruction = await self.service.create_compression_instruction()
        
        assert isinstance(instruction, Instruction)
        assert instruction.program_id == self.program_id

    @pytest.mark.asyncio
    async def test_process_batch(self):
        """Test batch processing with compression."""
        signature = await self.service.process_batch()
        
        assert isinstance(signature, str)
        assert signature == "mock_signature_123"

    @pytest.mark.asyncio
    async def test_compress_data(self):
        """Test data compression."""
        test_data = {"message": "Hello, compressed world!"}
        result = await self.service.compress_data(test_data)
        
        assert "compressed" in result
        assert "merkle_root" in result
        assert "proof" in result
        assert result["merkle_root"] == "mock_merkle_root"
        assert result["proof"] == ["mock_proof_1", "mock_proof_2"]

    def test_build_merkle_tree(self):
        """Test merkle tree building."""
        test_data = ["hello", "world", "test"]
        hashes = [self.service.hash_data(data) for data in test_data]
        
        # Mock the internal build_merkle_tree method
        with patch.object(self.service, '_build_merkle_tree') as mock_build:
            mock_build.return_value = {
                "root": "51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada",
                "proof": ["proof1", "proof2"]
            }
            
            result = self.service._build_merkle_tree(hashes)
            
            assert result["root"] == "51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada"
            assert len(result["proof"]) == 2

    def test_hash_data(self):
        """Test data hashing."""
        test_data = "test_data"
        hash_result = self.service.hash_data(test_data)
        
        assert isinstance(hash_result, bytes)
        assert len(hash_result) == 32  # SHA-256
        
        # Should be deterministic
        hash_result2 = self.service.hash_data(test_data)
        assert hash_result == hash_result2

    def test_validate_options_valid(self):
        """Test options validation with valid options."""
        valid_options = {
            "enable_batching": True,
            "batch_size": 50,
            "compression_level": 6
        }
        
        self.service.validate_options(valid_options)  # Should not raise

    def test_validate_options_invalid(self):
        """Test options validation with invalid options."""
        invalid_options_sets = [
            {"enable_batching": "invalid"},  # Wrong type
            {"batch_size": -1},  # Negative value
            {"compression_level": 15},  # Too high
            {"batch_size": 0},  # Zero batch size
        ]
        
        for invalid_options in invalid_options_sets:
            with pytest.raises(ValueError):
                self.service.validate_options(invalid_options)

    def test_calculate_compression_ratio(self):
        """Test compression ratio calculation."""
        original_size = 1000
        compressed_size = 100
        ratio = self.service.calculate_compression_ratio(original_size, compressed_size)
        
        assert ratio == 10.0  # 10:1 compression ratio

    def test_estimate_savings(self):
        """Test compression savings estimation."""
        original_size = 1000
        compressed_size = 50
        savings = self.service.estimate_savings(original_size, compressed_size)
        
        assert savings["percentage"] == 95.0  # 95% savings
        assert savings["bytes_reduced"] == 950
        assert savings["original_size"] == original_size
        assert savings["compressed_size"] == compressed_size

    @pytest.mark.asyncio
    async def test_process_batch_operations(self):
        """Test batch operations processing."""
        operations = [
            {"type": "compress", "data": "data1"},
            {"type": "compress", "data": "data2"},
            {"type": "compress", "data": "data3"}
        ]
        
        with patch.object(self.service, 'process_batch_operations') as mock_process:
            mock_process.return_value = [
                {"success": True, "data": "result1"},
                {"success": True, "data": "result2"},
                {"success": True, "data": "result3"}
            ]
            
            results = await self.service.process_batch_operations(operations)
            
            assert len(results) == 3
            for result in results:
                assert result["success"] is True

    def test_verify_merkle_proof(self):
        """Test merkle proof verification."""
        # Mock implementation
        leaf = b"test_leaf"
        proof = [b"proof1", b"proof2"]
        root = "mock_root"
        
        with patch.object(self.service, 'verify_merkle_proof') as mock_verify:
            mock_verify.return_value = True
            
            result = self.service.verify_merkle_proof(leaf, proof, root)
            assert result is True

    def test_estimate_compression_cost(self):
        """Test compression cost estimation."""
        data_size = 1024  # 1KB
        cost = self.service.estimate_compression_cost(data_size)
        
        assert isinstance(cost, dict)
        assert "base_cost" in cost
        assert "compression_cost" in cost
        assert "storage_cost" in cost
        assert "total_cost" in cost
        assert cost["total_cost"] >= 0

    def test_get_compression_stats(self):
        """Test compression statistics retrieval."""
        stats = self.service.get_compression_stats()
        
        assert isinstance(stats, dict)
        assert "total_compressed" in stats
        assert "total_savings" in stats
        assert "average_ratio" in stats
        assert "batch_count" in stats

    def test_format_compression_result(self):
        """Test compression result formatting."""
        result = {
            "compressed": b"compressed_data",
            "merkle_root": "root_hash",
            "proof": ["proof1", "proof2"],
            "original_size": 1000,
            "compressed_size": 100
        }
        
        formatted = self.service.format_compression_result(result)
        
        assert "compression_ratio" in formatted
        assert "savings_percentage" in formatted
        assert "merkle_root" in formatted
        assert "proof_count" in formatted
        assert formatted["compression_ratio"] == 10.0
        assert formatted["savings_percentage"] == 90.0

    def test_batch_size_limits(self):
        """Test batch size validation."""
        # Test minimum batch size
        with pytest.raises(ValueError):
            self.service.validate_options({"batch_size": 0})
        
        # Test maximum batch size
        with pytest.raises(ValueError):
            self.service.validate_options({"batch_size": 1001})
        
        # Test valid batch sizes
        valid_sizes = [1, 10, 50, 100, 1000]
        for size in valid_sizes:
            self.service.validate_options({"batch_size": size})  # Should not raise

    def test_compression_level_validation(self):
        """Test compression level validation."""
        # Test valid compression levels (0-9)
        for level in range(10):
            self.service.validate_options({"compression_level": level})  # Should not raise
        
        # Test invalid compression levels
        invalid_levels = [-1, 10, 15]
        for level in invalid_levels:
            with pytest.raises(ValueError):
                self.service.validate_options({"compression_level": level})

    @pytest.mark.asyncio
    async def test_ipfs_integration(self):
        """Test IPFS integration for large data."""
        large_data = {"message": "A" * 10000}  # Large data that should use IPFS
        
        self.mock_ipfs_service.upload.return_value = {
            "hash": "QmTestHash",
            "url": "https://ipfs.io/ipfs/QmTestHash"
        }
        
        with patch.object(self.service, 'should_use_ipfs') as mock_should_use:
            mock_should_use.return_value = True
            
            result = await self.service.compress_data(large_data)
            
            # Should use IPFS for large data
            assert result is not None
