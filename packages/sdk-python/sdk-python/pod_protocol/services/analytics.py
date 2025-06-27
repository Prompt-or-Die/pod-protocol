"""
Analytics service for generating insights on agent activities, message patterns, and channel usage.
"""

import time
import json
from typing import List, Optional, Dict, Any, NamedTuple
from dataclasses import dataclass
from enum import Enum

from .base import BaseService
from ..types import (
    PublicKey, MessageStatus, ChannelVisibility, MessageType,
    AgentAccount, MessageAccount, ChannelAccount, EscrowAccount
)
from ..utils import (
    lamports_to_sol, format_duration, format_bytes, 
    get_capability_names, has_capability
)


@dataclass
class AgentAnalytics:
    """Agent ecosystem analytics."""
    total_agents: int
    capability_distribution: Dict[str, int]
    average_reputation: float
    top_agents_by_reputation: List[AgentAccount]
    recently_active: List[AgentAccount]


@dataclass
class MessageAnalytics:
    """Message analytics and patterns."""
    total_messages: int
    messages_by_status: Dict[str, int]
    messages_by_type: Dict[str, int]
    average_message_size: float
    messages_per_day: float
    top_senders: List[Dict[str, Any]]
    recent_messages: List[MessageAccount]


@dataclass
class ChannelAnalytics:
    """Channel usage analytics."""
    total_channels: int
    channels_by_visibility: Dict[str, int]
    average_participants: float
    most_popular_channels: List[ChannelAccount]
    total_escrow_value: int
    average_channel_fee: float


@dataclass
class NetworkAnalytics:
    """Network-wide analytics."""
    total_transactions: int
    total_value_locked: int
    active_agents_24h: int
    message_volume_24h: int
    network_health: str
    peak_usage_hours: List[int]


@dataclass
class DashboardData:
    """Comprehensive analytics dashboard data."""
    agents: AgentAnalytics
    messages: MessageAnalytics
    channels: ChannelAnalytics
    network: NetworkAnalytics
    generated_at: int


