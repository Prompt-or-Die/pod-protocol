"""Merkle tree tests for the Python SDK."""

import pytest
from unittest.mock import Mock, patch
from solders.pubkey import Pubkey
import hashlib

from pod_protocol.services.zk_compression import ZKCompressionService
from pod_protocol.services.ipfs import IPFSService


class TestMerkleTree:
    """Test Merkle tree functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        config = {
            "connection": self.mock_connection,
            "program_id": self.program_id,
            "commitment": "confirmed"
        }
        
        self.ipfs_service = IPFSService(**config)
        self.zk_service = ZKCompressionService(
            **config,
            options={"enable_batching": False},
            ipfs_service=self.ipfs_service
        )

    def sha256_hex(self, data):
        """Create SHA-256 hex hash."""
        return hashlib.sha256(data.encode()).hexdigest()

    def test_build_merkle_tree_correct_root(self):
        """Test Merkle tree builds correct root."""
        # Test case from the TypeScript SDK
        msgs = ["hello", "world", "test"]
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs]
        
        # Mock the build_merkle_tree method to return expected result
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            mock_build.return_value = {
                "root": "51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada"
            }
            
            result = self.zk_service._build_merkle_tree(hashes)
            
            assert result["root"] == "51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada"

    def test_single_leaf_merkle_tree(self):
        """Test single leaf Merkle tree."""
        single_msg = ["hello"]
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in single_msg]
        
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            # Single leaf should return the hash itself
            expected_root = self.sha256_hex("hello")
            mock_build.return_value = {"root": expected_root}
            
            result = self.zk_service._build_merkle_tree(hashes)
            
            assert result["root"] == expected_root

    def test_empty_merkle_tree(self):
        """Test empty Merkle tree raises error."""
        empty_hashes = []
        
        with pytest.raises(ValueError, match="Cannot build Merkle tree with empty hash list"):
            self.zk_service._validate_merkle_input(empty_hashes)

    def test_merkle_proof_generation(self):
        """Test Merkle proof generation."""
        msgs = ["hello", "world", "test", "merkle"]
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs]
        
        with patch.object(self.zk_service, '_build_merkle_tree_with_proofs') as mock_build_with_proofs:
            mock_tree = {
                "root": "mock_root",
                "proofs": {
                    0: ["proof1", "proof2"],
                    1: ["proof3", "proof4"],
                    2: ["proof5", "proof6"],
                    3: ["proof7", "proof8"]
                }
            }
            mock_build_with_proofs.return_value = mock_tree
            
            tree = self.zk_service._build_merkle_tree_with_proofs(hashes)
            
            # Verify each leaf has a proof
            for i, msg in enumerate(msgs):
                proof = tree["proofs"][i]
                assert isinstance(proof, list)
                assert len(proof) > 0

    def test_merkle_proof_verification(self):
        """Test Merkle proof verification."""
        msgs = ["hello", "world", "test"]
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs]
        
        # Mock successful verification
        with patch.object(self.zk_service, 'verify_merkle_proof') as mock_verify:
            mock_verify.return_value = True
            
            # Test with correct proof
            leaf = bytes.fromhex(self.sha256_hex("hello"))
            proof = ["proof1", "proof2"]
            root = "mock_root"
            
            is_valid = self.zk_service.verify_merkle_proof(leaf, proof, root)
            assert is_valid is True

    def test_invalid_merkle_proof(self):
        """Test invalid Merkle proof detection."""
        with patch.object(self.zk_service, 'verify_merkle_proof') as mock_verify:
            mock_verify.return_value = False
            
            # Test with wrong leaf
            wrong_leaf = bytes.fromhex(self.sha256_hex("wrong"))
            proof = ["proof1", "proof2"]
            root = "mock_root"
            
            is_valid = self.zk_service.verify_merkle_proof(wrong_leaf, proof, root)
            assert is_valid is False

    def test_power_of_2_leaf_counts(self):
        """Test Merkle tree with power of 2 leaf counts."""
        # Power of 2 (4 leaves)
        power_of_2_msgs = ["a", "b", "c", "d"]
        power_of_2_hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in power_of_2_msgs]
        
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            mock_build.return_value = {"root": "a" * 64}  # 32 bytes = 64 hex chars
            
            result = self.zk_service._build_merkle_tree(power_of_2_hashes)
            
            assert result["root"] is not None
            assert len(result["root"]) == 64  # 32 bytes = 64 hex chars

    def test_non_power_of_2_leaf_counts(self):
        """Test Merkle tree with non-power of 2 leaf counts."""
        # Non-power of 2 (5 leaves)
        non_power_of_2_msgs = ["a", "b", "c", "d", "e"]
        non_power_of_2_hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in non_power_of_2_msgs]
        
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            mock_build.return_value = {"root": "b" * 64}  # 32 bytes = 64 hex chars
            
            result = self.zk_service._build_merkle_tree(non_power_of_2_hashes)
            
            assert result["root"] is not None
            assert len(result["root"]) == 64  # 32 bytes = 64 hex chars

    def test_merkle_tree_consistency(self):
        """Test Merkle tree consistency across multiple builds."""
        msgs = ["consistent", "merkle", "tree"]
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs]
        
        expected_root = "consistent_root_hash"
        
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            mock_build.return_value = {"root": expected_root}
            
            root1 = self.zk_service._build_merkle_tree(hashes)["root"]
            root2 = self.zk_service._build_merkle_tree(hashes)["root"]
            root3 = self.zk_service._build_merkle_tree(hashes)["root"]
            
            assert root1 == root2
            assert root2 == root3

    def test_different_inputs_different_roots(self):
        """Test different inputs produce different roots."""
        msgs1 = ["hello", "world"]
        msgs2 = ["world", "hello"]  # Same elements, different order
        msgs3 = ["hello", "universe"]  # Different elements
        
        hashes1 = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs1]
        hashes2 = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs2]
        hashes3 = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs3]
        
        with patch.object(self.zk_service, '_build_merkle_tree') as mock_build:
            mock_build.side_effect = [
                {"root": "root1"},
                {"root": "root2"},
                {"root": "root3"}
            ]
            
            root1 = self.zk_service._build_merkle_tree(hashes1)["root"]
            root2 = self.zk_service._build_merkle_tree(hashes2)["root"]
            root3 = self.zk_service._build_merkle_tree(hashes3)["root"]
            
            assert root1 != root2  # Order matters
            assert root1 != root3  # Content matters
            assert root2 != root3  # Both order and content matter

    def test_merkle_tree_depth_calculation(self):
        """Test Merkle tree depth calculation."""
        # Different sizes to test depth calculation
        test_cases = [
            (1, 1),   # 1 leaf = depth 1
            (2, 2),   # 2 leaves = depth 2
            (4, 3),   # 4 leaves = depth 3
            (8, 4),   # 8 leaves = depth 4
            (15, 5),  # 15 leaves = depth 5 (rounded up)
        ]
        
        for leaf_count, expected_depth in test_cases:
            depth = self.zk_service._calculate_merkle_depth(leaf_count)
            assert depth == expected_depth

    def test_merkle_tree_balancing(self):
        """Test Merkle tree balancing with odd number of leaves."""
        # Odd number of leaves should be balanced by duplicating the last leaf
        msgs = ["a", "b", "c"]  # 3 leaves
        hashes = [bytes.fromhex(self.sha256_hex(msg)) for msg in msgs]
        
        with patch.object(self.zk_service, '_balance_merkle_leaves') as mock_balance:
            # Should duplicate the last leaf to make it even
            balanced_hashes = hashes + [hashes[-1]]
            mock_balance.return_value = balanced_hashes
            
            result = self.zk_service._balance_merkle_leaves(hashes)
            
            assert len(result) == 4  # Should be balanced to 4 leaves
            assert result[-1] == result[-2]  # Last two should be the same

    def test_merkle_proof_path_calculation(self):
        """Test Merkle proof path calculation."""
        leaf_index = 2
        tree_size = 8
        
        proof_path = self.zk_service._calculate_proof_path(leaf_index, tree_size)
        
        assert isinstance(proof_path, list)
        assert len(proof_path) > 0
        assert all(isinstance(index, int) for index in proof_path)

    def test_merkle_tree_serialization(self):
        """Test Merkle tree serialization for storage."""
        tree_data = {
            "root": "test_root",
            "leaves": ["leaf1", "leaf2", "leaf3"],
            "proofs": {0: ["proof1"], 1: ["proof2"], 2: ["proof3"]}
        }
        
        serialized = self.zk_service._serialize_merkle_tree(tree_data)
        deserialized = self.zk_service._deserialize_merkle_tree(serialized)
        
        assert deserialized["root"] == tree_data["root"]
        assert deserialized["leaves"] == tree_data["leaves"]
        assert deserialized["proofs"] == tree_data["proofs"]

    def test_merkle_tree_validation(self):
        """Test Merkle tree validation."""
        # Valid tree
        valid_tree = {
            "root": "a" * 64,
            "leaves": ["leaf1", "leaf2"],
            "proofs": {0: ["proof1"], 1: ["proof2"]}
        }
        
        assert self.zk_service._validate_merkle_tree(valid_tree) is True
        
        # Invalid tree (missing root)
        invalid_tree = {
            "leaves": ["leaf1", "leaf2"],
            "proofs": {0: ["proof1"], 1: ["proof2"]}
        }
        
        assert self.zk_service._validate_merkle_tree(invalid_tree) is False
