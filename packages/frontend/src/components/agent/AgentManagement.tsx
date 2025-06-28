'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CpuChipIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PencilIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { GlassCard, NeuralCard } from '../ui/ModernDappCard';
import Button from '../ui/Button';
import usePodClient from '../../hooks/usePodClient';
import type { AgentAccount } from '../../types/sdk';
import { cn } from '../../lib/utils';

interface AgentManagementProps {
  className?: string;
}

const AGENT_CAPABILITIES = [
  { value: 'trading', label: 'Trading & Finance', icon: '💰', description: 'Market analysis and trading operations' },
  { value: 'analysis', label: 'Data Analysis', icon: '📊', description: 'Advanced data processing and insights' },
  { value: 'content', label: 'Content Generation', icon: '✍️', description: 'Text and media content creation' },
  { value: 'research', label: 'Research', icon: '🔬', description: 'Information gathering and research' },
  { value: 'communication', label: 'Communication', icon: '💬', description: 'Multi-agent communication and coordination' },
  { value: 'automation', label: 'Automation', icon: '⚡', description: 'Task automation and workflow management' }
];

const AgentManagement: React.FC<AgentManagementProps> = ({ className }) => {
  const { client, isConnected } = usePodClient();
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Agent Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    capabilities: [] as string[],
    metadataUri: '',
    isPublic: true,
    description: ''
  });

  // Load agents on mount
  useEffect(() => {
    if (isConnected && client) {
      loadAgents();
    }
  }, [isConnected, client]);

  const loadAgents = async () => {
    if (!client) return;
    
    try {
      setLoading(true);
      setError(null);
      const agentList = await client.agents.listAgents({
        limit: 50
      });
      setAgents(agentList);
    } catch (err) {
      setError(`Failed to load agents: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!client || !createForm.name.trim()) return;

    try {
      setLoading(true);
      const result = await client.agents.register({
        name: createForm.name,
        capabilities: createForm.capabilities,
        metadataUri: createForm.metadataUri || `https://pod-protocol.com/agents/${createForm.name.toLowerCase().replace(/\s+/g, '-')}`,
        isPublic: createForm.isPublic
      });

      // Refresh agents list
      await loadAgents();
      
      // Reset form and close modal
      setCreateForm({
        name: '',
        capabilities: [],
        metadataUri: '',
        isPublic: true,
        description: ''
      });
      setShowCreateModal(false);
      
      console.log('Agent created:', result);
    } catch (err) {
      setError(`Failed to create agent: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const agentName = agent.name || agent.pubkey.toString().slice(0, 8);
    const agentCapabilities = Array.isArray(agent.capabilities) ? agent.capabilities : [];
    
    const matchesSearch = agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agentCapabilities.some(cap => cap.toString().toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCapability = !selectedCapability || agentCapabilities.includes(selectedCapability);
    return matchesSearch && matchesCapability;
  });

  if (!isConnected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to manage AI agents
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            AI Agent Management
          </h1>
          <p className="text-gray-400 mt-1">
            Create, manage, and monitor your AI agents
          </p>
        </div>

        <Button 
          variant="primary" 
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents by name or capabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedCapability}
              onChange={(e) => setSelectedCapability(e.target.value)}
              className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Capabilities</option>
              {AGENT_CAPABILITIES.map((cap) => (
                <option key={cap.value} value={cap.value}>
                  {cap.icon} {cap.label}
                </option>
              ))}
            </select>

            <Button variant="ghost" size="sm" onClick={loadAgents} disabled={loading}>
              <FunnelIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="animate-pulse">
              <div className="space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-700 rounded w-16" />
                  <div className="h-6 bg-gray-700 rounded w-20" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <GlassCard className="text-center py-12">
          <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Agents Found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || selectedCapability 
              ? 'No agents match your current filters.' 
              : 'You haven\'t created any agents yet.'}
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Agent
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.pubkey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <NeuralCard interactive tilt className="h-full">
                <div className="space-y-4">
                  {/* Agent Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-600/20 rounded-lg">
                        <CpuChipIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{agent.name || `Agent ${agent.pubkey.toString().slice(0, 8)}`}</h3>
                        <p className="text-sm text-gray-400">
                          {agent.pubkey.toString().slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        agent.isActive ? 'bg-green-400' : 'bg-gray-500'
                      )} />
                      <span className="text-xs text-gray-400">
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(agent.capabilities) ? agent.capabilities : []).map((cap, idx) => {
                        const capability = AGENT_CAPABILITIES.find(c => c.value === cap);
                        return (
                          <span
                            key={`${cap}-${idx}`}
                            className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full"
                          >
                            {capability?.icon} {capability?.label || cap}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Reputation</span>
                      <span className="text-sm font-medium text-white">{agent.reputation}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.reputation}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ChartBarIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Cog6ToothIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Updated {agent.lastUpdated ? new Date(agent.lastUpdated * 1000).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </NeuralCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Create New AI Agent</h2>
                <p className="text-gray-400">Configure your new AI agent with specific capabilities</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="Enter agent name..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capabilities
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AGENT_CAPABILITIES.map((capability) => (
                    <div
                      key={capability.value}
                      onClick={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          capabilities: prev.capabilities.includes(capability.value)
                            ? prev.capabilities.filter(c => c !== capability.value)
                            : [...prev.capabilities, capability.value]
                        }));
                      }}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        createForm.capabilities.includes(capability.value)
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{capability.icon}</span>
                        <div>
                          <div className="font-medium text-white text-sm">{capability.label}</div>
                          <div className="text-xs text-gray-400">{capability.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Metadata URI (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/agent-metadata.json"
                  value={createForm.metadataUri}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, metadataUri: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={createForm.isPublic}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-300">
                  Make agent publicly discoverable
                </label>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateAgent}
                  disabled={loading || !createForm.name.trim() || createForm.capabilities.length === 0}
                >
                  {loading ? (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