class AnalyticsService(BaseService):
    """Service for analytics and insights."""

    async def get_dashboard(self) -> DashboardData:
        """
        Get comprehensive analytics dashboard.
        
        Returns:
            Complete dashboard data
        """
        agents_analytics = await self.get_agent_analytics()
        messages_analytics = await self.get_message_analytics()
        channels_analytics = await self.get_channel_analytics()
        network_analytics = await self.get_network_analytics()
        
        return DashboardData(
            agents=agents_analytics,
            messages=messages_analytics,
            channels=channels_analytics,
            network=network_analytics,
            generated_at=int(time.time() * 1000)
        )

    async def get_agent_analytics(self, limit: int = 100) -> AgentAnalytics:
        """
        Get agent ecosystem analytics.
        
        Args:
            limit: Maximum number of agents to analyze
            
        Returns:
            Agent analytics data
        """
        try:
            # Get agent accounts
            agents = await self._fetch_agent_accounts(limit)
            
            # Calculate capability distribution
            capability_distribution = {}
            for agent in agents:
                capabilities = get_capability_names(agent.capabilities)
                for cap in capabilities:
                    capability_distribution[cap] = capability_distribution.get(cap, 0) + 1
            
            # Calculate average reputation
            average_reputation = (
                sum(agent.reputation for agent in agents) / len(agents)
                if agents else 0
            )
            
            # Get top agents by reputation
            top_agents_by_reputation = sorted(
                agents, 
                key=lambda x: x.reputation, 
                reverse=True
            )[:10]
            
            # Get recently active agents (last 24 hours)
            twenty_four_hours_ago = int(time.time() * 1000) - (24 * 60 * 60 * 1000)
            recently_active = [
                agent for agent in agents 
                if agent.last_updated * 1000 > twenty_four_hours_ago
            ]
            recently_active.sort(key=lambda x: x.last_updated, reverse=True)
            recently_active = recently_active[:20]
            
            return AgentAnalytics(
                total_agents=len(agents),
                capability_distribution=capability_distribution,
                average_reputation=average_reputation,
                top_agents_by_reputation=top_agents_by_reputation,
                recently_active=recently_active
            )
        except Exception as e:
            raise Exception(f"Failed to get agent analytics: {e}")

    async def get_message_analytics(self, limit: int = 1000) -> MessageAnalytics:
        """
        Get message analytics and patterns.
        
        Args:
            limit: Maximum number of messages to analyze
            
        Returns:
            Message analytics data
        """
        try:
            # Get message accounts
            messages = await self._fetch_message_accounts(limit)
            
            # Group messages by status
            messages_by_status = {}
            for status in MessageStatus:
                messages_by_status[status.value] = sum(
                    1 for msg in messages if msg.status == status
                )
            
            # Group messages by type
            messages_by_type = {}
            for msg in messages:
                msg_type = msg.message_type.value if hasattr(msg.message_type, 'value') else str(msg.message_type)
                messages_by_type[msg_type] = messages_by_type.get(msg_type, 0) + 1
            
            # Calculate average message size
            average_message_size = (
                sum(len(msg.payload or "") for msg in messages) / len(messages)
                if messages else 0
            )
            
            # Calculate messages per day (last 7 days)
            seven_days_ago = int(time.time() * 1000) - (7 * 24 * 60 * 60 * 1000)
            recent_messages = [
                msg for msg in messages 
                if msg.timestamp * 1000 > seven_days_ago
            ]
            messages_per_day = len(recent_messages) / 7.0
            
            # Get top senders
            sender_counts = {}
            for msg in messages:
                sender_str = str(msg.sender)
                sender_counts[sender_str] = sender_counts.get(sender_str, 0) + 1
            
            top_senders = [
                {"agent": PublicKey(sender), "message_count": count}
                for sender, count in sorted(
                    sender_counts.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:10]
            ]
            
            return MessageAnalytics(
                total_messages=len(messages),
                messages_by_status=messages_by_status,
                messages_by_type=messages_by_type,
                average_message_size=average_message_size,
                messages_per_day=messages_per_day,
                top_senders=top_senders,
                recent_messages=messages[:20]
            )
        except Exception as e:
            raise Exception(f"Failed to get message analytics: {e}")

    async def get_channel_analytics(self, limit: int = 100) -> ChannelAnalytics:
        """
        Get channel usage analytics.
        
        Args:
            limit: Maximum number of channels to analyze
            
        Returns:
            Channel analytics data
        """
        try:
            # Get channel accounts
            channels = await self._fetch_channel_accounts(limit)
            
            # Group channels by visibility
            channels_by_visibility = {}
            for visibility in ChannelVisibility:
                channels_by_visibility[visibility.value] = sum(
                    1 for channel in channels if channel.visibility == visibility
                )
            
            # Calculate average participants
            average_participants = (
                sum(channel.participant_count for channel in channels) / len(channels)
                if channels else 0
            )
            
            # Get most popular channels by participant count
            most_popular_channels = sorted(
                channels, 
                key=lambda x: x.participant_count, 
                reverse=True
            )[:10]
            
            # Calculate total escrow value
            total_escrow_value = sum(channel.escrow_balance for channel in channels)
            
            # Calculate average channel fee
            average_channel_fee = (
                sum(channel.fee_per_message for channel in channels) / len(channels)
                if channels else 0
            )
            
            return ChannelAnalytics(
                total_channels=len(channels),
                channels_by_visibility=channels_by_visibility,
                average_participants=average_participants,
                most_popular_channels=most_popular_channels,
                total_escrow_value=total_escrow_value,
                average_channel_fee=average_channel_fee
            )
        except Exception as e:
            raise Exception(f"Failed to get channel analytics: {e}")

    async def get_network_analytics(self) -> NetworkAnalytics:
        """
        Get network-wide analytics.
        
        Returns:
            Network analytics data
        """
        try:
            # Get recent block performance for network health
            # This would typically query the RPC for performance data
            # For now, we'll use mock data
            average_tps = 1500  # Mock TPS
            
            # Determine network health based on TPS
            if average_tps < 1000:
                network_health = "congested"
            elif average_tps < 2000:
                network_health = "moderate"
            else:
                network_health = "healthy"
            
            # Get total value locked (from escrow accounts)
            escrow_accounts = await self._fetch_escrow_accounts()
            total_value_locked = sum(escrow.balance for escrow in escrow_accounts)
            
            # Historical metrics: query for last 24h
            since = int(time.time() * 1000) - (24 * 60 * 60 * 1000)
            
            # Get messages from last 24h for activity metrics
            recent_messages = await self._fetch_recent_messages(since)
            message_volume_24h = len(recent_messages)
            
            # Get unique senders for active agents
            active_agents_24h = len(set(str(msg.sender) for msg in recent_messages))
            
            # Compute peak usage hours
            hour_counts = [0] * 24
            for msg in recent_messages:
                from datetime import datetime
                hour = datetime.fromtimestamp(msg.created_at / 1000).hour
                hour_counts[hour] += 1
            
            peak_usage_hours = [
                hour for hour, count in enumerate(hour_counts) if count > 0
            ]
            
            return NetworkAnalytics(
                total_transactions=len(recent_messages),
                total_value_locked=total_value_locked,
                active_agents_24h=active_agents_24h,
                message_volume_24h=message_volume_24h,
                network_health=network_health,
                peak_usage_hours=peak_usage_hours
            )
        except Exception as e:
            raise Exception(f"Failed to get network analytics: {e}")

    async def generate_report(self) -> str:
        """
        Generate analytics report.
        
        Returns:
            Formatted analytics report
        """
        dashboard = await self.get_dashboard()
        
        report = "# PoD Protocol Analytics Report\n\n"
        report += f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(dashboard.generated_at / 1000))}\n\n"
        
        # Agent Analytics
        report += "## Agent Analytics\n"
        report += f"- Total Agents: {dashboard.agents.total_agents}\n"
        report += f"- Average Reputation: {dashboard.agents.average_reputation:.2f}\n"
        report += f"- Recently Active (24h): {len(dashboard.agents.recently_active)}\n"
        report += "\n### Capability Distribution\n"
        for cap, count in dashboard.agents.capability_distribution.items():
            report += f"- {cap}: {count} agents\n"
        
        # Message Analytics
        report += "\n## Message Analytics\n"
        report += f"- Total Messages: {dashboard.messages.total_messages}\n"
        report += f"- Average Message Size: {format_bytes(dashboard.messages.average_message_size)}\n"
        report += f"- Messages per Day: {dashboard.messages.messages_per_day:.1f}\n"
        report += "\n### Message Status Distribution\n"
        for status, count in dashboard.messages.messages_by_status.items():
            report += f"- {status}: {count} messages\n"
        
        # Channel Analytics
        report += "\n## Channel Analytics\n"
        report += f"- Total Channels: {dashboard.channels.total_channels}\n"
        report += f"- Average Participants: {dashboard.channels.average_participants:.1f}\n"
        report += f"- Total Value Locked: {lamports_to_sol(dashboard.channels.total_escrow_value):.4f} SOL\n"
        report += f"- Average Channel Fee: {lamports_to_sol(dashboard.channels.average_channel_fee):.6f} SOL\n"
        
        # Network Analytics
        report += "\n## Network Analytics\n"
        report += f"- Network Health: {dashboard.network.network_health.upper()}\n"
        report += f"- Total Value Locked: {lamports_to_sol(dashboard.network.total_value_locked):.4f} SOL\n"
        report += f"- Peak Usage Hours (UTC): {', '.join(map(str, dashboard.network.peak_usage_hours))}\n"
        
        return report

    # Helper Methods
    async def _fetch_agent_accounts(self, limit: int = 100) -> List[AgentAccount]:
        """Fetch agent accounts from the program."""
        try:
            program = self.ensure_initialized()
            accounts = await program.account.agent_account.all()
            
            result = []
            for acc in accounts[:limit]:
                agent = AgentAccount(
                    pubkey=acc.public_key,
                    capabilities=acc.account.capabilities,
                    metadata_uri=acc.account.metadata_uri,
                    reputation=acc.account.reputation or 0,
                    last_updated=acc.account.last_updated or int(time.time()),
                    invites_sent=acc.account.invites_sent or 0,
                    last_invite_at=acc.account.last_invite_at or 0,
                    bump=acc.account.bump
                )
                result.append(agent)
            
            return result
        except Exception:
            return []

    async def _fetch_message_accounts(self, limit: int = 1000) -> List[MessageAccount]:
        """Fetch message accounts from the program."""
        try:
            program = self.ensure_initialized()
            accounts = await program.account.message_account.all()
            
            result = []
            for acc in accounts[:limit]:
                message = MessageAccount(
                    pubkey=acc.public_key,
                    sender=acc.account.sender,
                    recipient=acc.account.recipient,
                    payload=acc.account.payload or "",
                    payload_hash=acc.account.payload_hash,
                    message_type=self._convert_message_type_from_program(acc.account.message_type),
                    status=self._convert_message_status_from_program(acc.account.status),
                    timestamp=acc.account.timestamp or int(time.time()),
                    created_at=acc.account.created_at or int(time.time()),
                    expires_at=acc.account.expires_at or 0,
                    bump=acc.account.bump
                )
                result.append(message)
            
            return result
        except Exception:
            return []

    async def _fetch_channel_accounts(self, limit: int = 100) -> List[ChannelAccount]:
        """Fetch channel accounts from the program."""
        try:
            program = self.ensure_initialized()
            accounts = await program.account.channel_account.all()
            
            result = []
            for acc in accounts[:limit]:
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
                    created_at=acc.account.created_at or int(time.time()),
                    is_active=True,
                    bump=acc.account.bump
                )
                result.append(channel)
            
            return result
        except Exception:
            return []

    async def _fetch_escrow_accounts(self) -> List[EscrowAccount]:
        """Fetch escrow accounts from the program."""
        try:
            program = self.ensure_initialized()
            accounts = await program.account.escrow_account.all()
            
            result = []
            for acc in accounts:
                escrow = EscrowAccount(
                    channel=acc.account.channel,
                    depositor=acc.account.depositor,
                    balance=acc.account.balance or 0,
                    amount=acc.account.balance or 0,
                    created_at=acc.account.created_at or int(time.time()),
                    last_updated=acc.account.last_updated or int(time.time()),
                    bump=acc.account.bump
                )
                result.append(escrow)
            
            return result
        except Exception:
            return []

    async def _fetch_recent_messages(self, since: int) -> List[MessageAccount]:
        """Fetch recent messages since timestamp."""
        try:
            all_messages = await self._fetch_message_accounts()
            return [
                msg for msg in all_messages 
                if msg.created_at * 1000 > since
            ]
        except Exception:
            return []

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
