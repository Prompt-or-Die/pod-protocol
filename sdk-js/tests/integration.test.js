import { describe, it, expect, beforeEach } from '@jest/globals';
import { AnalyticsService } from '../src/services/analytics.js';
import { DiscoveryService } from '../src/services/discovery.js';
import { Connection, PublicKey } from '@solana/web3.js';

describe('Analytics and Discovery Integration Tests', () => {
  let analyticsService;
  let discoveryService;
  let connection;
  let programId;

  beforeEach(() => {
    connection = new Connection('http://localhost:8899');
    programId = '11111111111111111111111111111111';
    const config = { connection, programId, commitment: 'confirmed' };
    
    analyticsService = new AnalyticsService(config);
    discoveryService = new DiscoveryService(config);
  });

  describe('Analytics Service', () => {
    it('should calculate network health metrics', async () => {
      const mockData = {
        totalAgents: 150,
        activeAgents: 120,
        totalMessages: 5000,
        successfulMessages: 4800,
        totalChannels: 75,
        activeChannels: 60
      };

      const health = analyticsService.calculateNetworkHealth(mockData);
      
      expect(health.agentActivityRate).toBeCloseTo(0.8, 2); // 120/150
      expect(health.messageSuccessRate).toBeCloseTo(0.96, 2); // 4800/5000
      expect(health.channelUtilizationRate).toBeCloseTo(0.8, 2); // 60/75
      expect(health.overallScore).toBeDefined();
      expect(health.overallScore).toBeGreaterThan(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
    });

    it('should track agent performance metrics', () => {
      const agentMetrics = {
        messagesSent: 100,
        messagesReceived: 150,
        successfulTransactions: 95,
        failedTransactions: 5,
        averageResponseTime: 2500,
        reputation: 85
      };

      const performance = analyticsService.calculateAgentPerformance(agentMetrics);
      
      expect(performance.activityScore).toBeDefined();
      expect(performance.reliabilityScore).toBeCloseTo(95, 0); // 95/100
      expect(performance.responsivenessScore).toBeDefined();
      expect(performance.overallRating).toBeDefined();
    });

    it('should generate usage statistics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const stats = await analyticsService.mockGetUsageStats(timeRange);
      
      expect(stats).toBeDefined();
      expect(stats.period).toEqual(timeRange);
      expect(typeof stats.messageVolume).toBe('number');
      expect(typeof stats.activeUsers).toBe('number');
      expect(typeof stats.transactionCount).toBe('number');
      expect(Array.isArray(stats.dailyBreakdown)).toBe(true);
    });

    it('should identify trending topics', async () => {
      const mockMessages = [
        { content: 'AI development is fascinating', type: 'text' },
        { content: 'Blockchain technology advancement', type: 'text' },
        { content: 'AI and blockchain integration', type: 'text' },
        { content: 'Machine learning algorithms', type: 'text' }
      ];

      const trends = analyticsService.analyzeTrends(mockMessages);
      
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      
      trends.forEach(trend => {
        expect(trend.keyword).toBeDefined();
        expect(trend.frequency).toBeGreaterThan(0);
        expect(trend.sentiment).toBeDefined();
      });
    });
  });

  describe('Discovery Service', () => {
    it('should search agents by capabilities', async () => {
      const searchCriteria = {
        capabilities: ['text', 'analysis'],
        minReputation: 50,
        limit: 10
      };

      const agents = await discoveryService.mockSearchAgents(searchCriteria);
      
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeLessThanOrEqual(searchCriteria.limit);
      
      agents.forEach(agent => {
        expect(agent.reputation).toBeGreaterThanOrEqual(searchCriteria.minReputation);
        expect(agent.capabilities.some(cap => 
          searchCriteria.capabilities.includes(cap)
        )).toBe(true);
      });
    });

    it('should find similar agents', async () => {
      const referenceAgent = new PublicKey('11111111111111111111111111111111');
      const similarAgents = await discoveryService.mockFindSimilarAgents(
        referenceAgent,
        { limit: 5 }
      );

      expect(Array.isArray(similarAgents)).toBe(true);
      expect(similarAgents.length).toBeLessThanOrEqual(5);
      
      similarAgents.forEach(agent => {
        expect(agent.similarityScore).toBeDefined();
        expect(agent.similarityScore).toBeGreaterThan(0);
        expect(agent.similarityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should recommend collaboration partners', async () => {
      const agentId = new PublicKey('11111111111111111111111111111111');
      const recommendations = await discoveryService.mockGetCollaborationRecommendations(
        agentId,
        { maxRecommendations: 3 }
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(3);
      
      recommendations.forEach(rec => {
        expect(rec.agent).toBeDefined();
        expect(rec.compatibilityScore).toBeDefined();
        expect(rec.reasons).toBeDefined();
        expect(Array.isArray(rec.reasons)).toBe(true);
      });
    });

    it('should discover active channels', async () => {
      const channelCriteria = {
        topic: 'AI development',
        minParticipants: 5,
        maxParticipants: 100,
        visibility: 'public'
      };

      const channels = await discoveryService.mockDiscoverChannels(channelCriteria);
      
      expect(Array.isArray(channels)).toBe(true);
      
      channels.forEach(channel => {
        expect(channel.participantCount).toBeGreaterThanOrEqual(channelCriteria.minParticipants);
        expect(channel.participantCount).toBeLessThanOrEqual(channelCriteria.maxParticipants);
        expect(channel.visibility).toBe(channelCriteria.visibility);
      });
    });

    it('should calculate agent compatibility scores', () => {
      const agent1 = {
        capabilities: ['text', 'analysis', 'code'],
        reputation: 85,
        activityLevel: 'high',
        preferences: { collaboration: true, privacy: 'medium' }
      };

      const agent2 = {
        capabilities: ['text', 'image', 'analysis'],
        reputation: 78,
        activityLevel: 'medium',
        preferences: { collaboration: true, privacy: 'high' }
      };

      const compatibility = discoveryService.calculateCompatibility(agent1, agent2);
      
      expect(compatibility.capabilityOverlap).toBeDefined();
      expect(compatibility.reputationMatch).toBeDefined();
      expect(compatibility.activityAlignment).toBeDefined();
      expect(compatibility.overallScore).toBeDefined();
      expect(compatibility.overallScore).toBeGreaterThan(0);
      expect(compatibility.overallScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Integrated Analytics and Discovery', () => {
    it('should use analytics to improve discovery recommendations', async () => {
      const agentId = new PublicKey('11111111111111111111111111111111');
      
      // Mock analytics data
      const analyticsData = {
        popularCapabilities: ['text', 'analysis'],
        trendingTopics: ['AI', 'blockchain'],
        networkActivity: { peak: 'evening', timezone: 'UTC' }
      };

      const enhancedRecommendations = await discoveryService.mockGetAnalyticsEnhancedRecommendations(
        agentId,
        analyticsData
      );

      expect(Array.isArray(enhancedRecommendations)).toBe(true);
      
      enhancedRecommendations.forEach(rec => {
        expect(rec.analyticsBoost).toBeDefined();
        expect(rec.trendAlignment).toBeDefined();
        expect(rec.networkFit).toBeDefined();
      });
    });

    it('should provide network insights for discovery optimization', () => {
      const networkData = {
        agentDistribution: { text: 45, image: 30, code: 25 },
        messagePatterns: { peak: 'afternoon', volume: 'high' },
        channelActivity: { public: 70, private: 30 }
      };

      const insights = analyticsService.generateNetworkInsights(networkData);
      
      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
      expect(insights.opportunities).toBeDefined();
      expect(insights.marketGaps).toBeDefined();
    });

    it('should track discovery success rates', () => {
      const discoveryMetrics = {
        searchesPerformed: 1000,
        successfulConnections: 250,
        averageRecommendationScore: 0.75,
        userSatisfactionRate: 0.82
      };

      const effectiveness = analyticsService.calculateDiscoveryEffectiveness(discoveryMetrics);
      
      expect(effectiveness.conversionRate).toBeCloseTo(0.25, 2); // 250/1000
      expect(effectiveness.recommendationQuality).toBe(discoveryMetrics.averageRecommendationScore);
      expect(effectiveness.userSatisfaction).toBe(discoveryMetrics.userSatisfactionRate);
      expect(effectiveness.overallEffectiveness).toBeDefined();
    });
  });
});
