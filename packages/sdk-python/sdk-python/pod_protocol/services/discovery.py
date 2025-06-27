"""
Discovery service for searching and finding agents, channels, and messages in the PoD Protocol.
"""

import time
import asyncio
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum

from .base import BaseService
from ..types import (
    PublicKey, MessageStatus, ChannelVisibility, MessageType,
    AgentAccount, MessageAccount, ChannelAccount
)
from ..utils import (
    has_capability, get_capability_names, format_public_key,
    is_valid_public_key, get_account_timestamp, get_account_created_at,
    get_account_last_updated
)


@dataclass
class SearchFilters:
    """Base search filters."""
    limit: Optional[int] = None
    offset: Optional[int] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


@dataclass
class AgentSearchFilters(SearchFilters):
    """Agent search filters."""
    capabilities: Optional[List[int]] = None
    min_reputation: Optional[int] = None
    max_reputation: Optional[int] = None
    metadata_contains: Optional[str] = None
    last_active_after: Optional[int] = None
    last_active_before: Optional[int] = None


@dataclass
class MessageSearchFilters(SearchFilters):
    """Message search filters."""
    sender: Optional[PublicKey] = None
    recipient: Optional[PublicKey] = None
    status: Optional[List[MessageStatus]] = None
    message_type: Optional[List[MessageType]] = None
    created_after: Optional[int] = None
    created_before: Optional[int] = None
    payload_contains: Optional[str] = None


@dataclass
class ChannelSearchFilters(SearchFilters):
    """Channel search filters."""
    creator: Optional[PublicKey] = None
    visibility: Optional[List[ChannelVisibility]] = None
    name_contains: Optional[str] = None
    description_contains: Optional[str] = None
    min_participants: Optional[int] = None
    max_participants: Optional[int] = None
    max_fee_per_message: Optional[int] = None
    has_escrow: Optional[bool] = None
    created_after: Optional[int] = None
    created_before: Optional[int] = None


@dataclass
class SearchResult:
    """Generic search result."""
    items: List[Any]
    total: int
    has_more: bool
    search_params: Dict[str, Any]
    execution_time: int


@dataclass
class RecommendationOptions:
    """Recommendation options."""
    for_agent: Optional[PublicKey] = None
    limit: Optional[int] = None
    include_reason: Optional[bool] = None


@dataclass
class Recommendation:
    """Recommendation with score and reason."""
    item: Any
    score: float
    reason: Optional[str] = None


