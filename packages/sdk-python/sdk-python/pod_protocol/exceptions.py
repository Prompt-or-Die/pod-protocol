"""
Custom exceptions for PoD Protocol SDK
"""


class PodProtocolError(Exception):
    """Base exception for all PoD Protocol SDK errors"""
    
    def __init__(self, message: str, error_code: int = None):
        super().__init__(message)
        self.error_code = error_code


class AgentNotFoundError(PodProtocolError):
    """Raised when an agent is not found"""
    
    def __init__(self, agent_pubkey: str):
        super().__init__(f"Agent not found: {agent_pubkey}", 404)
        self.agent_pubkey = agent_pubkey


class MessageExpiredError(PodProtocolError):
    """Raised when a message has expired"""
    
    def __init__(self, message_id: str):
        super().__init__(f"Message has expired: {message_id}", 6002)
        self.message_id = message_id


class ChannelNotFoundError(PodProtocolError):
    """Raised when a channel is not found"""
    
    def __init__(self, channel_pubkey: str):
        super().__init__(f"Channel not found: {channel_pubkey}", 404)
        self.channel_pubkey = channel_pubkey


class InsufficientFundsError(PodProtocolError):
    """Raised when there are insufficient funds for an operation"""
    
    def __init__(self, required: int, available: int):
        super().__init__(
            f"Insufficient funds: required {required} lamports, "
            f"available {available} lamports", 
            4001
        )
        self.required = required
        self.available = available


class UnauthorizedError(PodProtocolError):
    """Raised when an operation is not authorized"""
    
    def __init__(self, operation: str):
        super().__init__(f"Unauthorized operation: {operation}", 6001)
        self.operation = operation


class InvalidMetadataError(PodProtocolError):
    """Raised when metadata is invalid"""
    
    def __init__(self, reason: str):
        super().__init__(f"Invalid metadata: {reason}", 6000)


class NetworkError(PodProtocolError):
    """Raised when there's a network-related error"""
    
    def __init__(self, message: str):
        super().__init__(f"Network error: {message}", 5000)


class ValidationError(PodProtocolError):
    """Raised when input validation fails"""
    
    def __init__(self, field: str, reason: str):
        super().__init__(f"Validation error for {field}: {reason}", 4000)
        self.field = field


class SerializationError(PodProtocolError):
    """Raised when data serialization/deserialization fails"""
    
    def __init__(self, message: str):
        super().__init__(f"Serialization error: {message}", 5001)


class IPFSError(PodProtocolError):
    """Raised when IPFS operations fail"""
    
    def __init__(self, message: str):
        super().__init__(f"IPFS error: {message}", 5002)


class ZKCompressionError(PodProtocolError):
    """Raised when ZK compression operations fail"""
    
    def __init__(self, message: str):
        super().__init__(f"ZK compression error: {message}", 5003)


class RateLimitError(PodProtocolError):
    """Raised when rate limits are exceeded"""
    
    def __init__(self, retry_after: int = None):
        message = "Rate limit exceeded"
        if retry_after:
            message += f", retry after {retry_after} seconds"
        super().__init__(message, 4029)
        self.retry_after = retry_after


class ConfigurationError(PodProtocolError):
    """Raised when there's a configuration error"""
    
    def __init__(self, message: str):
        super().__init__(f"Configuration error: {message}", 5004)
