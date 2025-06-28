'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  HashtagIcon,
  LockClosedIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import EnhancedDashboardLayout from '../components/layout/EnhancedDashboardLayout';
import useStore from '../components/store/useStore';
import { Channel, ChannelType } from '../components/store/types';
import usePodClient from '../hooks/usePodClient';
import LoadingState from '../components/ui/LoadingState';
import { SkeletonChannelList } from '../components/ui/SkeletonLoader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import Modal, { ModalContent, ModalFooter } from '../components/ui/Modal';
import { showToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

const EnhancedChannelsPage = () => {
  const { channels, setChannels, setChannelsLoading, setChannelsError, setActiveChannel, channelsLoading, channelsError } = useStore();
  const { client, isInitialized, initError } = usePodClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ChannelType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: ChannelType.GROUP,
    isPrivate: false
  });

  // Load channels from the protocol
  useEffect(() => {
    if (!isInitialized || initError) {
      return;
    }

    const loadChannels = async () => {
      try {
        setChannelsLoading(true);
        setChannelsError(null);
        
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
        
        if (processed.length === 0) {
          showToast.info('No channels found', 'Create your first channel to get started');
        }
      } catch (err) {
        console.error('Failed to fetch channels', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load channels';
        setChannelsError(errorMessage);
        showToast.error('Failed to load channels', errorMessage);
      } finally {
        setChannelsLoading(false);
      }
    };

    loadChannels();
  }, [client, isInitialized, initError, setChannels, setChannelsLoading, setChannelsError]);

  const handleCreateChannel = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setCreateError('Channel name is required');
      return;
    }

    if (formData.name.length < 3) {
      setCreateError('Channel name must be at least 3 characters');
      return;
    }

    if (formData.name.length > 50) {
      setCreateError('Channel name must be less than 50 characters');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const createPromise = async () => {
      const newChannel = await client.channels.createChannel({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        visibility: formData.isPrivate ? 'private' : 'public',
        channelType: formData.type
      });

      // Add new channel to local state
      const processedChannel: Channel = {
        id: newChannel.pubkey.toBase58(),
        name: newChannel.name,
        description: newChannel.description,
        type: formData.type,
        participants: [],
        agents: [],
        owner: newChannel.creator.toBase58(),
        isPrivate: formData.isPrivate,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        settings: {
          allowFileUploads: true,
          maxParticipants: 100,
          moderationEnabled: false,
          allowedFileTypes: [],
        },
      };

      setChannels([processedChannel, ...channels]);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: ChannelType.GROUP,
        isPrivate: false
      });
      
      setShowCreateModal(false);
      return processedChannel;
    };

    try {
      await showToast.promise(createPromise(), {
        loading: 'Creating channel...',
        success: (channel) => `Channel "${channel.name}" created successfully!`,
        error: (err) => `Failed to create channel: ${err.message}`,
      });
    } catch (err) {
      console.error('Failed to create channel:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  }, [formData, client, channels, setChannels]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (createError) setCreateError(null);
  }, [createError]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      type: ChannelType.GROUP,
      isPrivate: false
    });
    setCreateError(null);
    setIsCreating(false);
  }, []);

  const handleModalClose = useCallback(() => {
    if (!isCreating) {
      setShowCreateModal(false);
      resetForm();
    }
  }, [isCreating, resetForm]);

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
        return SparklesIcon;
      default:
        return ChatBubbleLeftRightIcon;
    }
  };

  const getChannelColor = (type: ChannelType) => {
    switch (type) {
      case ChannelType.DIRECT:
        return 'from-blue-500 to-cyan-500';
      case ChannelType.GROUP:
        return 'from-purple-500 to-pink-500';
      case ChannelType.AGENT_CHAT:
        return 'from-emerald-500 to-teal-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (initError) {
    return (
      <EnhancedDashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Card variant="neural" className="max-w-md text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connection Failed</h3>
              <p className="text-gray-400 mb-4">Unable to connect to PoD Protocol</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </EnhancedDashboardLayout>
    );
  }

  return (
    <EnhancedDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Channels</h1>
            <p className="text-gray-400 mt-1">
              Manage and participate in AI agent communication channels
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<PlusIcon className="w-5 h-5" />}
            glow
          >
            Create Channel
          </Button>
        </div>

        {/* Filters */}
        <Card variant="glass" className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
                variant="glass"
              />
            </div>
            <div className="flex gap-2">
              {['all', ...Object.values(ChannelType)].map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedType(type as ChannelType | 'all')}
                  className="capitalize"
                >
                  {type === 'all' ? 'All' : type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Content */}
        {channelsLoading ? (
          <SkeletonChannelList />
        ) : channelsError ? (
          <Card variant="neural" className="text-center p-8">
            <CardContent>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Error Loading Channels</h3>
              <p className="text-gray-400 mb-4">{channelsError}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredChannels.length === 0 ? (
          <Card variant="gradient" className="text-center p-12">
            <CardContent>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">
                {searchQuery ? 'No channels found' : 'No channels yet'}
              </h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search criteria or filters'
                  : 'Create your first channel to start communicating with AI agents'
                }
              </p>
              {!searchQuery && (
                <Button
                  variant="neural"
                  size="lg"
                  onClick={() => setShowCreateModal(true)}
                  icon={<PlusIcon className="w-5 h-5" />}
                >
                  Create First Channel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredChannels.map((channel, index) => {
              const IconComponent = getChannelIcon(channel.type);
              const colorClass = getChannelColor(channel.type);
              
              return (
                <Card
                  key={channel.id}
                  variant="neural"
                  className="group hover:scale-105 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setActiveChannel(channel);
                    // Navigate to channel (implement routing)
                  }}
                  animated
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'p-2 rounded-lg bg-gradient-to-r',
                          colorClass
                        )}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate group-hover:text-purple-300 transition-colors">
                            {channel.isPrivate && (
                              <LockClosedIcon className="w-4 h-4 inline mr-1" />
                            )}
                            {channel.name}
                          </CardTitle>
                          {channel.description && (
                            <CardDescription className="truncate">
                              {channel.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Participants</span>
                        <span className="text-white">{channel.participants.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Messages</span>
                        <span className="text-white">{channel.messageCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Last activity
                        </span>
                        <span className="text-white">
                          {new Date(channel.lastActivity).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium capitalize',
                        'bg-gray-700 text-gray-300'
                      )}>
                        {channel.type.replace('_', ' ')}
                      </span>
                      <Button variant="ghost" size="sm">
                        Join
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Channel Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          title="Create New Channel"
          description="Set up a new communication channel for AI agents"
          variant="neural"
          size="lg"
        >
          <ModalContent>
            <form onSubmit={handleCreateChannel} className="space-y-6">
              <Input
                label="Channel Name"
                placeholder="Enter channel name..."
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={createError}
                variant="neural"
                glow
                required
              />

              <Textarea
                label="Description (Optional)"
                placeholder="Describe the purpose of this channel..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="neural"
                rows={3}
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Channel Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(ChannelType).map((type) => {
                    const IconComponent = getChannelIcon(type);
                    const isSelected = formData.type === type;
                    
                    return (
                      <Card
                        key={type}
                        variant={isSelected ? 'neural' : 'default'}
                        className={cn(
                          'cursor-pointer transition-all duration-200 p-4',
                          isSelected ? 'ring-2 ring-purple-500' : 'hover:border-purple-500/50'
                        )}
                        onClick={() => handleInputChange('type', type)}
                      >
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-purple-400" />
                          <span className="font-medium text-white capitalize">
                            {type.replace('_', ' ')}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isPrivate" className="text-sm text-gray-300">
                  Make this channel private
                </label>
              </div>
            </form>
          </ModalContent>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={handleModalClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateChannel}
              loading={isCreating}
              disabled={!formData.name.trim()}
            >
              Create Channel
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </EnhancedDashboardLayout>
  );
};

export default EnhancedChannelsPage;
