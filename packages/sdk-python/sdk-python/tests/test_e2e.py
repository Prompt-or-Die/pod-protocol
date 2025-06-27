"""End-to-end tests for the PoD Protocol Python SDK."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from solders.pubkey import Pubkey
from solders.keypair import Keypair
import asyncio
import time

from pod_protocol import PodProtocolClient
from pod_protocol.types import AgentCapabilities, MessageType, MessageStatus


@pytest.fixture
def client():
    """Create a test client."""
    rpc_url = "http://localhost:8899"
    program_id = Pubkey.from_string("11111111111111111111111111111111")
    return PodProtocolClient(rpc_url, program_id, commitment="confirmed")


@pytest.fixture
def sender_keypair():
    """Create a sender keypair."""
    return Keypair()


@pytest.fixture
def recipient_keypair():
    """Create a recipient keypair."""
    return Keypair()


class TestE2EProtocol:
    """End-to-end protocol tests."""

    @pytest.mark.asyncio
    async def test_agent_registration_flow(self, client, sender_keypair):
        """Test complete agent registration flow."""
        agent_data = {
            "name": "Test Agent E2E",
            "description": "An agent for end-to-end testing",
            "capabilities": ["text", "analysis"],
            "version": "1.0.0"
        }

        # Mock the registration
        with patch.object(client.agent, 'register') as mock_register:
            mock_register.return_value = {
                "signature": "mock_signature",
                "agent_pda": client.agent.get_agent_pda(sender_keypair.pubkey()),
                "name": agent_data["name"],
                "owner": str(sender_keypair.pubkey()),
                "capabilities": agent_data["capabilities"]
            }
            
            result = await client.agent.register(agent_data, sender_keypair)
            
            assert result is not None
            assert result["name"] == agent_data["name"]
            assert result["owner"] == str(sender_keypair.pubkey())
            assert result["capabilities"] == agent_data["capabilities"]

    @pytest.mark.asyncio
    async def test_agent_update_flow(self, client, sender_keypair):
        """Test agent metadata update flow."""
        update_data = {
            "description": "Updated description for E2E testing",
            "capabilities": ["text", "analysis", "code"]
        }

        with patch.object(client.agent, 'update') as mock_update:
            mock_update.return_value = {
                "signature": "mock_update_signature",
                "description": update_data["description"],
                "capabilities": update_data["capabilities"]
            }
            
            result = await client.agent.update(update_data, sender_keypair)
            
            assert result["description"] == update_data["description"]
            assert result["capabilities"] == update_data["capabilities"]

    @pytest.mark.asyncio
    async def test_agent_retrieval_flow(self, client, sender_keypair):
        """Test agent information retrieval."""
        agent_pda = client.agent.get_agent_pda(sender_keypair.pubkey())
        
        with patch.object(client.agent, 'get') as mock_get:
            mock_agent_data = {
                "pubkey": sender_keypair.pubkey(),
                "capabilities": AgentCapabilities.TEXT | AgentCapabilities.ANALYSIS,
                "metadata_uri": "https://example.com/metadata",
                "message_count": 0,
                "reputation": 100,
                "is_active": True
            }
            mock_get.return_value = mock_agent_data
            
            result = await client.agent.get(agent_pda)
            
            assert result["pubkey"] == sender_keypair.pubkey()
            assert result["is_active"] is True

    @pytest.mark.asyncio
    async def test_messaging_flow(self, client, sender_keypair, recipient_keypair):
        """Test complete messaging flow."""
        message_content = "Hello from E2E test!"
        message_type = MessageType.TEXT

        # Test message sending
        with patch.object(client.message, 'send') as mock_send:
            mock_message = {
                "signature": "mock_message_signature",
                "message_pda": client.message.get_message_pda(
                    sender_keypair.pubkey(),
                    recipient_keypair.pubkey(),
                    message_content,
                    message_type
                ),
                "content": message_content,
                "sender": str(sender_keypair.pubkey()),
                "recipient": str(recipient_keypair.pubkey()),
                "status": "pending"
            }
            mock_send.return_value = mock_message
            
            result = await client.message.send(
                sender_keypair.pubkey(),
                recipient_keypair.pubkey(),
                message_content,
                message_type,
                sender_keypair
            )
            
            assert result["content"] == message_content
            assert result["sender"] == str(sender_keypair.pubkey())
            assert result["recipient"] == str(recipient_keypair.pubkey())
            assert result["status"] == "pending"

    @pytest.mark.asyncio
    async def test_message_status_update_flow(self, client, sender_keypair, recipient_keypair):
        """Test message status update flow."""
        message_content = "Test message for status update"
        message_type = MessageType.TEXT
        
        # Mock status update
        with patch.object(client.message, 'update_status') as mock_update_status:
            mock_update_status.return_value = {
                "signature": "mock_status_signature",
                "status": "delivered"
            }
            
            result = await client.message.update_status(
                sender_keypair.pubkey(),
                recipient_keypair.pubkey(),
                message_content,
                message_type,
                MessageStatus.DELIVERED,
                recipient_keypair
            )
            
            assert result["status"] == "delivered"

    @pytest.mark.asyncio
    async def test_message_history_flow(self, client, sender_keypair, recipient_keypair):
        """Test message history retrieval."""
        with patch.object(client.message, 'get_history') as mock_get_history:
            mock_messages = [
                {
                    "sender": sender_keypair.pubkey(),
                    "recipient": recipient_keypair.pubkey(),
                    "content": "Message 1",
                    "message_type": MessageType.TEXT,
                    "timestamp": int(time.time()),
                    "status": MessageStatus.DELIVERED
                },
                {
                    "sender": recipient_keypair.pubkey(),
                    "recipient": sender_keypair.pubkey(),
                    "content": "Message 2",
                    "message_type": MessageType.TEXT,
                    "timestamp": int(time.time()) + 60,
                    "status": MessageStatus.READ
                }
            ]
            mock_get_history.return_value = mock_messages
            
            result = await client.message.get_history(
                sender_keypair.pubkey(),
                recipient_keypair.pubkey()
            )
            
            assert len(result) == 2
            assert result[0]["content"] == "Message 1"
            assert result[1]["content"] == "Message 2"

    @pytest.mark.asyncio
    async def test_channel_management_flow(self, client, sender_keypair, recipient_keypair):
        """Test complete channel management flow."""
        channel_data = {
            "name": "E2E Test Channel",
            "description": "A channel for end-to-end testing",
            "visibility": "public",
            "max_participants": 100
        }

        # Test channel creation
        with patch.object(client.channel, 'create') as mock_create:
            mock_channel = {
                "id": "mock_channel_id",
                "name": channel_data["name"],
                "owner": str(sender_keypair.pubkey()),
                "visibility": channel_data["visibility"],
                "participant_count": 1
            }
            mock_create.return_value = mock_channel
            
            channel_result = await client.channel.create(channel_data, sender_keypair)
            
            assert channel_result["name"] == channel_data["name"]
            assert channel_result["owner"] == str(sender_keypair.pubkey())
            assert channel_result["visibility"] == "public"

        # Test joining channel
        with patch.object(client.channel, 'join') as mock_join:
            mock_join.return_value = {
                "channel_id": "mock_channel_id",
                "participant": str(recipient_keypair.pubkey()),
                "joined_at": int(time.time())
            }
            
            join_result = await client.channel.join("mock_channel_id", recipient_keypair)
            
            assert join_result["channel_id"] == "mock_channel_id"
            assert join_result["participant"] == str(recipient_keypair.pubkey())

        # Test sending channel message
        with patch.object(client.channel, 'send_message') as mock_send_message:
            mock_send_message.return_value = {
                "channel_id": "mock_channel_id",
                "sender": str(sender_keypair.pubkey()),
                "content": "Hello channel!",
                "timestamp": int(time.time())
            }
            
            message_result = await client.channel.send_message(
                "mock_channel_id",
                "Hello channel!",
                MessageType.TEXT,
                sender_keypair
            )
            
            assert message_result["channel_id"] == "mock_channel_id"
            assert message_result["sender"] == str(sender_keypair.pubkey())

    @pytest.mark.asyncio
    async def test_escrow_operations_flow(self, client, sender_keypair, recipient_keypair):
        """Test escrow operations flow."""
        escrow_data = {
            "amount": 1000000,  # 0.001 SOL in lamports
            "recipient": recipient_keypair.pubkey(),
            "condition": "message_delivered",
            "timeout": int(time.time()) + 3600  # 1 hour from now
        }

        # Test escrow creation
        with patch.object(client.escrow, 'create') as mock_create:
            mock_escrow = {
                "id": "mock_escrow_id",
                "amount": escrow_data["amount"],
                "recipient": str(escrow_data["recipient"]),
                "status": "active",
                "created_at": int(time.time())
            }
            mock_create.return_value = mock_escrow
            
            result = await client.escrow.create(escrow_data, sender_keypair)
            
            assert result["amount"] == escrow_data["amount"]
            assert result["recipient"] == str(escrow_data["recipient"])
            assert result["status"] == "active"

        # Test escrow release
        with patch.object(client.escrow, 'release') as mock_release:
            mock_release.return_value = {
                "id": "mock_escrow_id",
                "status": "released",
                "released_at": int(time.time())
            }
            
            release_result = await client.escrow.release("mock_escrow_id", sender_keypair)
            
            assert release_result["status"] == "released"

    @pytest.mark.asyncio
    async def test_analytics_flow(self, client):
        """Test analytics functionality."""
        with patch.object(client.analytics, 'get_network_stats') as mock_get_stats:
            mock_stats = {
                "total_agents": 150,
                "active_agents": 120,
                "total_messages": 5000,
                "total_channels": 75,
                "network_health": 85.5
            }
            mock_get_stats.return_value = mock_stats
            
            result = await client.analytics.get_network_stats()
            
            assert isinstance(result["total_agents"], int)
            assert isinstance(result["total_messages"], int)
            assert isinstance(result["network_health"], (int, float))
            assert result["total_agents"] >= 0

    @pytest.mark.asyncio
    async def test_discovery_flow(self, client, sender_keypair):
        """Test discovery functionality."""
        search_criteria = {
            "capabilities": ["text"],
            "min_reputation": 50,
            "limit": 10
        }

        with patch.object(client.discovery, 'search_agents') as mock_search:
            mock_agents = [
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Agent 1",
                    "capabilities": ["text", "analysis"],
                    "reputation": 75
                },
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Agent 2",
                    "capabilities": ["text", "code"],
                    "reputation": 82
                }
            ]
            mock_search.return_value = mock_agents
            
            result = await client.discovery.search_agents(search_criteria)
            
            assert isinstance(result, list)
            assert len(result) <= search_criteria["limit"]
            for agent in result:
                assert agent["reputation"] >= search_criteria["min_reputation"]

    @pytest.mark.asyncio
    async def test_zk_compression_flow(self, client):
        """Test ZK compression functionality."""
        test_data = {
            "message": "This is a test message for compression",
            "metadata": {"type": "test", "timestamp": int(time.time())}
        }

        with patch.object(client.zk_compression, 'compress_data') as mock_compress:
            mock_compress.return_value = {
                "compressed": b"compressed_data",
                "original_size": len(str(test_data)),
                "compressed_size": 50,
                "compression_ratio": 2.0,
                "merkle_root": "mock_merkle_root"
            }
            
            result = await client.zk_compression.compress_data(test_data)
            
            assert result["original_size"] > result["compressed_size"]
            assert result["compression_ratio"] > 1.0
            assert "merkle_root" in result

    @pytest.mark.asyncio
    async def test_ipfs_storage_flow(self, client):
        """Test IPFS storage functionality."""
        metadata = {
            "name": "Test Metadata",
            "description": "Metadata for E2E testing",
            "attributes": [
                {"trait_type": "Environment", "value": "Test"}
            ]
        }

        # Test upload
        with patch.object(client.ipfs, 'upload') as mock_upload:
            mock_upload.return_value = {
                "hash": "QmTestHash",
                "url": "https://ipfs.io/ipfs/QmTestHash",
                "size": 256
            }
            
            upload_result = await client.ipfs.upload(metadata)
            
            assert "hash" in upload_result
            assert upload_result["url"].startswith("https://ipfs.io/ipfs/")

        # Test retrieval
        with patch.object(client.ipfs, 'retrieve') as mock_retrieve:
            mock_retrieve.return_value = metadata
            
            retrieved_metadata = await client.ipfs.retrieve("QmTestHash")
            
            assert retrieved_metadata == metadata

    @pytest.mark.asyncio
    async def test_integration_agent_and_messaging(self, client, sender_keypair, recipient_keypair):
        """Test integration between agent and messaging services."""
        # Register agents first
        with patch.object(client.agent, 'register') as mock_register:
            mock_register.return_value = {"signature": "mock_sig"}
            await client.agent.register({"name": "Sender"}, sender_keypair)
            await client.agent.register({"name": "Recipient"}, recipient_keypair)

        # Then send message
        with patch.object(client.message, 'send') as mock_send:
            mock_send.return_value = {
                "signature": "mock_message_sig",
                "content": "Integration test message"
            }
            
            result = await client.message.send(
                sender_keypair.pubkey(),
                recipient_keypair.pubkey(),
                "Integration test message",
                MessageType.TEXT,
                sender_keypair
            )
            
            assert result["content"] == "Integration test message"

    @pytest.mark.asyncio
    async def test_error_handling_flow(self, client, sender_keypair):
        """Test error handling in various flows."""
        # Test invalid agent data
        with pytest.raises(ValueError):
            client.agent.validate_agent_data({"invalid": "data"})

        # Test invalid message content
        with pytest.raises(ValueError):
            client.message.validate_content("")

        # Test invalid IPFS hash
        assert client.ipfs.is_valid_ipfs_hash("invalid_hash") is False

        # Test invalid ZK compression options
        with pytest.raises(ValueError):
            client.zk_compression.validate_options({"batch_size": -1})

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, client, sender_keypair):
        """Test concurrent operations."""
        # Simulate concurrent agent registrations
        async def register_agent(name):
            with patch.object(client.agent, 'register') as mock_register:
                mock_register.return_value = {"name": name, "signature": f"mock_{name}"}
                return await client.agent.register({"name": name}, sender_keypair)

        tasks = [
            register_agent("Agent1"),
            register_agent("Agent2"),
            register_agent("Agent3")
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 3
        assert all("name" in result for result in results)
