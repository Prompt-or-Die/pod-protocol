"""
Agent service for PoD Protocol Python SDK
"""

from typing import Optional, List, Dict, Any, Union
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from anchorpy import Program, Context
from .base import BaseService
from ..types import AgentAccount, CreateAgentOptions, UpdateAgentOptions, AGENT_CAPABILITIES
from ..exceptions import AgentNotFoundError, PodProtocolError
import time

class AgentService(BaseService):
    """
    Service for managing AI agents in the PoD Protocol
    """
    async def register(self, options: CreateAgentOptions, wallet: Keypair) -> str:
        """
        Register a new agent
        Args:
            options: Agent creation options
            wallet: Wallet to sign the transaction
        Returns:
            Transaction signature
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        agent_pda, _ = self.find_agent_pda(wallet.pubkey())
        try:
            tx = await self.program.rpc["register_agent"](
                options.capabilities,
                options.metadata_uri,
                ctx=Context(
                    accounts={
                        "agent_account": agent_pda,
                        "signer": wallet.pubkey(),
                        "system_program": Pubkey.default(),
                    },
                    signers=[wallet],
                ),
            )
            return tx
        except Exception as e:
            if "Account does not exist" in str(e):
                raise PodProtocolError("Program account not found. Verify the program is deployed and the program ID is correct.")
            if "insufficient funds" in str(e):
                raise PodProtocolError("Insufficient SOL balance. Please add funds to your wallet and try again.")
            raise

    async def update(self, options: UpdateAgentOptions, wallet: Keypair) -> str:
        """
        Update an existing agent
        Args:
            options: Update options
            wallet: Wallet to sign the transaction
        Returns:
            Transaction signature
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        agent_pda, _ = self.find_agent_pda(wallet.pubkey())
        tx = await self.program.rpc["update_agent"](
            options.capabilities if options.capabilities is not None else 0,
            options.metadata_uri if options.metadata_uri is not None else "",
            ctx=Context(
                accounts={
                    "agent_account": agent_pda,
                    "signer": wallet.pubkey(),
                },
                signers=[wallet],
            ),
        )
        return tx

    async def get(self, agent_pubkey: Pubkey) -> Optional[AgentAccount]:
        """
        Get agent information by public key
        Args:
            agent_pubkey: Agent's public key
        Returns:
            Agent account data or None if not found
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        agent_pda, _ = self.find_agent_pda(agent_pubkey)
        try:
            account = await self.program.account["agent_account"].fetch(agent_pda)
            return AgentAccount(
                pubkey=agent_pda,
                capabilities=account.capabilities,
                metadata_uri=account.metadata_uri,
                reputation=account.reputation,
                last_updated=account.last_updated,
                invites_sent=account.invites_sent,
                last_invite_at=account.last_invite_at,
                bump=account.bump,
            )
        except Exception as e:
            if "Account does not exist" in str(e):
                return None
            raise

    async def list(self, filters: Optional[Dict[str, Any]] = None) -> List[AgentAccount]:
        """
        List all agents with optional filtering
        Args:
            filters: Optional filters (capabilities, min_reputation, limit)
        Returns:
            List of agent accounts
        """
        if not self.is_initialized():
            raise PodProtocolError("Service not initialized. Call client.initialize() first.")
        accounts = await self.program.account["agent_account"].all()
        agents = [
            AgentAccount(
                pubkey=acc.public_key,
                capabilities=acc.account.capabilities,
                metadata_uri=acc.account.metadata_uri,
                reputation=acc.account.reputation,
                last_updated=acc.account.last_updated,
                invites_sent=acc.account.invites_sent,
                last_invite_at=acc.account.last_invite_at,
                bump=acc.account.bump,
            )
            for acc in accounts
        ]
        if filters:
            if "capabilities" in filters:
                agents = [a for a in agents if (a.capabilities & filters["capabilities"]) == filters["capabilities"]]
            if "min_reputation" in filters:
                agents = [a for a in agents if a.reputation >= filters["min_reputation"]]
            if "limit" in filters:
                agents = agents[:filters["limit"]]
        return agents

    async def exists(self, agent_pubkey: Pubkey) -> bool:
        """
        Check if an agent exists
        Args:
            agent_pubkey: Agent's public key
        Returns:
            True if agent exists
        """
        return (await self.get(agent_pubkey)) is not None

    async def get_stats(self, agent_pubkey: Pubkey) -> Dict[str, Any]:
        """
        Get agent statistics
        Args:
            agent_pubkey: Agent's public key
        Returns:
            Agent statistics
        """
        agent = await self.get(agent_pubkey)
        if not agent:
            raise AgentNotFoundError("Agent not found")
        
        # Calculate account age from creation timestamp
        current_time = int(time.time())
        account_age = current_time - agent.last_updated if agent.last_updated else 0
        
        return {
            "reputation": agent.reputation,
            "invites_sent": agent.invites_sent,
            "last_active": agent.last_updated,
            "account_age": account_age,
        }
