"""Basic tests for the PoD Protocol Python SDK."""

import pytest
from unittest.mock import Mock, patch
from solders.pubkey import Pubkey
from solders.keypair import Keypair

from pod_protocol import PodProtocolClient
from pod_protocol.client import PodProtocolClient as DirectClient


class TestBasicSDK:
    """Test basic SDK functionality."""

    def setup_method(self):
        """Setup test environment."""
        self.rpc_url = "http://localhost:8899"
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        self.client = PodProtocolClient(self.rpc_url, self.program_id)
        self.keypair = Keypair()

    def test_client_initialization(self):
        """Test that client initializes correctly."""
        assert self.client is not None
        assert self.client.agent is not None
        assert self.client.message is not None
        assert self.client.channel is not None
        assert self.client.escrow is not None
        assert self.client.analytics is not None
        assert self.client.discovery is not None
        assert self.client.ipfs is not None
        assert self.client.zk_compression is not None

    def test_direct_client_initialization(self):
        """Test direct client initialization."""
        direct_client = DirectClient(self.rpc_url, self.program_id_str=str(self.program_id))
        assert direct_client is not None
        assert direct_client.rpc_url == self.rpc_url
        assert str(direct_client.program_id) == str(self.program_id)

    def test_all_services_initialized(self):
        """Test that all services are properly initialized."""
        services = [
            'agent', 'message', 'channel', 'escrow',
            'analytics', 'discovery', 'ipfs', 'zk_compression'
        ]
        
        for service_name in services:
            service = getattr(self.client, service_name)
            assert service is not None
            assert hasattr(service, 'connection')
            assert hasattr(service, 'program_id')

    def test_service_types(self):
        """Test that services are of correct types."""
        from pod_protocol.services import (
            AgentService, MessageService, ChannelService, EscrowService,
            AnalyticsService, DiscoveryService, IPFSService, ZKCompressionService
        )
        
        assert isinstance(self.client.agent, AgentService)
        assert isinstance(self.client.message, MessageService)
        assert isinstance(self.client.channel, ChannelService)
        assert isinstance(self.client.escrow, EscrowService)
        assert isinstance(self.client.analytics, AnalyticsService)
        assert isinstance(self.client.discovery, DiscoveryService)
        assert isinstance(self.client.ipfs, IPFSService)
        assert isinstance(self.client.zk_compression, ZKCompressionService)

    def test_basic_test_passes(self):
        """Basic test that should always pass."""
        assert True

    @pytest.mark.parametrize("service_name", [
        "agent", "message", "channel", "escrow",
        "analytics", "discovery", "ipfs", "zk_compression"
    ])
    def test_service_has_base_methods(self, service_name):
        """Test that each service has expected base methods."""
        service = getattr(self.client, service_name)
        
        # All services should have these base attributes
        assert hasattr(service, 'connection')
        assert hasattr(service, 'program_id')
        assert hasattr(service, 'commitment')

    def test_client_with_custom_commitment(self):
        """Test client with custom commitment level."""
        client = PodProtocolClient(
            self.rpc_url, 
            self.program_id, 
            commitment="finalized"
        )
        
        assert client.agent.commitment == "finalized"
        assert client.message.commitment == "finalized"

    def test_error_handling_invalid_program_id(self):
        """Test error handling for invalid program ID."""
        with pytest.raises((ValueError, TypeError)):
            PodProtocolClient(self.rpc_url, "invalid_program_id")

    def test_error_handling_invalid_rpc_url(self):
        """Test error handling for invalid RPC URL."""
        # Should not raise immediately, but might fail on actual operations
        client = PodProtocolClient("invalid_url", self.program_id)
        assert client is not None
