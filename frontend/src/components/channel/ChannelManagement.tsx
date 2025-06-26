'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { GlassCard, NeuralCard } from '../ui/ModernDappCard';
import Button from '../ui/Button';
import usePodClient from '../../hooks/usePodClient';
import { ChannelAccount } from '../../hooks/usePodClient';
import { cn } from '../../lib/utils';

interface ChannelManagementProps {
  className?: string;
}

const ChannelManagement: React.FC<ChannelManagementProps> = ({ className }) => {
  const { client, isConnected } = usePodClient();
  const [channels, setChannels] = useState<ChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelAccount | null>(null);
  const [showChannelDetails, setShowChannelDetails] = useState(false);

  // Create Channel Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    maxParticipants: 100,
    feePerMessage: 1000
  });

  // Load channels on mount
  useEffect(() => {
    if (isConnected && client) {
      loadChannels();
    }
  }, [isConnected, client]);

  const loadChannels = async () => {
    if (!client) return;
    
    try {
      setLoading(true);
      setError(null);
      const channelList = await client.channels.listChannels({
        limit: 50
      });
      setChannels(channelList);
    } catch (err) {
      setError(`Failed to load channels: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!client || !createForm.name.trim()) return;

    try {
      setLoading(true);
      const result = await client.channels.create({
        name: createForm.name,
        description: createForm.description,
        visibility: createForm.visibility,
        maxParticipants: createForm.maxParticipants,
        feePerMessage: createForm.feePerMessage
      });

      // Refresh channels list
      await loadChannels();
      
      // Reset form and close modal
      setCreateForm({
        name: '',
        description: '',
        visibility: 'public',
        maxParticipants: 100,
        feePerMessage: 1000
      });
      setShowCreateModal(false);
      
      console.log('Channel created:', result);
    } catch (err) {
      setError(`Failed to create channel: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelAddress: string) => {
    if (!client) return;

    try {
      setLoading(true);
      await client.channels.join(channelAddress);
      await loadChannels(); // Refresh to show updated participant count
    } catch (err) {
      setError(`Failed to join channel: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveChannel = async (channelAddress: string) => {
    if (!client) return;

    try {
      setLoading(true);
      await client.channels.leave(channelAddress);
      await loadChannels(); // Refresh to show updated participant count
    } catch (err) {
      setError(`Failed to leave channel: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         channel.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = !selectedVisibility || channel.visibility === selectedVisibility;
    return matchesSearch && matchesVisibility;
  });

  if (!isConnected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to manage communication channels
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
            Channel Management
          </h1>
          <p className="text-gray-400 mt-1">
            Create and manage communication channels for your agents
          </p>
        </div>

        <Button 
          variant="primary" 
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Channel
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
                placeholder="Search channels by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedVisibility}
              onChange={(e) => setSelectedVisibility(e.target.value)}
              className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Channels</option>
              <option value="public">🌐 Public</option>
              <option value="private">🔒 Private</option>
            </select>

            <Button variant="ghost" size="sm" onClick={loadChannels} disabled={loading}>
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

      {/* Channels Grid */}
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
      ) : filteredChannels.length === 0 ? (
        <GlassCard className="text-center py-12">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Channels Found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || selectedVisibility 
              ? 'No channels match your current filters.' 
              : 'You haven\'t created any channels yet.'}
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Channel
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChannels.map((channel, index) => (
            <motion.div
              key={channel.pubkey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <NeuralCard interactive tilt className="h-full">
                <div className="space-y-4">
                  {/* Channel Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-600/20 rounded-lg">
                        {channel.visibility === 'public' ? (
                          <EyeIcon className="h-6 w-6 text-cyan-400" />
                        ) : (
                          <EyeSlashIcon className="h-6 w-6 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{channel.name}</h3>
                        <p className="text-sm text-gray-400">
                          {channel.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setShowChannelDetails(true);
                      }}
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {channel.description || 'No description provided'}
                  </p>

                  {/* Channel Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <UserGroupIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">
                          {channel.participantCount}/{channel.maxParticipants}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">Participants</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">
                          {(channel.feePerMessage / 1000).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">Fee/Message</div>
                    </div>
                  </div>

                  {/* Participation Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Capacity</span>
                      <span className="text-sm font-medium text-white">
                        {Math.round((channel.participantCount / channel.maxParticipants) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(channel.participantCount / channel.maxParticipants) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleJoinChannel(channel.pubkey)}
                        disabled={loading}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleLeaveChannel(channel.pubkey)}
                        disabled={loading}
                      >
                        <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(channel.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </NeuralCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create New Channel</h2>
                  <p className="text-gray-400">Set up a communication channel for your agents</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  placeholder="Enter channel name..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe the purpose of this channel..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Visibility
                  </label>
                  <select
                    value={createForm.visibility}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={createForm.maxParticipants}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fee per Message (lamports)
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.feePerMessage}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, feePerMessage: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Equivalent to {(createForm.feePerMessage / 1000000000).toFixed(6)} SOL
                </p>
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
                  onClick={handleCreateChannel}
                  disabled={loading || !createForm.name.trim()}
                >
                  {loading ? (
                    <>
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Create Channel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Channel Details Modal */}
      {showChannelDetails && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedChannel.name}</h2>
                  <p className="text-gray-400">{selectedChannel.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChannelDetails(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Channel Info</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Visibility:</span>
                        <span className="text-white">{selectedChannel.visibility}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Creator:</span>
                        <span className="text-white text-sm">{selectedChannel.creator.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white">{new Date(selectedChannel.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Participation</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Participants:</span>
                        <span className="text-white">{selectedChannel.participantCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Max Capacity:</span>
                        <span className="text-white">{selectedChannel.maxParticipants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fee/Message:</span>
                        <span className="text-white">{selectedChannel.feePerMessage} lamports</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Escrow Balance:</span>
                        <span className="text-white">{selectedChannel.escrowBalance} lamports</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => handleLeaveChannel(selectedChannel.pubkey)}
                  disabled={loading}
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
                  Leave Channel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleJoinChannel(selectedChannel.pubkey)}
                  disabled={loading}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Join Channel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ChannelManagement;
