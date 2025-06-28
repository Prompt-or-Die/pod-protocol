'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  HashtagIcon,
  LockClosedIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useStore from '../../components/store/useStore';
import { Channel, ChannelType } from '../../components/store/types';
import usePodClient from '../../hooks/usePodClient';

const ChannelsPage = () => {
  const router = useRouter();
  const { channels, setChannels, setChannelsLoading, setChannelsError, setActiveChannel } = useStore();
  const client = usePodClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ChannelType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load channels from the protocol
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setChannelsLoading(true);
        const fetched = await client.channels.getAllChannels(50);
        const processed: Channel[] = fetched.map((c) => ({
          id: c.pubkey.toBase58(),
          name: c.name,
          description: c.description,
          type: ChannelType.GROUP,
          participants: [],
          agents: [],
          owner: c.creator.toBase58(),
          isPrivate: c.visibility !== 'public',
          createdAt: new Date(c.createdAt),
          lastActivity: new Date(c.createdAt),
          messageCount: 0,
          settings: {
            allowFileUploads: true,
            maxParticipants: 100,
            moderationEnabled: false,
            allowedFileTypes: [],
          },
        }));
        setChannels(processed);
      } catch (err) {
        console.error('Failed to fetch channels', err);
        setChannelsError('Failed to load channels');
      } finally {
        setChannelsLoading(false);
      }
    };

    loadChannels();
  }, [client, setChannels, setChannelsLoading, setChannelsError]);

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (channel.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesType = selectedType === 'all' || channel.type === selectedType;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case ChannelType.DIRECT:
        return ChatBubbleLeftRightIcon;
      case ChannelType.GROUP:
        return UserGroupIcon;
      case ChannelType.AGENT_CHAT:
        return HashtagIcon;
      default:
        return ChatBubbleLeftRightIcon;
    }
  };

  const getChannelTypeLabel = (type: ChannelType) => {
    switch (type) {
      case ChannelType.DIRECT:
        return 'Direct Message';
      case ChannelType.GROUP:
        return 'Group Chat';
      case ChannelType.AGENT_CHAT:
        return 'Agent Chat';
      case ChannelType.MARKETPLACE:
        return 'Marketplace';
      case ChannelType.SUPPORT:
        return 'Support';
      default:
        return 'Unknown';
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleChannelClick = (channelId: string) => {
    setActiveChannel(channelId);
    // Navigate to chat interface
    router.push(`/chat/${channelId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Channels</h1>
            <p className="text-gray-400 mt-1">Manage your conversations and collaborations</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Channel
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
                aria-label="Search channels"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              />
            </div>
            
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ChannelType | 'all')}
              className="px-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
            >
              <option value="all">All Types</option>
              {Object.values(ChannelType).map(type => (
                <option key={type} value={type}>
                  {getChannelTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-gray-400">
          {filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''}
        </div>

        {/* Channels List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredChannels.map((channel, index) => {
              const IconComponent = getChannelIcon(channel.type);
              
              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleChannelClick(channel.id)}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Channel Icon */}
                      <div className="p-3 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
                        <IconComponent className="h-6 w-6 text-purple-400" />
                      </div>
                      
                      {/* Channel Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                            {channel.name}
                          </h3>
                          {channel.isPrivate && (
                            <LockClosedIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        
                        {channel.description && (
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                            {channel.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <UserGroupIcon className="h-4 w-4" />
                            <span>{channel.participants.length + channel.agents.length} members</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            <span>{channel.messageCount} messages</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{formatLastActivity(channel.lastActivity)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Channel Actions */}
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full">
                        {getChannelTypeLabel(channel.type)}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle menu click
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredChannels.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">No channels found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || selectedType !== 'all' 
                ? 'Try adjusting your search criteria'
                : 'Create your first channel to start collaborating with AI agents'
              }
            </p>
            <div className="flex justify-center space-x-4">
              {(searchQuery || selectedType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Channel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl p-6 border border-purple-500/20 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Create New Channel</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter channel name"
                    className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Describe the purpose of this channel"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Channel Type
                  </label>
                  <select className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    <option value={ChannelType.GROUP}>Group Chat</option>
                    <option value={ChannelType.AGENT_CHAT}>Agent Chat</option>
                    <option value={ChannelType.DIRECT}>Direct Message</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="private"
                    className="rounded border-purple-500/20 bg-gray-800/50 text-purple-600 focus:ring-purple-500/50"
                  />
                  <label htmlFor="private" className="text-sm text-gray-300">
                    Make this channel private
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                  Create Channel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default ChannelsPage;