class DiscoveryService(BaseService):
    """Service for search and discovery of protocol entities."""

    async def search_agents(
        self, 
        filters: Optional[AgentSearchFilters] = None
    ) -> SearchResult:
        """
        Search for agents with advanced filtering.
        
        Args:
            filters: Agent search filters
            
        Returns:
            Search results with agents
        """
        if filters is None:
            filters = AgentSearchFilters()
        
        start_time = int(time.time() * 1000)
        
        try:
            # Get all agent accounts
            program = self.ensure_initialized()
            accounts = await program.account.agent_account.all()
            
            agents = []
            for acc in accounts:
                agent = AgentAccount(
                    pubkey=acc.public_key,
                    capabilities=acc.account.capabilities,
                    metadata_uri=acc.account.metadata_uri,
                    reputation=acc.account.reputation or 0,
                    last_updated=get_account_last_updated(acc.account),
                    invites_sent=acc.account.invites_sent or 0,
                    last_invite_at=acc.account.last_invite_at or 0,
                    bump=acc.account.bump
                )
                agents.append(agent)
            
            # Apply capability filters (bitmask matching)
            if filters.capabilities:
                agents = [
                    agent for agent in agents
                    if all((agent.capabilities & cap) == cap for cap in filters.capabilities)
                ]
            
            # Apply other filters
            agents = self._apply_agent_filters(agents, filters)
            
            # Apply sorting
            agents = self._sort_agents(agents, filters)
            
            # Apply pagination
            offset = filters.offset or 0
            limit = filters.limit or 50
            paginated_agents = agents[offset:offset + limit]
            
            return SearchResult(
                items=paginated_agents,
                total=len(agents),
                has_more=offset + limit < len(agents),
                search_params=filters.__dict__,
                execution_time=int(time.time() * 1000) - start_time
            )
        except Exception as e:
            raise Exception(f"Agent search failed: {e}")

    async def search_messages(
        self, 
        filters: Optional[MessageSearchFilters] = None
    ) -> SearchResult:
        """
        Search for messages with advanced filtering.
        
        Args:
            filters: Message search filters
            
        Returns:
            Search results with messages
        """
        if filters is None:
            filters = MessageSearchFilters()
        
        start_time = int(time.time() * 1000)
        
        try:
            # Get all message accounts (with optional filters)
            program = self.ensure_initialized()
            program_filters = []
            
            # Add sender filter if specified
            if filters.sender:
                program_filters.append({
                    "memcmp": {
                        "offset": 8 + 32,  # After discriminator and first field
                        "bytes": str(filters.sender)
                    }
                })
            
            # Add recipient filter if specified
            if filters.recipient:
                program_filters.append({
                    "memcmp": {
                        "offset": 8 + 32 + 32,  # After discriminator, sender, and recipient
                        "bytes": str(filters.recipient)
                    }
                })
            
            accounts = await program.account.message_account.all(filters=program_filters)
            
            messages = []
            for acc in accounts:
                message = MessageAccount(
                    pubkey=acc.public_key,
                    sender=acc.account.sender,
                    recipient=acc.account.recipient,
                    payload=acc.account.payload or "",
                    payload_hash=acc.account.payload_hash,
                    message_type=self._convert_message_type_from_program(acc.account.message_type),
                    status=self._convert_message_status_from_program(acc.account.status),
                    timestamp=get_account_timestamp(acc.account),
                    created_at=get_account_created_at(acc.account),
                    expires_at=acc.account.expires_at or 0,
                    bump=acc.account.bump
                )
                messages.append(message)
            
            # Apply in-memory filters
            messages = self._apply_message_filters(messages, filters)
            
            # Apply sorting
            messages = self._sort_messages(messages, filters)
            
            # Apply pagination
            offset = filters.offset or 0
            limit = filters.limit or 50
            paginated_messages = messages[offset:offset + limit]
            
            return SearchResult(
                items=paginated_messages,
                total=len(messages),
                has_more=offset + limit < len(messages),
                search_params=filters.__dict__,
                execution_time=int(time.time() * 1000) - start_time
            )
        except Exception as e:
            raise Exception(f"Message search failed: {e}")

    async def search_channels(
        self, 
        filters: Optional[ChannelSearchFilters] = None
    ) -> SearchResult:
        """
        Search for channels with advanced filtering.
        
        Args:
            filters: Channel search filters
            
        Returns:
            Search results with channels
        """
        if filters is None:
            filters = ChannelSearchFilters()
        
        start_time = int(time.time() * 1000)
        
        try:
            # Get all channel accounts (with optional filters)
            program = self.ensure_initialized()
            program_filters = []
            
            # Add creator filter if specified
            if filters.creator:
                program_filters.append({
                    "memcmp": {
                        "offset": 8,  # After discriminator
                        "bytes": str(filters.creator)
                    }
                })
            
            accounts = await program.account.channel_account.all(filters=program_filters)
            
            channels = []
            for acc in accounts:
                channel = ChannelAccount(
                    pubkey=acc.public_key,
                    creator=acc.account.creator,
                    name=acc.account.name,
                    description=acc.account.description,
                    visibility=self._convert_channel_visibility_from_program(acc.account.visibility),
                    max_participants=acc.account.max_participants,
                    participant_count=acc.account.current_participants,
                    current_participants=acc.account.current_participants,
                    fee_per_message=acc.account.fee_per_message or 0,
                    escrow_balance=acc.account.escrow_balance or 0,
                    created_at=get_account_created_at(acc.account),
                    is_active=True,
                    bump=acc.account.bump
                )
                channels.append(channel)
            
            # Apply in-memory filters
            channels = self._apply_channel_filters(channels, filters)
            
            # Apply sorting
            channels = self._sort_channels(channels, filters)
            
            # Apply pagination
            offset = filters.offset or 0
            limit = filters.limit or 50
            paginated_channels = channels[offset:offset + limit]
            
            return SearchResult(
                items=paginated_channels,
                total=len(channels),
                has_more=offset + limit < len(channels),
                search_params=filters.__dict__,
                execution_time=int(time.time() * 1000) - start_time
            )
        except Exception as e:
            raise Exception(f"Channel search failed: {e}")

    async def get_recommended_agents(
        self, 
        options: Optional[RecommendationOptions] = None
    ) -> List[Recommendation]:
        """
        Get recommended agents based on similarity and activity.
        
        Args:
            options: Recommendation options
            
        Returns:
            List of agent recommendations
        """
        if options is None:
            options = RecommendationOptions()
        
        # Get agents
        search_result = await self.search_agents(AgentSearchFilters(limit=100))
        agents = search_result.items
        
        recommendations = []
        for agent in agents:
            score = 0.0
            reasons = []
            
            # Score based on reputation
            score += min(agent.reputation / 100.0, 1.0) * 0.3
            if agent.reputation > 50:
                reasons.append("High reputation")
            
            # Score based on capabilities diversity
            capability_count = len(get_capability_names(agent.capabilities))
            score += min(capability_count / 4.0, 1.0) * 0.2
            if capability_count >= 3:
                reasons.append("Versatile capabilities")
            
            # Score based on recent activity
            days_since_update = (time.time() - agent.last_updated) / (24 * 60 * 60)
            if days_since_update < 7:
                score += 0.3
                reasons.append("Recently active")
            elif days_since_update < 30:
                score += 0.1
            
            # Random factor for discovery
            import random
            score += random.random() * 0.2
            
            recommendations.append(Recommendation(
                item=agent,
                score=score,
                reason=", ".join(reasons) if options.include_reason else None
            ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:options.limit or 10]

    async def get_recommended_channels(
        self, 
        options: Optional[RecommendationOptions] = None
    ) -> List[Recommendation]:
        """
        Get recommended channels for an agent.
        
        Args:
            options: Recommendation options
            
        Returns:
            List of channel recommendations
        """
        if options is None:
            options = RecommendationOptions()
        
        # Get public channels
        search_result = await self.search_channels(ChannelSearchFilters(
            limit=100,
            visibility=[ChannelVisibility.PUBLIC]
        ))
        channels = search_result.items
        
        recommendations = []
        for channel in channels:
            score = 0.0
            reasons = []
            
            # Score based on participant count
            participant_ratio = channel.participant_count / channel.max_participants
            if 0.3 <= participant_ratio <= 0.8:  # Sweet spot for activity
                score += 0.4
                reasons.append("Active participation")
            elif participant_ratio < 0.3:
                score += 0.2
                reasons.append("Room to grow")
            
            # Score based on low fees
            if channel.fee_per_message == 0:
                score += 0.2
                reasons.append("Free to use")
            elif channel.fee_per_message < 1000:  # Low fee threshold
                score += 0.1
                reasons.append("Low fees")
            
            # Score based on recent activity (creation)
            days_since_creation = (time.time() * 1000 - channel.created_at) / (1000 * 60 * 60 * 24)
            if days_since_creation < 30:
                score += 0.2
                reasons.append("Recently created")
            elif days_since_creation < 90:
                score += 0.1
            
            # Score based on name/description quality
            if len(channel.name) > 3 and len(channel.description) > 10:
                score += 0.1
                reasons.append("Well described")
            
            # Random factor for discovery
            import random
            score += random.random() * 0.1
            
            recommendations.append(Recommendation(
                item=channel,
                score=score,
                reason=", ".join(reasons) if options.include_reason else None
            ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:options.limit or 10]

    # Helper Methods
    def _apply_agent_filters(self, agents: List[AgentAccount], filters: AgentSearchFilters) -> List[AgentAccount]:
        """Apply in-memory filters to agents."""
        result = agents
        
        if filters.min_reputation is not None:
            result = [agent for agent in result if agent.reputation >= filters.min_reputation]
        
        if filters.max_reputation is not None:
            result = [agent for agent in result if agent.reputation <= filters.max_reputation]
        
        if filters.metadata_contains:
            result = [
                agent for agent in result 
                if filters.metadata_contains.lower() in (agent.metadata_uri or "").lower()
            ]
        
        if filters.last_active_after:
            result = [agent for agent in result if agent.last_updated >= filters.last_active_after]
        
        if filters.last_active_before:
            result = [agent for agent in result if agent.last_updated <= filters.last_active_before]
        
        return result

    def _apply_message_filters(self, messages: List[MessageAccount], filters: MessageSearchFilters) -> List[MessageAccount]:
        """Apply in-memory filters to messages."""
        result = messages
        
        if filters.status:
            result = [message for message in result if message.status in filters.status]
        
        if filters.message_type:
            result = [message for message in result if message.message_type in filters.message_type]
        
        if filters.created_after:
            result = [message for message in result if message.created_at >= filters.created_after]
        
        if filters.created_before:
            result = [message for message in result if message.created_at <= filters.created_before]
        
        if filters.payload_contains:
            result = [
                message for message in result 
                if filters.payload_contains.lower() in (message.payload or "").lower()
            ]
        
        return result

    def _apply_channel_filters(self, channels: List[ChannelAccount], filters: ChannelSearchFilters) -> List[ChannelAccount]:
        """Apply in-memory filters to channels."""
        result = channels
        
        if filters.visibility:
            result = [channel for channel in result if channel.visibility in filters.visibility]
        
        if filters.name_contains:
            result = [
                channel for channel in result 
                if filters.name_contains.lower() in channel.name.lower()
            ]
        
        if filters.description_contains:
            result = [
                channel for channel in result 
                if filters.description_contains.lower() in channel.description.lower()
            ]
        
        if filters.min_participants is not None:
            result = [channel for channel in result if channel.participant_count >= filters.min_participants]
        
        if filters.max_participants is not None:
            result = [channel for channel in result if channel.participant_count <= filters.max_participants]
        
        if filters.max_fee_per_message is not None:
            result = [channel for channel in result if channel.fee_per_message <= filters.max_fee_per_message]
        
        if filters.has_escrow is not None:
            if filters.has_escrow:
                result = [channel for channel in result if channel.escrow_balance > 0]
            else:
                result = [channel for channel in result if channel.escrow_balance == 0]
        
        if filters.created_after:
            result = [channel for channel in result if channel.created_at >= filters.created_after]
        
        if filters.created_before:
            result = [channel for channel in result if channel.created_at <= filters.created_before]
        
        return result

    def _sort_agents(self, agents: List[AgentAccount], filters: AgentSearchFilters) -> List[AgentAccount]:
        """Sort agents based on filters."""
        sort_by = filters.sort_by or "reputation"
        reverse = (filters.sort_order or "desc") == "desc"
        
        if sort_by == "reputation":
            return sorted(agents, key=lambda x: x.reputation, reverse=reverse)
        elif sort_by == "recent":
            return sorted(agents, key=lambda x: x.last_updated, reverse=reverse)
        elif sort_by == "relevance":
            # Default to reputation for relevance
            return sorted(agents, key=lambda x: x.reputation, reverse=reverse)
        else:
            return agents

    def _sort_messages(self, messages: List[MessageAccount], filters: MessageSearchFilters) -> List[MessageAccount]:
        """Sort messages based on filters."""
        sort_by = filters.sort_by or "recent"
        reverse = (filters.sort_order or "desc") == "desc"
        
        if sort_by == "recent":
            return sorted(messages, key=lambda x: x.created_at, reverse=reverse)
        elif sort_by == "relevance":
            # Default to timestamp for relevance
            return sorted(messages, key=lambda x: x.timestamp, reverse=reverse)
        else:
            return messages

    def _sort_channels(self, channels: List[ChannelAccount], filters: ChannelSearchFilters) -> List[ChannelAccount]:
        """Sort channels based on filters."""
        sort_by = filters.sort_by or "popular"
        reverse = (filters.sort_order or "desc") == "desc"
        
        if sort_by == "popular":
            return sorted(channels, key=lambda x: x.participant_count, reverse=reverse)
        elif sort_by == "recent":
            return sorted(channels, key=lambda x: x.created_at, reverse=reverse)
        elif sort_by == "relevance":
            # Default to participant count for relevance
            return sorted(channels, key=lambda x: x.participant_count, reverse=reverse)
        else:
            return channels

    def _convert_message_type_from_program(self, program_type: Any) -> MessageType:
        """Convert message type from program format."""
        if isinstance(program_type, dict):
            if "text" in program_type:
                return MessageType.TEXT
            elif "data" in program_type:
                return MessageType.DATA
            elif "command" in program_type:
                return MessageType.COMMAND
            elif "response" in program_type:
                return MessageType.RESPONSE
        return MessageType.TEXT

    def _convert_message_status_from_program(self, program_status: Any) -> MessageStatus:
        """Convert message status from program format."""
        if isinstance(program_status, dict):
            if "pending" in program_status:
                return MessageStatus.PENDING
            elif "delivered" in program_status:
                return MessageStatus.DELIVERED
            elif "read" in program_status:
                return MessageStatus.READ
            elif "failed" in program_status:
                return MessageStatus.FAILED
        return MessageStatus.PENDING

    def _convert_channel_visibility_from_program(self, program_visibility: Any) -> ChannelVisibility:
        """Convert channel visibility from program format."""
        if isinstance(program_visibility, dict):
            if "public" in program_visibility:
                return ChannelVisibility.PUBLIC
            elif "private" in program_visibility:
                return ChannelVisibility.PRIVATE
        return ChannelVisibility.PUBLIC
