"""Integration tests for Analytics and Discovery services."""

import pytest
from unittest.mock import Mock, patch
from solders.pubkey import Pubkey
from solders.keypair import Keypair

from pod_protocol.services.analytics import AnalyticsService
from pod_protocol.services.discovery import DiscoveryService


class TestAnalyticsDiscoveryIntegration:
    """Test Analytics and Discovery services integration."""

    def setup_method(self):
        """Setup test environment."""
        self.mock_connection = Mock()
        self.program_id = Pubkey.from_string("11111111111111111111111111111111")
        config = {
            "connection": self.mock_connection,
            "program_id": self.program_id,
            "commitment": "confirmed"
        }
        
        self.analytics_service = AnalyticsService(**config)
        self.discovery_service = DiscoveryService(**config, analytics_service=self.analytics_service)

    def test_calculate_network_health(self):
        """Test network health calculation."""
        mock_data = {
            "total_agents": 150,
            "active_agents": 120,
            "total_messages": 5000,
            "successful_messages": 4800,
            "total_channels": 75,
            "active_channels": 60
        }

        health = self.analytics_service.calculate_network_health(mock_data)
        
        assert "agent_activity_rate" in health
        assert "message_success_rate" in health
        assert "channel_utilization_rate" in health
        assert "overall_score" in health
        
        assert health["agent_activity_rate"] == pytest.approx(0.8, rel=1e-2)  # 120/150
        assert health["message_success_rate"] == pytest.approx(0.96, rel=1e-2)  # 4800/5000
        assert health["channel_utilization_rate"] == pytest.approx(0.8, rel=1e-2)  # 60/75
        assert 0 <= health["overall_score"] <= 100

    def test_calculate_agent_performance(self):
        """Test agent performance calculation."""
        agent_metrics = {
            "messages_sent": 100,
            "messages_received": 150,
            "successful_transactions": 95,
            "failed_transactions": 5,
            "average_response_time": 2500,
            "reputation": 85
        }

        performance = self.analytics_service.calculate_agent_performance(agent_metrics)
        
        assert "activity_score" in performance
        assert "reliability_score" in performance
        assert "responsiveness_score" in performance
        assert "overall_rating" in performance
        
        assert performance["reliability_score"] == pytest.approx(95.0, rel=1e-1)  # 95/100

    @pytest.mark.asyncio
    async def test_get_usage_stats(self):
        """Test usage statistics retrieval."""
        from datetime import datetime, timedelta
        
        time_range = {
            "start": datetime.now() - timedelta(days=30),
            "end": datetime.now()
        }

        with patch.object(self.analytics_service, 'get_usage_stats') as mock_get_stats:
            mock_stats = {
                "period": time_range,
                "message_volume": 10000,
                "active_users": 250,
                "transaction_count": 5000,
                "daily_breakdown": [
                    {"date": "2024-01-01", "messages": 100, "users": 50},
                    {"date": "2024-01-02", "messages": 120, "users": 55}
                ]
            }
            mock_get_stats.return_value = mock_stats
            
            result = await self.analytics_service.get_usage_stats(time_range)
            
            assert result["period"] == time_range
            assert isinstance(result["message_volume"], int)
            assert isinstance(result["active_users"], int)
            assert isinstance(result["daily_breakdown"], list)

    def test_analyze_trends(self):
        """Test trend analysis."""
        mock_messages = [
            {"content": "AI development is fascinating", "type": "text"},
            {"content": "Blockchain technology advancement", "type": "text"},
            {"content": "AI and blockchain integration", "type": "text"},
            {"content": "Machine learning algorithms", "type": "text"}
        ]

        trends = self.analytics_service.analyze_trends(mock_messages)
        
        assert isinstance(trends, list)
        assert len(trends) > 0
        
        for trend in trends:
            assert "keyword" in trend
            assert "frequency" in trend
            assert "sentiment" in trend
            assert trend["frequency"] > 0

    @pytest.mark.asyncio
    async def test_search_agents(self):
        """Test agent search functionality."""
        search_criteria = {
            "capabilities": ["text", "analysis"],
            "min_reputation": 50,
            "limit": 10
        }

        with patch.object(self.discovery_service, 'search_agents') as mock_search:
            mock_agents = [
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Agent 1",
                    "capabilities": ["text", "analysis"],
                    "reputation": 75
                },
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Agent 2", 
                    "capabilities": ["text", "analysis", "code"],
                    "reputation": 82
                }
            ]
            mock_search.return_value = mock_agents
            
            result = await self.discovery_service.search_agents(search_criteria)
            
            assert isinstance(result, list)
            assert len(result) <= search_criteria["limit"]
            
            for agent in result:
                assert agent["reputation"] >= search_criteria["min_reputation"]
                assert any(cap in agent["capabilities"] for cap in search_criteria["capabilities"])

    @pytest.mark.asyncio
    async def test_find_similar_agents(self):
        """Test finding similar agents."""
        reference_agent = Keypair().pubkey()
        
        with patch.object(self.discovery_service, 'find_similar_agents') as mock_find:
            mock_similar = [
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Similar Agent 1",
                    "similarity_score": 0.85
                },
                {
                    "pubkey": str(Keypair().pubkey()),
                    "name": "Similar Agent 2",
                    "similarity_score": 0.78
                }
            ]
            mock_find.return_value = mock_similar
            
            result = await self.discovery_service.find_similar_agents(
                reference_agent, 
                {"limit": 5}
            )
            
            assert isinstance(result, list)
            assert len(result) <= 5
            
            for agent in result:
                assert "similarity_score" in agent
                assert 0 <= agent["similarity_score"] <= 1

    @pytest.mark.asyncio
    async def test_get_collaboration_recommendations(self):
        """Test collaboration recommendations."""
        agent_id = Keypair().pubkey()
        
        with patch.object(self.discovery_service, 'get_collaboration_recommendations') as mock_get_recs:
            mock_recommendations = [
                {
                    "agent": {
                        "pubkey": str(Keypair().pubkey()),
                        "name": "Collaborator 1"
                    },
                    "compatibility_score": 0.92,
                    "reasons": ["Complementary capabilities", "High reputation"]
                },
                {
                    "agent": {
                        "pubkey": str(Keypair().pubkey()),
                        "name": "Collaborator 2"
                    },
                    "compatibility_score": 0.87,
                    "reasons": ["Similar activity patterns", "Shared interests"]
                }
            ]
            mock_get_recs.return_value = mock_recommendations
            
            result = await self.discovery_service.get_collaboration_recommendations(
                agent_id,
                {"max_recommendations": 3}
            )
            
            assert isinstance(result, list)
            assert len(result) <= 3
            
            for rec in result:
                assert "agent" in rec
                assert "compatibility_score" in rec
                assert "reasons" in rec
                assert isinstance(rec["reasons"], list)

    @pytest.mark.asyncio
    async def test_discover_channels(self):
        """Test channel discovery."""
        channel_criteria = {
            "topic": "AI development",
            "min_participants": 5,
            "max_participants": 100,
            "visibility": "public"
        }

        with patch.object(self.discovery_service, 'discover_channels') as mock_discover:
            mock_channels = [
                {
                    "id": "channel_1",
                    "name": "AI Developers",
                    "participant_count": 25,
                    "visibility": "public",
                    "topic": "AI development"
                },
                {
                    "id": "channel_2",
                    "name": "ML Research",
                    "participant_count": 15,
                    "visibility": "public",
                    "topic": "AI development"
                }
            ]
            mock_discover.return_value = mock_channels
            
            result = await self.discovery_service.discover_channels(channel_criteria)
            
            assert isinstance(result, list)
            
            for channel in result:
                assert channel["participant_count"] >= channel_criteria["min_participants"]
                assert channel["participant_count"] <= channel_criteria["max_participants"]
                assert channel["visibility"] == channel_criteria["visibility"]

    def test_calculate_compatibility(self):
        """Test agent compatibility calculation."""
        agent1 = {
            "capabilities": ["text", "analysis", "code"],
            "reputation": 85,
            "activity_level": "high",
            "preferences": {"collaboration": True, "privacy": "medium"}
        }

        agent2 = {
            "capabilities": ["text", "image", "analysis"],
            "reputation": 78,
            "activity_level": "medium",
            "preferences": {"collaboration": True, "privacy": "high"}
        }

        compatibility = self.discovery_service.calculate_compatibility(agent1, agent2)
        
        assert "capability_overlap" in compatibility
        assert "reputation_match" in compatibility
        assert "activity_alignment" in compatibility
        assert "overall_score" in compatibility
        
        assert 0 <= compatibility["overall_score"] <= 1

    @pytest.mark.asyncio
    async def test_analytics_enhanced_discovery(self):
        """Test analytics-enhanced discovery."""
        agent_id = Keypair().pubkey()
        
        analytics_data = {
            "popular_capabilities": ["text", "analysis"],
            "trending_topics": ["AI", "blockchain"],
            "network_activity": {"peak": "evening", "timezone": "UTC"}
        }

        with patch.object(self.discovery_service, 'get_analytics_enhanced_recommendations') as mock_get_enhanced:
            mock_enhanced = [
                {
                    "agent": {"pubkey": str(Keypair().pubkey()), "name": "Enhanced Agent 1"},
                    "analytics_boost": 0.15,
                    "trend_alignment": 0.85,
                    "network_fit": 0.92
                }
            ]
            mock_get_enhanced.return_value = mock_enhanced
            
            result = await self.discovery_service.get_analytics_enhanced_recommendations(
                agent_id,
                analytics_data
            )
            
            assert isinstance(result, list)
            
            for rec in result:
                assert "analytics_boost" in rec
                assert "trend_alignment" in rec
                assert "network_fit" in rec

    def test_generate_network_insights(self):
        """Test network insights generation."""
        network_data = {
            "agent_distribution": {"text": 45, "image": 30, "code": 25},
            "message_patterns": {"peak": "afternoon", "volume": "high"},
            "channel_activity": {"public": 70, "private": 30}
        }

        insights = self.analytics_service.generate_network_insights(network_data)
        
        assert "recommendations" in insights
        assert "opportunities" in insights
        assert "market_gaps" in insights
        assert isinstance(insights["recommendations"], list)

    def test_calculate_discovery_effectiveness(self):
        """Test discovery effectiveness calculation."""
        discovery_metrics = {
            "searches_performed": 1000,
            "successful_connections": 250,
            "average_recommendation_score": 0.75,
            "user_satisfaction_rate": 0.82
        }

        effectiveness = self.analytics_service.calculate_discovery_effectiveness(discovery_metrics)
        
        assert "conversion_rate" in effectiveness
        assert "recommendation_quality" in effectiveness
        assert "user_satisfaction" in effectiveness
        assert "overall_effectiveness" in effectiveness
        
        assert effectiveness["conversion_rate"] == pytest.approx(0.25, rel=1e-2)  # 250/1000
        assert effectiveness["recommendation_quality"] == discovery_metrics["average_recommendation_score"]

    @pytest.mark.asyncio
    async def test_real_time_analytics_integration(self):
        """Test real-time analytics integration with discovery."""
        # Simulate real-time analytics updates
        with patch.object(self.analytics_service, 'get_real_time_metrics') as mock_real_time:
            mock_real_time.return_value = {
                "active_agents": 150,
                "current_load": 0.65,
                "trending_capabilities": ["text", "analysis"],
                "network_congestion": 0.25
            }
            
            real_time_data = await self.analytics_service.get_real_time_metrics()
            
            # Use real-time data to adjust discovery parameters
            adjusted_criteria = self.discovery_service.adjust_search_criteria_for_load(
                {"capabilities": ["text"], "limit": 10},
                real_time_data
            )
            
            assert "adjusted_limit" in adjusted_criteria
            assert "load_factor" in adjusted_criteria
            assert adjusted_criteria["load_factor"] == real_time_data["current_load"]

    def test_performance_metrics_tracking(self):
        """Test performance metrics tracking."""
        # Track various performance metrics
        metrics = {
            "search_latency": 125,  # ms
            "recommendation_accuracy": 0.87,
            "cache_hit_rate": 0.92,
            "api_response_time": 250  # ms
        }
        
        performance_report = self.analytics_service.generate_performance_report(metrics)
        
        assert "search_performance" in performance_report
        assert "recommendation_performance" in performance_report
        assert "system_performance" in performance_report
        assert "overall_health" in performance_report
        
        assert performance_report["overall_health"] in ["excellent", "good", "needs_improvement"]
