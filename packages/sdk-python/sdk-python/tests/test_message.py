"""Tests for the MessageService class."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction
import hashlib

from pod_protocol.services.message import MessageService
from pod_protocol.types import MessageType, MessageStatus


class TestMessageService:
    """Test MessageService functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        self.service = MessageService(
            connection=self.mock_connection,
            program_id=self.program_id,
            commitment="confirmed"
        )
        self.sender_keypair = Keypair()
        self.recipient_keypair = Keypair()

    def test_service_initialization(self):
        """Test service initializes correctly."""
        assert self.service.connection == self.mock_connection
        assert self.service.program_id == self.program_id
        assert self.service.commitment == "confirmed"

    def test_get_message_pda(self):
        """Test message PDA generation."""
        content = "Hello, world!"
        message_type = MessageType.TEXT
        
        pda = self.service.get_message_pda(
            self.sender_keypair.pubkey(),
            self.recipient_keypair.pubkey(),
            content,
            message_type
        )
        
        assert isinstance(pda, Pubkey)
        
        # PDA should be deterministic
        pda2 = self.service.get_message_pda(
            self.sender_keypair.pubkey(),
            self.recipient_keypair.pubkey(),
            content,
            message_type
        )
        assert pda == pda2

    def test_hash_content(self):
        """Test content hashing."""
        content = "Hello, world!"
        hash_result = self.service.hash_content(content)
        
        assert isinstance(hash_result, bytes)
        assert len(hash_result) == 32  # SHA-256
        
        # Should be deterministic
        hash_result2 = self.service.hash_content(content)
        assert hash_result == hash_result2
        
        # Different content should produce different hash
        hash_result3 = self.service.hash_content("Different content")
        assert hash_result != hash_result3

    def test_validate_message_type_valid(self):
        """Test message type validation with valid types."""
        valid_types = [
            MessageType.TEXT,
            MessageType.IMAGE,
            MessageType.CODE,
            MessageType.DATA
        ]
        
        for message_type in valid_types:
            self.service.validate_message_type(message_type)  # Should not raise

    def test_validate_message_type_invalid(self):
        """Test message type validation with invalid types."""
        invalid_types = [
            None,
            "invalid",
            -1,
            999
        ]
        
        for message_type in invalid_types:
            with pytest.raises(ValueError):
                self.service.validate_message_type(message_type)

    def test_create_send_instruction(self):
        """Test send message instruction creation."""
        content = "Hello, world!"
        message_type = MessageType.TEXT
        
        instruction = self.service.create_send_instruction(
            self.sender_keypair.pubkey(),
            self.recipient_keypair.pubkey(),
            content,
            message_type
        )
        
        assert isinstance(instruction, Instruction)
        assert instruction.program_id == self.program_id

    def test_create_update_status_instruction(self):
        """Test update status instruction creation."""
        content = "Hello, world!"
        message_type = MessageType.TEXT
        status = MessageStatus.DELIVERED
        
        instruction = self.service.create_update_status_instruction(
            self.sender_keypair.pubkey(),
            self.recipient_keypair.pubkey(),
            content,
            message_type,
            status
        )
        
        assert isinstance(instruction, Instruction)
        assert instruction.program_id == self.program_id

    def test_validate_content_valid(self):
        """Test content validation with valid content."""
        valid_content = [
            "Hello, world!",
            "A" * 1000,  # Long but valid
            "Unicode test: 🚀 ⚡ 🌟",
            "Multi\nline\ncontent"
        ]
        
        for content in valid_content:
            self.service.validate_content(content)  # Should not raise

    def test_validate_content_invalid(self):
        """Test content validation with invalid content."""
        invalid_content = [
            "",  # Empty
            None,  # None
            "A" * 10001,  # Too long
        ]
        
        for content in invalid_content:
            with pytest.raises(ValueError):
                self.service.validate_content(content)

    def test_calculate_expiry(self):
        """Test message expiry calculation."""
        ttl = 3600  # 1 hour
        expiry = self.service.calculate_expiry(ttl)
        
        import time
        now = int(time.time())
        
        assert expiry > now
        assert expiry <= now + ttl + 1  # Allow 1 second tolerance

    def test_is_expired(self):
        """Test message expiry checking."""
        import time
        
        past_timestamp = int(time.time()) - 3600  # 1 hour ago
        future_timestamp = int(time.time()) + 3600  # 1 hour from now
        
        assert self.service.is_expired(past_timestamp) is True
        assert self.service.is_expired(future_timestamp) is False

    def test_format_message(self):
        """Test message formatting."""
        message_data = {
            "sender": self.sender_keypair.pubkey(),
            "recipient": self.recipient_keypair.pubkey(),
            "content": "Hello, world!",
            "message_type": MessageType.TEXT,
            "timestamp": 1640995200,
            "status": MessageStatus.PENDING
        }
        
        formatted = self.service.format_message(message_data)
        
        assert formatted["sender"] == str(message_data["sender"])
        assert formatted["recipient"] == str(message_data["recipient"])
        assert formatted["content"] == message_data["content"]
        assert formatted["type"] == "text"
        assert formatted["status"] == "pending"
        assert "timestamp" in formatted

    def test_get_message_type_string(self):
        """Test message type to string conversion."""
        type_mappings = {
            MessageType.TEXT: "text",
            MessageType.IMAGE: "image",
            MessageType.CODE: "code",
            MessageType.DATA: "data"
        }
        
        for message_type, expected_string in type_mappings.items():
            result = self.service.get_message_type_string(message_type)
            assert result == expected_string

    def test_get_status_string(self):
        """Test status to string conversion."""
        status_mappings = {
            MessageStatus.PENDING: "pending",
            MessageStatus.DELIVERED: "delivered",
            MessageStatus.READ: "read",
            MessageStatus.FAILED: "failed"
        }
        
        for status, expected_string in status_mappings.items():
            result = self.service.get_status_string(status)
            assert result == expected_string

    def test_estimate_message_cost(self):
        """Test message cost estimation."""
        content = "Hello, world!"
        message_type = MessageType.TEXT
        
        cost = self.service.estimate_message_cost(content, message_type)
        
        assert isinstance(cost, dict)
        assert "base_fee" in cost
        assert "content_fee" in cost
        assert "total_fee" in cost
        assert cost["total_fee"] >= cost["base_fee"]

    @pytest.mark.asyncio
    async def test_send_message_mock(self):
        """Test sending a message (mocked)."""
        content = "Hello from test!"
        message_type = MessageType.TEXT
        
        with patch.object(self.service, 'send') as mock_send:
            mock_send.return_value = {
                "signature": "mock_signature",
                "message_pda": self.service.get_message_pda(
                    self.sender_keypair.pubkey(),
                    self.recipient_keypair.pubkey(),
                    content,
                    message_type
                )
            }
            
            result = await self.service.send(
                self.sender_keypair.pubkey(),
                self.recipient_keypair.pubkey(),
                content,
                message_type,
                self.sender_keypair
            )
            
            assert result["signature"] == "mock_signature"
            assert "message_pda" in result

    @pytest.mark.asyncio
    async def test_get_message_history_mock(self):
        """Test getting message history (mocked)."""
        with patch.object(self.service, 'get_history') as mock_get_history:
            mock_messages = [
                {
                    "sender": self.sender_keypair.pubkey(),
                    "recipient": self.recipient_keypair.pubkey(),
                    "content": "Message 1",
                    "message_type": MessageType.TEXT,
                    "timestamp": 1640995200,
                    "status": MessageStatus.DELIVERED
                },
                {
                    "sender": self.recipient_keypair.pubkey(),
                    "recipient": self.sender_keypair.pubkey(),
                    "content": "Message 2",
                    "message_type": MessageType.TEXT,
                    "timestamp": 1640995260,
                    "status": MessageStatus.READ
                }
            ]
            mock_get_history.return_value = mock_messages
            
            result = await self.service.get_history(
                self.sender_keypair.pubkey(),
                self.recipient_keypair.pubkey()
            )
            
            assert len(result) == 2
            assert result[0]["content"] == "Message 1"
            assert result[1]["content"] == "Message 2"

    def test_message_type_constants(self):
        """Test that message type constants are properly defined."""
        assert MessageType.TEXT == 0
        assert MessageType.IMAGE == 1
        assert MessageType.CODE == 2
        assert MessageType.DATA == 3

    def test_message_status_constants(self):
        """Test that message status constants are properly defined."""
        assert MessageStatus.PENDING == 0
        assert MessageStatus.DELIVERED == 1
        assert MessageStatus.READ == 2
        assert MessageStatus.FAILED == 3
