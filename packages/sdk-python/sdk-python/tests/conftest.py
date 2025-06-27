"""Test configuration and fixtures for PoD Protocol Python SDK."""

import pytest
import asyncio
from unittest.mock import Mock, patch
from solders.pubkey import Pubkey
from solders.keypair import Keypair

from pod_protocol import PodProtocolClient


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_connection():
    """Create a mock Solana connection."""
    mock_conn = Mock()
    mock_conn.get_account_info = Mock(return_value=None)
    mock_conn.send_transaction = Mock(return_value="mock_signature")
    mock_conn.confirm_transaction = Mock(return_value={"value": {"err": None}})
    return mock_conn


@pytest.fixture
def program_id():
    """Create a test program ID."""
    return Pubkey.from_string("11111111111111111111111111111111")


@pytest.fixture
def test_keypair():
    """Create a test keypair."""
    return Keypair()


@pytest.fixture
def sender_keypair():
    """Create a sender keypair."""
    return Keypair()


@pytest.fixture
def recipient_keypair():
    """Create a recipient keypair."""
    return Keypair()


@pytest.fixture
def client(mock_connection, program_id):
    """Create a test client with mocked connection."""
    with patch('pod_protocol.client.Client') as mock_client_class:
        mock_client_class.return_value = mock_connection
        client = PodProtocolClient("http://localhost:8899", program_id)
        return client


@pytest.fixture
def test_agent_data():
    """Create test agent data."""
    return {
        "name": "Test Agent",
        "description": "A test agent for the PoD Protocol",
        "capabilities": ["text", "analysis"],
        "version": "1.0.0"
    }


@pytest.fixture
def test_message_data():
    """Create test message data."""
    return {
        "content": "Hello from test!",
        "message_type": "text",
        "ttl": 3600
    }


@pytest.fixture
def test_channel_data():
    """Create test channel data."""
    return {
        "name": "Test Channel",
        "description": "A test channel for the PoD Protocol",
        "visibility": "public",
        "max_participants": 100
    }


@pytest.fixture
def test_metadata():
    """Create test metadata."""
    return {
        "name": "Test Metadata",
        "description": "Test metadata for IPFS",
        "attributes": [
            {"trait_type": "Environment", "value": "Test"}
        ]
    }


# Global test configuration
def pytest_configure(config):
    """Configure pytest with custom settings."""
    # Add custom markers
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "network: Tests requiring network access")


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test names."""
    for item in items:
        # Add markers based on test file names
        if "test_e2e" in item.nodeid:
            item.add_marker(pytest.mark.e2e)
        elif "test_integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        elif "test_" in item.nodeid:
            item.add_marker(pytest.mark.unit)
        
        # Add slow marker for tests that might take longer
        if any(keyword in item.nodeid for keyword in ["merkle", "compression", "e2e"]):
            item.add_marker(pytest.mark.slow)


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment for each test."""
    # Mock external dependencies
    with patch('pod_protocol.services.base.Client') as mock_client:
        mock_client.return_value = Mock()
        yield


# Console override for cleaner test output
import sys
original_stderr = sys.stderr


class TestStderr:
    """Custom stderr handler for tests."""
    
    def write(self, data):
        # Filter out expected errors during testing
        if any(msg in data for msg in [
            "Warning:",
            "Expected error for testing",
            "Mock error",
            "Test exception"
        ]):
            return
        original_stderr.write(data)
    
    def flush(self):
        original_stderr.flush()


# Replace stderr during tests
sys.stderr = TestStderr()
