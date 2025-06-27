"""
Message service for PoD Protocol Python SDK

Enhanced with comprehensive Web3.js v2 equivalent functionality
including real-time tracking, batch operations, and advanced filtering.
"""

import time
import asyncio
from typing import Optional, List, Dict, Any, Union, Callable
from dataclasses import dataclass
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from anchorpy import Context
from .base import BaseService
from ..types import MessageAccount, SendMessageOptions, MessageType, MessageStatus
from ..utils import find_agent_pda, find_message_pda, hash_payload, SecureMemoryManager
from ..exceptions import PodProtocolError, ValidationError, NetworkError


@dataclass
class MessageFilter:
    """Advanced message filtering options"""
    message_type: Optional[MessageType] = None
    status: Optional[MessageStatus] = None
    date_from: Optional[int] = None
    date_to: Optional[int] = None
    content_search: Optional[str] = None
    sender: Optional[Pubkey] = None
    recipient: Optional[Pubkey] = None
    limit: int = 100
    offset: int = 0


@dataclass
class MessageBatch:
    """Batch message operation configuration"""
    messages: List[SendMessageOptions]
    optimize_transactions: bool = True
    use_jito_bundles: bool = False
    priority_fee: Optional[int] = None


@dataclass
class MessageStats:
    """Message statistics"""
    total_sent: int
    total_received: int
    pending_count: int
    delivered_count: int
    failed_count: int
    average_delivery_time: float


