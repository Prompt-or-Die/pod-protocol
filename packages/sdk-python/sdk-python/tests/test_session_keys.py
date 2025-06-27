"""
Tests for the Session Keys service
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from solders.keypair import Keypair
from solders.pubkey import Pubkey

from pod_protocol.services.session_keys import (
    SessionKeysService, 
    SessionKeyConfig, 
    SessionTokenData
)
from pod_protocol.exceptions import PodProtocolError, UnauthorizedError


@pytest.fixture
def mock_config():
    """Mock service configuration"""
    return {
        'connection': Mock(),
        'program_id': Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"),
        'commitment': 'confirmed'
    }


@pytest.fixture
def session_service(mock_config):
    """Create a SessionKeysService instance for testing"""
    return SessionKeysService(mock_config)


@pytest.fixture
def mock_wallet():
    """Mock wallet for testing"""
    wallet = Mock()
    wallet.pubkey.return_value = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")
    return wallet


@pytest.fixture
def session_config():
    """Session configuration for testing"""
    return SessionKeyConfig(
        target_programs=[Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")],
        expiry_time=int(time.time()) + 3600,  # 1 hour from now
        max_uses=100,
        allowed_instructions=["send_message", "create_channel"],
        rate_limit_per_minute=60
    )


class TestSessionKeysService:
    """Test suite for SessionKeysService"""
    
    def test_service_initialization(self, session_service):
        """Test service initializes correctly"""
        assert session_service.sessions == {}
        assert session_service.rate_limit_cache == {}
        assert session_service.wallet is None
        assert session_service.auto_cleanup_interval == 300
    
    def test_set_wallet(self, session_service, mock_wallet):
        """Test wallet setting"""
        session_service.set_wallet(mock_wallet)
        assert session_service.wallet == mock_wallet
    
    @pytest.mark.asyncio
    async def test_create_session_success(self, session_service, mock_wallet, session_config):
        """Test successful session creation"""
        session_service.set_wallet(mock_wallet)
        
        # Mock the necessary methods
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                mock_send.return_value = "test_signature"
                
                token = await session_service.create_session(session_config)
                
                assert token is not None
                assert len(token) == 64  # SHA256 hash length
                assert token in session_service.sessions
                
                # Verify session data
                session_data = session_service.sessions[token]
                assert session_data.config == session_config
                assert session_data.is_active is True
                assert session_data.uses_remaining == session_config.max_uses
    
    @pytest.mark.asyncio
    async def test_create_session_no_wallet(self, session_service, session_config):
        """Test session creation without wallet fails"""
        with pytest.raises(PodProtocolError, match="No wallet available"):
            await session_service.create_session(session_config)
    
    @pytest.mark.asyncio
    async def test_use_session_success(self, session_service, mock_wallet, session_config):
        """Test successful session usage"""
        session_service.set_wallet(mock_wallet)
        
        # Create a session first
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                mock_send.return_value = "test_signature"
                token = await session_service.create_session(session_config)
        
        # Mock instructions
        mock_instructions = [Mock(), Mock()]
        
        # Test using the session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = "use_signature"
            
            signature = await session_service.use_session(
                token, 
                mock_instructions, 
                "Test transaction"
            )
            
            assert signature == "use_signature"
            
            # Verify usage count decremented
            session_data = session_service.sessions[token]
            assert session_data.uses_remaining == session_config.max_uses - 1
    
    @pytest.mark.asyncio
    async def test_use_session_invalid_token(self, session_service):
        """Test using session with invalid token"""
        with pytest.raises(UnauthorizedError, match="Invalid session token"):
            await session_service.use_session("invalid_token", [], "Test")
    
    @pytest.mark.asyncio
    async def test_use_session_expired(self, session_service, mock_wallet):
        """Test using expired session"""
        session_service.set_wallet(mock_wallet)
        
        # Create expired session config
        expired_config = SessionKeyConfig(
            target_programs=[Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")],
            expiry_time=int(time.time()) - 3600,  # 1 hour ago
            max_uses=100
        )
        
        # Create session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                token = await session_service.create_session(expired_config)
        
        # Try to use expired session
        with pytest.raises(UnauthorizedError, match="Session has expired"):
            await session_service.use_session(token, [], "Test")
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, session_service, mock_wallet, session_config):
        """Test rate limiting functionality"""
        session_service.set_wallet(mock_wallet)
        
        # Create session with low rate limit
        limited_config = SessionKeyConfig(
            target_programs=[Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")],
            expiry_time=int(time.time()) + 3600,
            max_uses=100,
            rate_limit_per_minute=2  # Very low limit
        )
        
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                token = await session_service.create_session(limited_config)
        
        # Use session multiple times rapidly
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            # First two uses should succeed
            await session_service.use_session(token, [], "Test 1")
            await session_service.use_session(token, [], "Test 2")
            
            # Third use should fail due to rate limiting
            with pytest.raises(PodProtocolError, match="Rate limit exceeded"):
                await session_service.use_session(token, [], "Test 3")
    
    @pytest.mark.asyncio
    async def test_revoke_session(self, session_service, mock_wallet, session_config):
        """Test session revocation"""
        session_service.set_wallet(mock_wallet)
        
        # Create session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                mock_send.return_value = "create_signature"
                token = await session_service.create_session(session_config)
        
        # Revoke session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            with patch.object(session_service, '_create_revoke_instruction', new_callable=AsyncMock):
                mock_send.return_value = "revoke_signature"
                
                signature = await session_service.revoke_session(token)
                
                assert signature == "revoke_signature"
                assert token not in session_service.sessions
    
    @pytest.mark.asyncio
    async def test_get_session_info(self, session_service, mock_wallet, session_config):
        """Test getting session information"""
        session_service.set_wallet(mock_wallet)
        
        # Create session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                token = await session_service.create_session(session_config)
        
        # Get session info
        info = await session_service.get_session_info(token)
        
        assert 'token_account' in info
        assert 'created_at' in info
        assert 'expiry_time' in info
        assert 'uses_remaining' in info
        assert 'is_active' in info
        assert 'is_expired' in info
        assert 'target_programs' in info
        assert 'rate_limit_per_minute' in info
        
        assert info['is_active'] is True
        assert info['is_expired'] is False
        assert info['uses_remaining'] == session_config.max_uses
    
    @pytest.mark.asyncio
    async def test_list_active_sessions(self, session_service, mock_wallet, session_config):
        """Test listing active sessions"""
        session_service.set_wallet(mock_wallet)
        
        # Create multiple sessions
        tokens = []
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                for i in range(3):
                    token = await session_service.create_session(session_config)
                    tokens.append(token)
        
        # List active sessions
        active_sessions = await session_service.list_active_sessions()
        
        assert len(active_sessions) == 3
        
        for session_info in active_sessions:
            assert 'token' in session_info
            assert 'created_at' in session_info
            assert 'expiry_time' in session_info
            assert 'uses_remaining' in session_info
            assert 'target_programs' in session_info
            
            # Token should be truncated for security
            assert len(session_info['token']) == 19  # 16 chars + "..."
    
    @pytest.mark.asyncio
    async def test_session_usage_exhaustion(self, session_service, mock_wallet):
        """Test session becomes inactive when uses are exhausted"""
        session_service.set_wallet(mock_wallet)
        
        # Create session with limited uses
        limited_config = SessionKeyConfig(
            target_programs=[Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")],
            expiry_time=int(time.time()) + 3600,
            max_uses=1  # Only one use
        )
        
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                token = await session_service.create_session(limited_config)
        
        # Use session once
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            await session_service.use_session(token, [], "Test")
        
        # Session should now be inactive
        session_data = session_service.sessions[token]
        assert session_data.is_active is False
        assert session_data.uses_remaining == 0
        
        # Second use should fail
        with pytest.raises(UnauthorizedError, match="Session usage limit exceeded"):
            await session_service.use_session(token, [], "Test 2")
    
    @pytest.mark.asyncio
    async def test_cleanup(self, session_service, mock_wallet, session_config):
        """Test service cleanup"""
        session_service.set_wallet(mock_wallet)
        
        # Create session
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock):
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                token = await session_service.create_session(session_config)
        
        # Add some rate limit data
        session_service.rate_limit_cache[token] = [time.time()]
        
        # Cleanup
        await session_service.cleanup()
        
        # Verify cleanup
        assert len(session_service.sessions) == 0
        assert len(session_service.rate_limit_cache) == 0


@pytest.mark.session_keys
@pytest.mark.integration
class TestSessionKeysIntegration:
    """Integration tests for session keys functionality"""
    
    @pytest.mark.asyncio
    async def test_session_lifecycle(self, session_service, mock_wallet, session_config):
        """Test complete session lifecycle"""
        session_service.set_wallet(mock_wallet)
        
        with patch.object(session_service, '_send_transaction', new_callable=AsyncMock) as mock_send:
            with patch.object(session_service, '_create_session_instruction', new_callable=AsyncMock):
                with patch.object(session_service, '_create_revoke_instruction', new_callable=AsyncMock):
                    mock_send.return_value = "test_signature"
                    
                    # 1. Create session
                    token = await session_service.create_session(session_config)
                    assert token in session_service.sessions
                    
                    # 2. Use session
                    await session_service.use_session(token, [], "Test transaction")
                    
                    # 3. Check session info
                    info = await session_service.get_session_info(token)
                    assert info['uses_remaining'] == session_config.max_uses - 1
                    
                    # 4. List active sessions
                    active = await session_service.list_active_sessions()
                    assert len(active) == 1
                    
                    # 5. Revoke session
                    await session_service.revoke_session(token)
                    assert token not in session_service.sessions


@pytest.mark.session_keys
@pytest.mark.unit
class TestSessionKeyHelpers:
    """Test helper methods for session keys"""
    
    def test_generate_session_token(self, session_service):
        """Test session token generation"""
        session_pubkey = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")
        wallet_pubkey = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")
        
        token1 = session_service._generate_session_token(session_pubkey, wallet_pubkey)
        token2 = session_service._generate_session_token(session_pubkey, wallet_pubkey)
        
        # Tokens should be different due to random component
        assert token1 != token2
        assert len(token1) == 64  # SHA256 hash length
        assert len(token2) == 64
    
    def test_derive_session_token_account(self, session_service):
        """Test session token account derivation"""
        wallet_pubkey = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")
        session_pubkey = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")
        
        pda = session_service._derive_session_token_account(wallet_pubkey, session_pubkey)
        
        # Should return a valid Pubkey
        assert isinstance(pda, Pubkey)
        
        # Should be deterministic
        pda2 = session_service._derive_session_token_account(wallet_pubkey, session_pubkey)
        assert pda == pda2 