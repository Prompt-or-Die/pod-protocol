"""Tests for the AgentService class."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction

from pod_protocol.services.agent import AgentService
from pod_protocol.types import AgentCapabilities


class TestAgentService:
    """Test AgentService functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        self.service = AgentService(
            connection=self.mock_connection,
            program_id=self.program_id,
            commitment="confirmed"
        )
        self.keypair = Keypair()

    def test_service_initialization(self):
        """Test service initializes correctly."""
        assert self.service.connection == self.mock_connection
        assert self.service.program_id == self.program_id
        assert self.service.commitment == "confirmed"

    def test_get_agent_pda(self):
        """Test agent PDA generation."""
        pda = self.service.get_agent_pda(self.keypair.pubkey())
        
        assert isinstance(pda, Pubkey)
        # PDA should be deterministic
        pda2 = self.service.get_agent_pda(self.keypair.pubkey())
        assert pda == pda2

    def test_generate_metadata_uri(self):
        """Test metadata URI generation."""
        metadata = {
            "name": "Test Agent",
            "description": "A test agent",
            "capabilities": ["text", "image"]
        }
        
        uri = self.service.generate_metadata_uri(metadata)
        assert uri.startswith("data:application/json;base64,")
        
        # Decode and verify
        import base64
        import json
        encoded_data = uri.split(',')[1]
        decoded_data = base64.b64decode(encoded_data).decode('utf-8')
        parsed_metadata = json.loads(decoded_data)
        
        assert parsed_metadata["name"] == metadata["name"]
        assert parsed_metadata["description"] == metadata["description"]

    def test_create_register_instruction(self):
        """Test register instruction creation."""
        capabilities = AgentCapabilities.TEXT | AgentCapabilities.IMAGE
        metadata_uri = "https://example.com/metadata"
        
        instruction = self.service.create_register_instruction(
            self.keypair.pubkey(),
            capabilities,
            metadata_uri
        )
        
        assert isinstance(instruction, Instruction)
        assert instruction.program_id == self.program_id

    def test_create_update_instruction(self):
        """Test update instruction creation."""
        capabilities = AgentCapabilities.TEXT | AgentCapabilities.CODE
        metadata_uri = "https://example.com/metadata/updated"
        
        instruction = self.service.create_update_instruction(
            self.keypair.pubkey(),
            capabilities,
            metadata_uri
        )
        
        assert isinstance(instruction, Instruction)
        assert instruction.program_id == self.program_id

    def test_validate_agent_data_valid(self):
        """Test agent data validation with valid data."""
        valid_data = {
            "pubkey": self.keypair.pubkey(),
            "capabilities": AgentCapabilities.TEXT,
            "metadata_uri": "https://example.com/metadata",
            "message_count": 0,
            "reputation": 100,
            "is_active": True
        }
        
        # Should not raise an exception
        self.service.validate_agent_data(valid_data)

    def test_validate_agent_data_invalid(self):
        """Test agent data validation with invalid data."""
        invalid_data_sets = [
            {"pubkey": None},  # Missing pubkey
            {"pubkey": self.keypair.pubkey(), "capabilities": -1},  # Invalid capabilities
            {"pubkey": self.keypair.pubkey(), "metadata_uri": ""},  # Empty metadata URI
            {"pubkey": self.keypair.pubkey(), "message_count": -1},  # Negative message count
        ]
        
        for invalid_data in invalid_data_sets:
            with pytest.raises(ValueError):
                self.service.validate_agent_data(invalid_data)

    def test_calculate_reputation(self):
        """Test reputation calculation."""
        metrics = {
            "successful_messages": 10,
            "failed_messages": 2,
            "average_response_time": 1000,
            "total_messages": 12
        }
        
        reputation = self.service.calculate_reputation(metrics)
        
        assert isinstance(reputation, (int, float))
        assert 0 <= reputation <= 1000
        assert reputation > 0  # Should be positive with successful messages

    def test_get_capabilities_array(self):
        """Test converting capabilities flags to array."""
        capabilities = AgentCapabilities.TEXT | AgentCapabilities.IMAGE | AgentCapabilities.CODE
        capabilities_array = self.service.get_capabilities_array(capabilities)
        
        assert isinstance(capabilities_array, list)
        assert "text" in capabilities_array
        assert "image" in capabilities_array
        assert "code" in capabilities_array
        assert len(capabilities_array) == 3

    def test_capabilities_from_array(self):
        """Test converting capabilities array to flags."""
        capabilities_array = ["text", "image"]
        capabilities = self.service.capabilities_from_array(capabilities_array)
        
        expected = AgentCapabilities.TEXT | AgentCapabilities.IMAGE
        assert capabilities == expected

    def test_validate_capabilities(self):
        """Test capabilities validation."""
        # Valid capabilities
        valid_caps = AgentCapabilities.TEXT | AgentCapabilities.IMAGE
        self.service.validate_capabilities(valid_caps)  # Should not raise
        
        # Invalid capabilities (negative)
        with pytest.raises(ValueError):
            self.service.validate_capabilities(-1)
        
        # Invalid capabilities (too large)
        with pytest.raises(ValueError):
            self.service.validate_capabilities(2**32)  # Way too large

    def test_format_agent_info(self):
        """Test agent info formatting."""
        agent_data = {
            "pubkey": self.keypair.pubkey(),
            "capabilities": AgentCapabilities.TEXT | AgentCapabilities.IMAGE,
            "metadata_uri": "https://example.com/metadata",
            "message_count": 42,
            "reputation": 850,
            "is_active": True,
            "created_at": 1640995200,  # Jan 1, 2022
            "updated_at": 1640995200
        }
        
        formatted = self.service.format_agent_info(agent_data)
        
        assert formatted["pubkey"] == str(agent_data["pubkey"])
        assert formatted["capabilities"] == ["text", "image"]
        assert formatted["message_count"] == 42
        assert formatted["reputation"] == 850
        assert formatted["is_active"] is True

    @pytest.mark.asyncio
    async def test_register_agent_mock(self):
        """Test agent registration (mocked)."""
        agent_data = {
            "name": "Test Agent",
            "description": "A test agent",
            "capabilities": ["text", "analysis"]
        }
        
        # Mock the register method
        with patch.object(self.service, 'register') as mock_register:
            mock_register.return_value = {
                "signature": "mock_signature",
                "agent_pda": self.service.get_agent_pda(self.keypair.pubkey())
            }
            
            result = await self.service.register(agent_data, self.keypair)
            
            assert result["signature"] == "mock_signature"
            assert "agent_pda" in result

    @pytest.mark.asyncio
    async def test_get_agent_info_mock(self):
        """Test getting agent info (mocked)."""
        agent_pda = self.service.get_agent_pda(self.keypair.pubkey())
        
        # Mock the get method
        with patch.object(self.service, 'get') as mock_get:
            mock_agent_data = {
                "pubkey": self.keypair.pubkey(),
                "capabilities": AgentCapabilities.TEXT,
                "metadata_uri": "https://example.com/metadata",
                "message_count": 0,
                "reputation": 100,
                "is_active": True
            }
            mock_get.return_value = mock_agent_data
            
            result = await self.service.get(agent_pda)
            
            assert result["pubkey"] == self.keypair.pubkey()
            assert result["capabilities"] == AgentCapabilities.TEXT

    def test_capability_constants(self):
        """Test that capability constants are properly defined."""
        assert AgentCapabilities.TEXT == 1
        assert AgentCapabilities.IMAGE == 2
        assert AgentCapabilities.CODE == 4
        assert AgentCapabilities.ANALYSIS == 8
        assert AgentCapabilities.COMMUNICATION == 16
        assert AgentCapabilities.LEARNING == 32