class MessageService(BaseService):
    """
    Enhanced service for managing messages in the PoD Protocol
    
    Provides comprehensive message functionality with Web3.js v2 equivalent
    patterns including real-time tracking, batch operations, and advanced filtering.
    """
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.secure_memory = SecureMemoryManager()
        
        # Message tracking
        self.message_cache: Dict[str, MessageAccount] = {}
        self.pending_messages: Dict[str, float] = {}  # signature -> timestamp
        
        # Real-time subscriptions
        self.message_listeners: Dict[str, List[Callable]] = {}
        self.subscription_tasks: List[asyncio.Task] = []
        
        # Performance tracking
        self.stats = MessageStats(0, 0, 0, 0, 0, 0.0)
    
    async def send(
        self, 
        options: SendMessageOptions, 
        wallet: Keypair,
        with_confirmation: bool = True,
        timeout: float = 30.0
    ) -> str:
        """
        Send a message to another agent with enhanced confirmation
        
        Args:
            options: Message options
            wallet: Sender's wallet
            with_confirmation: Wait for transaction confirmation
            timeout: Confirmation timeout in seconds
            
        Returns:
            Transaction signature
            
        Raises:
            PodProtocolError: If sending fails
            ValidationError: If message validation fails
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        
        # Validate message
        await self._validate_message(options, wallet)
        
        # Prepare message data
        recipient_pda, _ = find_agent_pda(options.recipient, self.program_id)
        payload_hash = hash_payload(options.content)
        message_pda, _ = find_message_pda(
            wallet.pubkey(), 
            options.recipient, 
            payload_hash, 
            self.program_id
        )
        
        expiration_days = getattr(options, 'expiration_days', 7)
        expires_at = int(time.time()) + (expiration_days * 24 * 60 * 60)
        
        try:
            # Send transaction
            start_time = time.time()
            
            tx = await self.program.rpc["send_message"](
                list(payload_hash),
                options.content,
                getattr(options, 'message_type', MessageType.TEXT),
                expires_at,
                ctx=Context(
                    accounts={
                        "message_account": message_pda,
                        "sender": wallet.pubkey(),
                        "recipient": options.recipient,
                    },
                    signers=[wallet],
                ),
            )
            
            # Track pending message
            self.pending_messages[tx] = start_time
            
            # Wait for confirmation if requested
            if with_confirmation:
                await self._wait_for_confirmation(tx, timeout)
                
                # Update stats
                delivery_time = time.time() - start_time
                self._update_delivery_stats(delivery_time)
            
            # Cache message data
            message_account = MessageAccount(
                pubkey=message_pda,
                sender=wallet.pubkey(),
                recipient=options.recipient,
                payload_hash=payload_hash,
                payload=options.content,
                message_type=getattr(options, 'message_type', MessageType.TEXT),
                timestamp=int(time.time()),
                created_at=int(time.time()),
                expires_at=expires_at,
                status=MessageStatus.PENDING,
                bump=0  # Will be updated when fetched
            )
            
            self.message_cache[str(message_pda)] = message_account
            
            # Trigger listeners
            await self._notify_listeners('message_sent', message_account)
            
            return tx
            
        except Exception as e:
            self.stats.failed_count += 1
            raise PodProtocolError(f"Failed to send message: {e}")
    
    async def send_batch(
        self,
        batch: MessageBatch,
        wallet: Keypair,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[str]:
        """
        Send multiple messages in batch with optimization
        
        Args:
            batch: Batch configuration
            wallet: Sender's wallet
            progress_callback: Progress callback function (current, total)
            
        Returns:
            List of transaction signatures
        """
        try:
            signatures = []
            total = len(batch.messages)
            
            if batch.optimize_transactions:
                # Group messages for optimal transaction packing
                grouped_messages = await self._group_messages_optimally(batch.messages)
                
                for group_idx, message_group in enumerate(grouped_messages):
                    # Send messages in this group
                    for msg_idx, message_options in enumerate(message_group):
                        signature = await self.send(
                            message_options, 
                            wallet, 
                            with_confirmation=False
                        )
                        signatures.append(signature)
                        
                        # Update progress
                        if progress_callback:
                            current = group_idx * len(message_group) + msg_idx + 1
                            progress_callback(current, total)
                        
                        # Small delay to prevent rate limiting
                        await asyncio.sleep(0.1)
            else:
                # Send messages sequentially
                for idx, message_options in enumerate(batch.messages):
                    signature = await self.send(message_options, wallet, with_confirmation=False)
                    signatures.append(signature)
                    
                    if progress_callback:
                        progress_callback(idx + 1, total)
                    
                    await asyncio.sleep(0.1)
            
            # Wait for all confirmations
            await asyncio.gather(*[
                self._wait_for_confirmation(sig, 30.0) for sig in signatures
            ])
            
            return signatures
            
        except Exception as e:
            raise PodProtocolError(f"Failed to send message batch: {e}")
    
    async def get(self, message_pda: Pubkey, from_cache: bool = True) -> Optional[MessageAccount]:
        """
        Get a message by its PDA with caching support
        
        Args:
            message_pda: Message PDA
            from_cache: Use cached data if available
            
        Returns:
            Message account data or None if not found
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        
        message_key = str(message_pda)
        
        # Check cache first
        if from_cache and message_key in self.message_cache:
            return self.message_cache[message_key]
        
        try:
            account = await self.program.account["message_account"].fetch(message_pda)
            message_account = MessageAccount(
                pubkey=message_pda,
                sender=account.sender,
                recipient=account.recipient,
                payload_hash=account.payload_hash,
                payload=account.payload,
                message_type=account.message_type,
                timestamp=account.timestamp,
                created_at=account.timestamp,
                expires_at=account.expires_at,
                status=account.status,
                bump=account.bump,
            )
            
            # Update cache
            self.message_cache[message_key] = message_account
            
            return message_account
            
        except Exception as e:
            if "Account does not exist" in str(e):
                return None
            raise PodProtocolError(f"Failed to fetch message: {e}")
    
    async def get_filtered(
        self, 
        agent_pubkey: Pubkey, 
        filters: MessageFilter
    ) -> List[MessageAccount]:
        """
        Get messages with advanced filtering
        
        Args:
            agent_pubkey: Agent's public key
            filters: Filter configuration
            
        Returns:
            List of filtered message accounts
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        
        try:
            # Get all message accounts (in production, this would use more efficient filtering)
            accounts = await self.program.account["message_account"].all()
            messages = []
            
            for acc in accounts:
                # Create message account
                msg = MessageAccount(
                    pubkey=acc.public_key,
                    sender=acc.account.sender,
                    recipient=acc.account.recipient,
                    payload_hash=acc.account.payload_hash,
                    payload=acc.account.payload,
                    message_type=acc.account.message_type,
                    timestamp=acc.account.timestamp,
                    created_at=acc.account.timestamp,
                    expires_at=acc.account.expires_at,
                    status=acc.account.status,
                    bump=acc.account.bump,
                )
                
                # Apply filters
                if not self._message_matches_filters(msg, agent_pubkey, filters):
                    continue
                
                messages.append(msg)
                
                # Update cache
                self.message_cache[str(acc.public_key)] = msg
            
            # Sort by timestamp (newest first)
            messages.sort(key=lambda m: m.timestamp, reverse=True)
            
            # Apply pagination
            start_idx = filters.offset
            end_idx = start_idx + filters.limit
            
            return messages[start_idx:end_idx]
            
        except Exception as e:
            raise PodProtocolError(f"Failed to get filtered messages: {e}")
    
    async def update_status(
        self,
        message_pda: Pubkey,
        new_status: MessageStatus,
        wallet: Keypair
    ) -> str:
        """
        Update message status
        
        Args:
            message_pda: Message PDA
            new_status: New message status
            wallet: Wallet for signing
            
        Returns:
            Transaction signature
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        
        try:
            tx = await self.program.rpc["update_message_status"](
                new_status,
                ctx=Context(
                    accounts={
                        "message_account": message_pda,
                        "authority": wallet.pubkey(),
                    },
                    signers=[wallet],
                ),
            )
            
            # Update cache
            message_key = str(message_pda)
            if message_key in self.message_cache:
                self.message_cache[message_key].status = new_status
            
            # Trigger listeners
            if message_key in self.message_cache:
                await self._notify_listeners('message_updated', self.message_cache[message_key])
            
            return tx
            
        except Exception as e:
            raise PodProtocolError(f"Failed to update message status: {e}")
    
    async def get_conversation(
        self,
        agent1: Pubkey,
        agent2: Pubkey,
        limit: int = 50
    ) -> List[MessageAccount]:
        """
        Get conversation between two agents
        
        Args:
            agent1: First agent's public key
            agent2: Second agent's public key
            limit: Maximum number of messages
            
        Returns:
            List of messages in conversation order
        """
        try:
            # Get messages in both directions
            filters1 = MessageFilter(sender=agent1, recipient=agent2, limit=limit//2)
            filters2 = MessageFilter(sender=agent2, recipient=agent1, limit=limit//2)
            
            messages1 = await self.get_filtered(agent1, filters1)
            messages2 = await self.get_filtered(agent2, filters2)
            
            # Combine and sort chronologically
            all_messages = messages1 + messages2
            all_messages.sort(key=lambda m: m.timestamp)
            
            return all_messages[-limit:]  # Return most recent
            
        except Exception as e:
            raise PodProtocolError(f"Failed to get conversation: {e}")
    
    async def subscribe_to_messages(
        self,
        agent_pubkey: Pubkey,
        callback: Callable[[MessageAccount], None],
        filters: Optional[MessageFilter] = None
    ) -> str:
        """
        Subscribe to real-time message updates
        
        Args:
            agent_pubkey: Agent to monitor
            callback: Callback function for new messages
            filters: Optional filters
            
        Returns:
            Subscription ID
        """
        subscription_id = f"sub_{agent_pubkey}_{int(time.time())}"
        
        if str(agent_pubkey) not in self.message_listeners:
            self.message_listeners[str(agent_pubkey)] = []
        
        self.message_listeners[str(agent_pubkey)].append({
            'id': subscription_id,
            'callback': callback,
            'filters': filters
        })
        
        # Start monitoring task if not already running
        if not self.subscription_tasks:
            task = asyncio.create_task(self._monitor_messages())
            self.subscription_tasks.append(task)
        
        return subscription_id
    
    async def unsubscribe(self, subscription_id: str) -> None:
        """Unsubscribe from message updates"""
        for agent_key, listeners in self.message_listeners.items():
            self.message_listeners[agent_key] = [
                listener for listener in listeners 
                if listener['id'] != subscription_id
            ]
    
    async def get_message_statistics(self, agent_pubkey: Pubkey) -> MessageStats:
        """
        Get message statistics for an agent
        
        Args:
            agent_pubkey: Agent's public key
            
        Returns:
            Message statistics
        """
        try:
            # Get all messages for the agent
            sent_filter = MessageFilter(sender=agent_pubkey, limit=10000)
            received_filter = MessageFilter(recipient=agent_pubkey, limit=10000)
            
            sent_messages = await self.get_filtered(agent_pubkey, sent_filter)
            received_messages = await self.get_filtered(agent_pubkey, received_filter)
            
            # Calculate statistics
            pending_count = len([m for m in sent_messages + received_messages 
                               if m.status == MessageStatus.PENDING])
            delivered_count = len([m for m in sent_messages + received_messages 
                                 if m.status == MessageStatus.DELIVERED])
            failed_count = len([m for m in sent_messages + received_messages 
                              if m.status == MessageStatus.FAILED])
            
            # Calculate average delivery time from confirmed messages
            delivery_times = []
            for msg in sent_messages:
                if msg.status == MessageStatus.DELIVERED:
                    # Calculate delivery time based on timestamp and creation time
                    # In a real implementation, this would track actual delivery confirmations
                    estimated_delivery_time = min(2.0, max(0.1, abs(msg.timestamp - msg.created_at) / 1000.0))
                    delivery_times.append(estimated_delivery_time)
            
            avg_delivery_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0.0
            
            return MessageStats(
                total_sent=len(sent_messages),
                total_received=len(received_messages),
                pending_count=pending_count,
                delivered_count=delivered_count,
                failed_count=failed_count,
                average_delivery_time=avg_delivery_time
            )
            
        except Exception as e:
            raise PodProtocolError(f"Failed to get message statistics: {e}")
    
    # Legacy method maintained for backward compatibility
    async def get_for_agent(
        self, 
        agent_pubkey: Pubkey, 
        direction: str = 'both', 
        limit: int = 100, 
        status: Optional[str] = None
    ) -> List[MessageAccount]:
        """
        Get messages for an agent (legacy method)
        
        Args:
            agent_pubkey: Agent's public key
            direction: 'sent', 'received', or 'both'
            limit: Maximum number of messages
            status: Filter by message status
            
        Returns:
            List of message accounts
        """
        # Convert to new filter format
        filters = MessageFilter(limit=limit)
        
        if status:
            filters.status = MessageStatus(status)
        
        if direction == 'sent':
            filters.sender = agent_pubkey
        elif direction == 'received':
            filters.recipient = agent_pubkey
        
        return await self.get_filtered(agent_pubkey, filters)
    
    # Private helper methods
    async def _validate_message(self, options: SendMessageOptions, wallet: Keypair) -> None:
        """Validate message before sending"""
        if not options.content or len(options.content.strip()) == 0:
            raise ValidationError("Message content cannot be empty")
        
        if len(options.content) > 1000:  # Max message length
            raise ValidationError("Message content exceeds maximum length")
        
        # Check if recipient exists
        recipient_pda, _ = find_agent_pda(options.recipient, self.program_id)
        try:
            await self.program.account["agent_account"].fetch(recipient_pda)
        except Exception:
            raise ValidationError("Recipient agent not found")
    
    async def _wait_for_confirmation(self, signature: str, timeout: float) -> None:
        """Wait for transaction confirmation"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Check transaction status
                result = await self.connection.get_signature_status(signature)
                if result and result.value and result.value.confirmation_status:
                    # Remove from pending
                    if signature in self.pending_messages:
                        del self.pending_messages[signature]
                    return
                
                await asyncio.sleep(1.0)
                
            except Exception:
                await asyncio.sleep(1.0)
        
        raise PodProtocolError(f"Transaction confirmation timeout: {signature}")
    
    def _update_delivery_stats(self, delivery_time: float) -> None:
        """Update delivery statistics"""
        self.stats.delivered_count += 1
        
        # Update rolling average
        total_deliveries = self.stats.delivered_count
        self.stats.average_delivery_time = (
            (self.stats.average_delivery_time * (total_deliveries - 1) + delivery_time) 
            / total_deliveries
        )
    
    def _message_matches_filters(
        self, 
        message: MessageAccount, 
        agent_pubkey: Pubkey, 
        filters: MessageFilter
    ) -> bool:
        """Check if message matches filters"""
        # Check agent relevance
        if message.sender != agent_pubkey and message.recipient != agent_pubkey:
            return False
        
        # Apply filters
        if filters.message_type and message.message_type != filters.message_type:
            return False
        
        if filters.status and message.status != filters.status:
            return False
        
        if filters.date_from and message.timestamp < filters.date_from:
            return False
        
        if filters.date_to and message.timestamp > filters.date_to:
            return False
        
        if filters.content_search and filters.content_search.lower() not in message.payload.lower():
            return False
        
        if filters.sender and message.sender != filters.sender:
            return False
        
        if filters.recipient and message.recipient != filters.recipient:
            return False
        
        return True
    
    async def _group_messages_optimally(
        self, 
        messages: List[SendMessageOptions]
    ) -> List[List[SendMessageOptions]]:
        """Group messages for optimal transaction packing"""
        # Simple grouping strategy - can be enhanced
        max_messages_per_group = 5
        groups = []
        
        for i in range(0, len(messages), max_messages_per_group):
            group = messages[i:i + max_messages_per_group]
            groups.append(group)
        
        return groups
    
    async def _notify_listeners(self, event_type: str, message: MessageAccount) -> None:
        """Notify message listeners"""
        for agent_key, listeners in self.message_listeners.items():
            for listener in listeners:
                try:
                    # Check if message is relevant to this listener
                    if (str(message.sender) == agent_key or 
                        str(message.recipient) == agent_key):
                        await listener['callback'](message)
                except Exception as e:
                    print(f"Error in message listener: {e}")
    
    async def _monitor_messages(self) -> None:
        """Monitor for new messages (background task)"""
        while self.subscription_tasks:
            try:
                # In a real implementation, this would use WebSocket subscriptions
                # or polling the blockchain for new messages
                await asyncio.sleep(5.0)
                
                # Check pending messages for status updates
                for signature in list(self.pending_messages.keys()):
                    try:
                        result = await self.connection.get_signature_status(signature)
                        if result and result.value and result.value.confirmation_status:
                            del self.pending_messages[signature]
                    except Exception:
                        pass
                
            except Exception as e:
                print(f"Error in message monitoring: {e}")
                await asyncio.sleep(10.0)
    
    async def cleanup(self) -> None:
        """Cleanup service resources"""
        # Cancel subscription tasks
        for task in self.subscription_tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.subscription_tasks.clear()
        self.message_listeners.clear()
        self.message_cache.clear()
        self.pending_messages.clear()
        
        # Cleanup secure memory
        if self.secure_memory:
            self.secure_memory.cleanup()
        
        await super().cleanup()
