"""
Jito Bundles Service for PoD Protocol Python SDK

Provides MEV protection and bundle transaction capabilities
with comprehensive Jito integration for optimal transaction execution.
"""

import asyncio
import json
import time
from typing import Optional, List, Dict, Any, Union, Tuple
from dataclasses import dataclass, field
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.instruction import Instruction
from solders.compute_budget import set_compute_unit_limit, set_compute_unit_price
import httpx

from .base import BaseService
from ..exceptions import PodProtocolError, NetworkError
from ..utils import SecureMemoryManager


@dataclass
class BundleTransaction:
    """Bundle transaction configuration"""
    transaction: Transaction
    signers: Optional[List[Keypair]] = None
    description: str = ""
    priority_fee: Optional[int] = None


@dataclass
class BundleResult:
    """Bundle execution result"""
    bundle_id: str
    transactions: List[str]
    status: str
    timestamp: int
    block_height: Optional[int] = None
    confirmation_time: Optional[float] = None


@dataclass
class JitoConfig:
    """Jito configuration"""
    block_engine_url: str = "https://mainnet.block-engine.jito.wtf"
    relayer_url: str = "https://mainnet.block-engine.jito.wtf"
    tip_account: str = "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
    max_bundle_size: int = 5
    bundle_timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0


class JitoBundlesService(BaseService):
    """
    Service for Jito bundle transactions and MEV protection
    
    Provides comprehensive bundle transaction capabilities for optimal
    execution and MEV protection in high-frequency trading scenarios.
    """
    
    def __init__(self, config: dict, jito_rpc_url: Optional[str] = None):
        super().__init__(config)
        self.jito_config = JitoConfig()
        self.jito_rpc_url = jito_rpc_url or self.jito_config.block_engine_url
        self.wallet: Optional[Union[Keypair, Any]] = None
        self.secure_memory = SecureMemoryManager()
        
        # Bundle management
        self.pending_bundles: Dict[str, BundleResult] = {}
        self.bundle_history: List[BundleResult] = []
        
        # Performance tracking
        self.bundle_stats = {
            'total_bundles': 0,
            'successful_bundles': 0,
            'failed_bundles': 0,
            'average_confirmation_time': 0.0,
            'last_updated': int(time.time())
        }
        
        # HTTP client for Jito API
        self.http_client: Optional[httpx.AsyncClient] = None
    
    def set_wallet(self, wallet: Union[Keypair, Any]) -> None:
        """Set the wallet for bundle operations"""
        self.wallet = wallet
    
    async def initialize_jito_client(self) -> None:
        """Initialize Jito HTTP client"""
        if not self.http_client:
            self.http_client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'PoD-Protocol-Python-SDK/1.0'
                }
            )
    
    async def send_bundle(
        self,
        transactions: List[BundleTransaction],
        tip_lamports: int = 10000,
        max_retries: int = 3
    ) -> BundleResult:
        """
        Send a bundle of transactions through Jito
        
        Args:
            transactions: List of bundle transactions
            tip_lamports: Tip amount in lamports
            max_retries: Maximum retry attempts
            
        Returns:
            Bundle execution result
            
        Raises:
            PodProtocolError: If bundle execution fails
        """
        try:
            if not self.wallet:
                raise PodProtocolError("No wallet configured for bundle operations")
            
            if len(transactions) > self.jito_config.max_bundle_size:
                raise PodProtocolError(
                    f"Bundle size {len(transactions)} exceeds maximum {self.jito_config.max_bundle_size}"
                )
            
            await self.initialize_jito_client()
            
            # Prepare transactions with compute budget and tip
            prepared_txs = await self._prepare_bundle_transactions(
                transactions, tip_lamports
            )
            
            # Submit bundle to Jito
            bundle_id = await self._submit_bundle_to_jito(prepared_txs)
            
            # Track bundle result
            bundle_result = BundleResult(
                bundle_id=bundle_id,
                transactions=[],  # Will be populated after signing
                status='pending',
                timestamp=int(time.time())
            )
            
            self.pending_bundles[bundle_id] = bundle_result
            
            # Wait for confirmation with retries
            confirmed_result = await self._wait_for_bundle_confirmation(
                bundle_id, max_retries
            )
            
            # Update statistics
            self._update_bundle_stats(confirmed_result)
            
            return confirmed_result
            
        except Exception as e:
            self.bundle_stats['failed_bundles'] += 1
            raise PodProtocolError(f"Failed to send bundle: {e}")
    
    async def send_message_bundle(
        self,
        message_instructions: List[Instruction],
        tip_lamports: int = 10000
    ) -> BundleResult:
        """
        Send message instructions as an optimized bundle
        
        Args:
            message_instructions: Message instructions to bundle
            tip_lamports: Tip amount in lamports
            
        Returns:
            Bundle execution result
        """
        try:
            # Group instructions into optimal transactions
            grouped_txs = await self._group_instructions_optimally(message_instructions)
            
            # Convert to bundle transactions
            bundle_transactions = []
            for tx_instructions in grouped_txs:
                transaction = Transaction(tx_instructions)
                bundle_transactions.append(BundleTransaction(
                    transaction=transaction,
                    description=f"Message bundle with {len(tx_instructions)} instructions"
                ))
            
            return await self.send_bundle(bundle_transactions, tip_lamports)
            
        except Exception as e:
            raise PodProtocolError(f"Failed to send message bundle: {e}")
    
    async def send_channel_bundle(
        self,
        channel_instructions: List[Instruction],
        tip_lamports: int = 15000
    ) -> BundleResult:
        """
        Send channel instructions as an optimized bundle
        
        Args:
            channel_instructions: Channel instructions to bundle
            tip_lamports: Tip amount in lamports
            
        Returns:
            Bundle execution result
        """
        try:
            # Add priority for channel operations
            priority_instructions = [
                set_compute_unit_limit(200_000),
                set_compute_unit_price(1000),  # Higher priority
                *channel_instructions
            ]
            
            transaction = Transaction(priority_instructions)
            bundle_transaction = BundleTransaction(
                transaction=transaction,
                description=f"Channel bundle with {len(channel_instructions)} instructions",
                priority_fee=1000
            )
            
            return await self.send_bundle([bundle_transaction], tip_lamports)
            
        except Exception as e:
            raise PodProtocolError(f"Failed to send channel bundle: {e}")
    
    async def get_bundle_status(self, bundle_id: str) -> Dict[str, Any]:
        """
        Get bundle execution status
        
        Args:
            bundle_id: Bundle identifier
            
        Returns:
            Bundle status information
        """
        try:
            await self.initialize_jito_client()
            
            # Check local cache first
            if bundle_id in self.pending_bundles:
                local_result = self.pending_bundles[bundle_id]
                
                # Query Jito API for latest status
                api_status = await self._query_bundle_status_from_jito(bundle_id)
                
                # Merge results
                return {
                    'bundle_id': bundle_id,
                    'status': api_status.get('status', local_result.status),
                    'transactions': local_result.transactions,
                    'timestamp': local_result.timestamp,
                    'confirmation_time': local_result.confirmation_time,
                    'block_height': api_status.get('block_height'),
                    'api_response': api_status
                }
            
            # Query from API only
            return await self._query_bundle_status_from_jito(bundle_id)
            
        except Exception as e:
            raise PodProtocolError(f"Failed to get bundle status: {e}")
    
    async def get_bundle_statistics(self) -> Dict[str, Any]:
        """
        Get bundle execution statistics
        
        Returns:
            Dictionary containing bundle statistics
        """
        # Update average confirmation time
        if self.bundle_history:
            confirmation_times = [
                result.confirmation_time for result in self.bundle_history
                if result.confirmation_time is not None
            ]
            if confirmation_times:
                self.bundle_stats['average_confirmation_time'] = (
                    sum(confirmation_times) / len(confirmation_times)
                )
        
        self.bundle_stats['last_updated'] = int(time.time())
        
        return {
            **self.bundle_stats,
            'success_rate': (
                self.bundle_stats['successful_bundles'] / 
                max(self.bundle_stats['total_bundles'], 1)
            ),
            'pending_bundles': len(self.pending_bundles),
            'recent_bundles': len([
                b for b in self.bundle_history 
                if time.time() - b.timestamp < 3600  # Last hour
            ])
        }
    
    async def estimate_bundle_fee(
        self,
        transaction_count: int,
        priority_level: str = "medium"
    ) -> Dict[str, int]:
        """
        Estimate bundle execution fees
        
        Args:
            transaction_count: Number of transactions in bundle
            priority_level: Priority level ("low", "medium", "high")
            
        Returns:
            Fee estimation breakdown
        """
        try:
            # Base fees
            base_fee_per_tx = 5000  # Base fee per transaction
            priority_multipliers = {
                "low": 1.0,
                "medium": 2.0,
                "high": 5.0
            }
            
            multiplier = priority_multipliers.get(priority_level, 2.0)
            
            # Get recent prioritization fees
            recent_fees = await self._get_recent_prioritization_fees()
            
            # Calculate estimates
            base_total = base_fee_per_tx * transaction_count
            priority_fee = int(recent_fees.get('average_fee', 1000) * multiplier)
            tip_amount = max(10000, priority_fee * 2)
            
            return {
                'base_fee': base_total,
                'priority_fee': priority_fee,
                'recommended_tip': tip_amount,
                'total_estimated': base_total + priority_fee + tip_amount,
                'priority_level': priority_level,
                'transaction_count': transaction_count
            }
            
        except Exception as e:
            # Return fallback estimates
            return {
                'base_fee': 5000 * transaction_count,
                'priority_fee': 2000,
                'recommended_tip': 15000,
                'total_estimated': 22000 * transaction_count,
                'priority_level': priority_level,
                'transaction_count': transaction_count,
                'error': str(e)
            }
    
    async def _prepare_bundle_transactions(
        self,
        transactions: List[BundleTransaction],
        tip_lamports: int
    ) -> List[Transaction]:
        """Prepare transactions for bundle submission"""
        prepared_txs = []
        
        # Get recent blockhash
        latest_blockhash = await self.connection.get_latest_blockhash()
        blockhash = latest_blockhash.value.blockhash
        
        for i, bundle_tx in enumerate(transactions):
            tx = bundle_tx.transaction
            
            # Set blockhash and fee payer
            tx.recent_blockhash = blockhash
            tx.fee_payer = self.wallet.pubkey()
            
            # Add compute budget instructions for optimization
            compute_instructions = [
                set_compute_unit_limit(200_000),
                set_compute_unit_price(bundle_tx.priority_fee or 1000)
            ]
            
            # Add tip instruction for the last transaction
            if i == len(transactions) - 1:
                tip_instruction = await self._create_tip_instruction(tip_lamports)
                compute_instructions.append(tip_instruction)
            
            # Prepend compute instructions
            tx.instructions = compute_instructions + tx.instructions
            
            # Sign transaction
            if bundle_tx.signers:
                for signer in bundle_tx.signers:
                    tx.sign([signer])
            
            if hasattr(self.wallet, 'sign_transaction'):
                tx = await self.wallet.sign_transaction(tx)
            else:
                tx.sign([self.wallet])
            
            prepared_txs.append(tx)
        
        return prepared_txs
    
    async def _submit_bundle_to_jito(self, transactions: List[Transaction]) -> str:
        """Submit bundle to Jito block engine"""
        if not self.http_client:
            raise PodProtocolError("HTTP client not initialized")
        
        # Serialize transactions
        serialized_txs = [tx.serialize().hex() for tx in transactions]
        
        # Prepare bundle submission
        bundle_data = {
            "jsonrpc": "2.0",
            "id": int(time.time()),
            "method": "sendBundle",
            "params": [serialized_txs]
        }
        
        # Submit to Jito
        response = await self.http_client.post(
            f"{self.jito_rpc_url}/api/v1/bundles",
            json=bundle_data
        )
        
        if response.status_code != 200:
            raise NetworkError(f"Jito API error: {response.status_code}")
        
        result = response.json()
        
        if 'error' in result:
            raise PodProtocolError(f"Jito bundle error: {result['error']}")
        
        return result.get('result', f"bundle_{int(time.time())}")
    
    async def _wait_for_bundle_confirmation(
        self,
        bundle_id: str,
        max_retries: int
    ) -> BundleResult:
        """Wait for bundle confirmation with retries"""
        start_time = time.time()
        
        for attempt in range(max_retries):
            try:
                await asyncio.sleep(self.jito_config.retry_delay * (attempt + 1))
                
                status = await self._query_bundle_status_from_jito(bundle_id)
                
                if status.get('status') == 'confirmed':
                    bundle_result = self.pending_bundles[bundle_id]
                    bundle_result.status = 'confirmed'
                    bundle_result.confirmation_time = time.time() - start_time
                    bundle_result.block_height = status.get('block_height')
                    
                    # Move to history
                    self.bundle_history.append(bundle_result)
                    del self.pending_bundles[bundle_id]
                    
                    return bundle_result
                
                elif status.get('status') == 'failed':
                    bundle_result = self.pending_bundles[bundle_id]
                    bundle_result.status = 'failed'
                    
                    del self.pending_bundles[bundle_id]
                    raise PodProtocolError(f"Bundle execution failed: {status}")
                
            except Exception as e:
                if attempt == max_retries - 1:
                    # Final attempt failed
                    if bundle_id in self.pending_bundles:
                        self.pending_bundles[bundle_id].status = 'failed'
                    raise PodProtocolError(f"Bundle confirmation timeout: {e}")
        
        # Timeout
        if bundle_id in self.pending_bundles:
            self.pending_bundles[bundle_id].status = 'timeout'
        
        raise PodProtocolError("Bundle confirmation timeout")
    
    async def _query_bundle_status_from_jito(self, bundle_id: str) -> Dict[str, Any]:
        """Query bundle status from Jito API"""
        if not self.http_client:
            raise PodProtocolError("HTTP client not initialized")
        
        query_data = {
            "jsonrpc": "2.0",
            "id": int(time.time()),
            "method": "getBundleStatuses",
            "params": [[bundle_id]]
        }
        
        response = await self.http_client.post(
            f"{self.jito_rpc_url}/api/v1/bundles",
            json=query_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'result' in result and result['result']:
                return result['result'][0]
        
        return {'status': 'pending'}
    
    async def _group_instructions_optimally(
        self,
        instructions: List[Instruction]
    ) -> List[List[Instruction]]:
        """Group instructions optimally for bundle execution"""
        # Simple grouping strategy - can be enhanced
        max_instructions_per_tx = 3
        groups = []
        
        for i in range(0, len(instructions), max_instructions_per_tx):
            group = instructions[i:i + max_instructions_per_tx]
            groups.append(group)
        
        return groups
    
    async def _create_tip_instruction(self, tip_lamports: int) -> Instruction:
        """Create tip instruction for Jito"""
        # This would create a proper tip instruction
        # For now, using a placeholder
        from solders.system_program import transfer, TransferParams
        
        tip_account = Pubkey.from_string(self.jito_config.tip_account)
        
        return transfer(
            TransferParams(
                from_pubkey=self.wallet.pubkey(),
                to_pubkey=tip_account,
                lamports=tip_lamports
            )
        )
    
    async def _get_recent_prioritization_fees(self) -> Dict[str, Any]:
        """Get recent prioritization fees from network"""
        try:
            if self.connection:
                fees = await self.connection.get_recent_prioritization_fees()
                if fees and fees.value:
                    avg_fee = sum(f.prioritization_fee for f in fees.value) / len(fees.value)
                    return {
                        'average_fee': avg_fee,
                        'sample_size': len(fees.value),
                        'max_fee': max(f.prioritization_fee for f in fees.value),
                        'min_fee': min(f.prioritization_fee for f in fees.value)
                    }
        except Exception:
            pass
        
        return {'average_fee': 1000}  # Fallback
    
    def _update_bundle_stats(self, bundle_result: BundleResult) -> None:
        """Update bundle statistics"""
        self.bundle_stats['total_bundles'] += 1
        
        if bundle_result.status == 'confirmed':
            self.bundle_stats['successful_bundles'] += 1
        else:
            self.bundle_stats['failed_bundles'] += 1
    
    async def cleanup(self) -> None:
        """Cleanup service resources"""
        if self.http_client:
            await self.http_client.aclose()
        
        # Clear caches
        self.pending_bundles.clear()
        self.bundle_history.clear()
        
        # Cleanup secure memory
        if self.secure_memory:
            self.secure_memory.cleanup()
        
        await super().cleanup() 