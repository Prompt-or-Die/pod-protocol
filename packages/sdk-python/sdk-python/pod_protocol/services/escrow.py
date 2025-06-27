"""
Escrow service for managing channel deposits and payments in the PoD Protocol.
"""

import time
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from .base import BaseService
from ..types import PublicKey, Keypair
from ..utils import find_agent_pda, find_escrow_pda


@dataclass
class DepositEscrowOptions:
    """Options for depositing funds to escrow."""
    channel: PublicKey
    amount: int


@dataclass
class WithdrawEscrowOptions:
    """Options for withdrawing funds from escrow."""
    channel: PublicKey
    amount: int


@dataclass
class EscrowAccount:
    """Escrow account data structure."""
    channel: PublicKey
    depositor: PublicKey
    balance: int
    amount: int  # alias for compatibility
    created_at: int
    last_updated: int
    bump: int


class EscrowService(BaseService):
    """Service for managing channel deposits and payments."""

    async def deposit_escrow(
        self, 
        wallet: Keypair, 
        options: DepositEscrowOptions
    ) -> str:
        """
        Deposit funds to escrow for a channel.
        
        Args:
            wallet: The wallet keypair for signing
            options: Deposit options
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive escrow PDA
        escrow_pda, _ = find_escrow_pda(
            options.channel, 
            wallet.public_key, 
            self.program_id
        )
        
        tx = await program.methods.deposit_escrow(options.amount).accounts({
            "escrow_account": escrow_pda,
            "channel_account": options.channel,
            "depositor_agent": agent_pda,
            "depositor": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts={"commitment": self.commitment})
        
        return tx

    async def withdraw_escrow(
        self, 
        wallet: Keypair, 
        options: WithdrawEscrowOptions
    ) -> str:
        """
        Withdraw funds from escrow.
        
        Args:
            wallet: The wallet keypair for signing
            options: Withdraw options
            
        Returns:
            Transaction signature
        """
        program = self.ensure_initialized()
        
        # Derive agent PDA
        agent_pda, _ = find_agent_pda(wallet.public_key, self.program_id)
        
        # Derive escrow PDA
        escrow_pda, _ = find_escrow_pda(
            options.channel, 
            wallet.public_key, 
            self.program_id
        )
        
        tx = await program.methods.withdraw_escrow(options.amount).accounts({
            "escrow_account": escrow_pda,
            "channel_account": options.channel,
            "depositor_agent": agent_pda,
            "depositor": wallet.public_key,
            "system_program": PublicKey("11111111111111111111111111111112"),
        }).signers([wallet]).rpc(opts={"commitment": self.commitment})
        
        return tx

    async def get_escrow(
        self, 
        channel: PublicKey, 
        depositor: PublicKey
    ) -> Optional[EscrowAccount]:
        """
        Get escrow account data.
        
        Args:
            channel: Channel public key
            depositor: Depositor public key
            
        Returns:
            Escrow account data or None if not found
        """
        try:
            escrow_pda, _ = find_escrow_pda(channel, depositor, self.program_id)
            program = self.ensure_initialized()
            account = await program.account.escrow_account.fetch(escrow_pda)
            return self._convert_escrow_account_from_program(account)
        except Exception as e:
            print(f"Escrow not found for channel: {channel}, depositor: {depositor}, error: {e}")
            return None

    async def get_escrows_by_depositor(
        self, 
        depositor: PublicKey, 
        limit: int = 50
    ) -> List[EscrowAccount]:
        """
        Get all escrow accounts by depositor.
        
        Args:
            depositor: Depositor public key
            limit: Maximum number of escrows to return
            
        Returns:
            List of escrow accounts
        """
        try:
            program = self.ensure_initialized()
            filters = [
                {
                    "memcmp": {
                        "offset": 8 + 32,  # After discriminator and channel pubkey
                        "bytes": str(depositor)
                    }
                }
            ]
            
            accounts = await program.account.escrow_account.all(filters=filters)
            
            result = []
            for acc in accounts[:limit]:
                escrow_account = self._convert_escrow_account_from_program(acc.account)
                result.append(escrow_account)
            
            return result
        except Exception as e:
            print(f"Error fetching escrows by depositor: {e}")
            return []

    # Helper Methods
    def _convert_escrow_account_from_program(self, account: Any) -> EscrowAccount:
        """Convert escrow account from program format."""
        balance = account.balance or 0
        return EscrowAccount(
            channel=account.channel,
            depositor=account.depositor,
            balance=balance,
            amount=balance,  # alias for compatibility
            created_at=account.created_at or int(time.time() * 1000),
            last_updated=account.last_updated or int(time.time() * 1000),
            bump=account.bump
        )
