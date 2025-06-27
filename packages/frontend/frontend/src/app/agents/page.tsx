'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useStore from '../../components/store/useStore';
import { Agent, AgentCategory, AgentStatus } from '../../components/store/types';
import usePodClient from '../../hooks/usePodClient';

const AgentsPage = () => {
  const { agents, setAgents, setAgentsLoading, setAgentsError } = useStore();
  const client = usePodClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'reputation' | 'price' | 'recent'>('reputation');
  const [showFilters, setShowFilters] = useState(false);

  // Load agents from the protocol
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        const fetched = await client.agents.getAllAgents(50);
        const processed: Agent[] = fetched.map((a) => ({
          id: a.pubkey.toBase58(),
          name: a.metadataUri,
          description: '',
          avatar: '🤖',
          owner: a.pubkey.toBase58(),
          category: AgentCategory.OTHER,
          tags: [],
          pricing: { type: 'free', currency: 'SOL' },
          capabilities: [],
          status: AgentStatus.ACTIVE,
          reputation: a.reputation,
          totalInteractions: 0,
          createdAt: new Date(a.lastUpdated),
          updatedAt: new Date(a.lastUpdated),
          isVerified: false,
        }));
        setAgents(processed);
      } catch (err) {
        console.error('Failed to fetch agents', err);
        setAgentsError('Failed to load agents');
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
  }, [client, setAgents, setAgentsLoading, setAgentsError]);

  const filteredAgents = agents.filter((agent: Agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a: Agent, b: Agent) => {
    switch (sortBy) {
      case 'reputation':
        return b.reputation - a.reputation;
      case 'price':
        return (a.pricing.amount || 0) - (b.pricing.amount || 0);
      case 'recent':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return 0;
    }
  });

  const categories = Object.values(AgentCategory);

  const formatPrice = (agent: Agent) => {
    const { pricing } = agent;
    if (pricing.type === 'free') return 'Free';
    if (pricing.type === 'subscription') {
      return `${pricing.amount} ${pricing.currency}/${pricing.billingPeriod}`;
    }
    return `${pricing.amount} ${pricing.currency}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIconSolid
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-600'
        }`}
      />
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Agents Marketplace</h1>
            <p className="text-gray-400 mt-1">Discover and connect with specialized AI agents</p>
          </div>
          <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200">
            <PlusIcon className="h-5 w-5 mr-2" />
            Deploy Agent
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                aria-label="Search agents"
                placeholder="Search agents by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AgentCategory | 'all')}
              className="px-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'reputation' | 'price' | 'recent')}
              className="px-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
            >
              <option value="reputation">Sort by Reputation</option>
              <option value="price">Sort by Price</option>
              <option value="recent">Sort by Recent</option>
            </select>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 rounded-lg text-purple-400 transition-colors duration-200 flex items-center space-x-2"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-gray-400">
          Found {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAgents.map((agent: Agent, index: number) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{agent.avatar}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                          {agent.name}
                        </h3>
                        {agent.isVerified && (
                          <CheckBadgeIcon className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">by {agent.owner}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      {renderStars(agent.reputation)}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{agent.reputation}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {agent.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {agent.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {agent.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                      +{agent.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <span>{agent.totalInteractions} interactions</span>
                  <span className="capitalize">{agent.category}</span>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">
                    {formatPrice(agent)}
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors">
                      <CurrencyDollarIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-white mb-2">No agents found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search criteria or browse all categories</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentsPage;