import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChannelsPage from '../page';
import { ChannelType } from '../../components/store/types';

// Mock the store
const mockStore = {
  channels: [],
  setChannels: jest.fn(),
  setChannelsLoading: jest.fn(),
  setChannelsError: jest.fn(),
  setActiveChannel: jest.fn(),
  channelsLoading: false,
  channelsError: null,
};

jest.mock('../../components/store/useStore', () => ({
  __esModule: true,
  default: () => mockStore,
}));

// Mock usePodClient hook
const mockPodClient = {
  client: {
    channels: {
      getAllChannels: jest.fn().mockResolvedValue([]),
      createChannel: jest.fn().mockResolvedValue({
        pubkey: { toBase58: () => 'test-channel-id' },
        name: 'Test Channel',
        description: 'Test Description',
        creator: { toBase58: () => 'test-creator' },
      }),
    },
  },
  isInitialized: true,
  initError: null,
};

jest.mock('../../hooks/usePodClient', () => ({
  __esModule: true,
  default: () => mockPodClient,
}));

describe('ChannelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.channels = [];
    mockStore.channelsLoading = false;
    mockStore.channelsError = null;
  });

  it('renders the channels page correctly', () => {
    render(<ChannelsPage />);
    
    expect(screen.getByText('Channels')).toBeInTheDocument();
    expect(screen.getByText('Manage your conversations and collaborations')).toBeInTheDocument();
    expect(screen.getByText('Create Channel')).toBeInTheDocument();
  });

  it('displays loading state when client is not initialized', () => {
    mockPodClient.isInitialized = false;
    
    render(<ChannelsPage />);
    
    expect(screen.getByText('Initializing PoD Client...')).toBeInTheDocument();
    expect(screen.getByText('Connecting to Solana network and setting up secure communication')).toBeInTheDocument();
  });

  it('displays error state when client initialization fails', () => {
    mockPodClient.initError = 'Network connection failed';
    
    render(<ChannelsPage />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
  });

  it('displays loading skeleton when channels are loading', () => {
    mockStore.channelsLoading = true;
    
    render(<ChannelsPage />);
    
    // Check if skeleton loaders are present (they have specific background colors)
    const skeletonElements = document.querySelectorAll('.bg-gray-700\\/50');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('displays error when channels fail to load', () => {
    mockStore.channelsError = 'Failed to load channels';
    
    render(<ChannelsPage />);
    
    expect(screen.getByText('Failed to Load Channels')).toBeInTheDocument();
    expect(screen.getByText('Failed to load channels')).toBeInTheDocument();
  });

  it('displays empty state when no channels exist', () => {
    render(<ChannelsPage />);
    
    expect(screen.getByText('No channels found')).toBeInTheDocument();
    expect(screen.getByText('Create your first channel to start collaborating with AI agents')).toBeInTheDocument();
  });

  it('filters channels by search query', async () => {
    const user = userEvent.setup();
    mockStore.channels = [
      {
        id: '1',
        name: 'General Chat',
        description: 'General discussion',
        type: ChannelType.GROUP,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 5,
        settings: { allowFileUploads: true, maxParticipants: 100, moderationEnabled: false, allowedFileTypes: [] },
      },
      {
        id: '2',
        name: 'Development',
        description: 'Development discussions',
        type: ChannelType.GROUP,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 10,
        settings: { allowFileUploads: true, maxParticipants: 100, moderationEnabled: false, allowedFileTypes: [] },
      },
    ];
    
    render(<ChannelsPage />);
    
    // Both channels should be visible initially
    expect(screen.getByText('General Chat')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    
    // Search for 'general'
    const searchInput = screen.getByPlaceholderText('Search channels...');
    await user.type(searchInput, 'general');
    
    // Only General Chat should be visible
    expect(screen.getByText('General Chat')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('filters channels by type', async () => {
    const user = userEvent.setup();
    mockStore.channels = [
      {
        id: '1',
        name: 'Group Channel',
        description: 'Group discussion',
        type: ChannelType.GROUP,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 5,
        settings: { allowFileUploads: true, maxParticipants: 100, moderationEnabled: false, allowedFileTypes: [] },
      },
      {
        id: '2',
        name: 'Direct Message',
        description: 'Direct communication',
        type: ChannelType.DIRECT,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 3,
        settings: { allowFileUploads: true, maxParticipants: 2, moderationEnabled: false, allowedFileTypes: [] },
      },
    ];
    
    render(<ChannelsPage />);
    
    // Both channels should be visible initially
    expect(screen.getByText('Group Channel')).toBeInTheDocument();
    expect(screen.getByText('Direct Message')).toBeInTheDocument();
    
    // Filter by Direct Message type
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, 'direct');
    
    // Only Direct Message should be visible
    expect(screen.queryByText('Group Channel')).not.toBeInTheDocument();
    expect(screen.getByText('Direct Message')).toBeInTheDocument();
  });

  it('opens create channel modal when create button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ChannelsPage />);
    
    const createButton = screen.getByText('Create Channel');
    await user.click(createButton);
    
    expect(screen.getByText('Create New Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
  });

  it('validates channel creation form', async () => {
    const user = userEvent.setup();
    
    render(<ChannelsPage />);
    
    // Open modal
    const createButton = screen.getByText('Create Channel');
    await user.click(createButton);
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /create channel/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Channel name is required')).toBeInTheDocument();
  });

  it('validates channel name length', async () => {
    const user = userEvent.setup();
    
    render(<ChannelsPage />);
    
    // Open modal
    const createButton = screen.getByText('Create Channel');
    await user.click(createButton);
    
    // Enter short name
    const nameInput = screen.getByLabelText('Channel Name');
    await user.type(nameInput, 'ab');
    
    const submitButton = screen.getByRole('button', { name: /create channel/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Channel name must be at least 3 characters')).toBeInTheDocument();
  });

  it('creates a new channel successfully', async () => {
    const user = userEvent.setup();
    
    render(<ChannelsPage />);
    
    // Open modal
    const createButton = screen.getByText('Create Channel');
    await user.click(createButton);
    
    // Fill form
    const nameInput = screen.getByLabelText('Channel Name');
    await user.type(nameInput, 'New Test Channel');
    
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    await user.type(descriptionInput, 'A test channel description');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create channel/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockPodClient.client.channels.createChannel).toHaveBeenCalledWith({
        name: 'New Test Channel',
        description: 'A test channel description',
        visibility: 'public',
        channelType: ChannelType.GROUP,
      });
    });
    
    expect(mockStore.setChannels).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ChannelsPage />);
    
    // Open modal
    const createButton = screen.getByText('Create Channel');
    await user.click(createButton);
    
    expect(screen.getByText('Create New Channel')).toBeInTheDocument();
    
    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(screen.queryByText('Create New Channel')).not.toBeInTheDocument();
  });

  it('navigates to channel when clicked', async () => {
    const user = userEvent.setup();
    mockStore.channels = [
      {
        id: 'test-channel-1',
        name: 'Test Channel',
        description: 'Test description',
        type: ChannelType.GROUP,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 5,
        settings: { allowFileUploads: true, maxParticipants: 100, moderationEnabled: false, allowedFileTypes: [] },
      },
    ];
    
    render(<ChannelsPage />);
    
    const channelCard = screen.getByText('Test Channel').closest('div[class*=\"cursor-pointer\"]');
    expect(channelCard).toBeInTheDocument();
    
    if (channelCard) {
      await user.click(channelCard);
      expect(mockStore.setActiveChannel).toHaveBeenCalledWith('test-channel-1');
    }
  });

  it('displays channel statistics correctly', () => {
    mockStore.channels = [
      {
        id: '1',
        name: 'Test Channel',
        description: 'Test description',
        type: ChannelType.GROUP,
        participants: ['user1', 'user2'],
        agents: ['agent1'],
        owner: 'test-owner',
        isPrivate: false,
        createdAt: new Date('2024-01-01'),
        lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
        messageCount: 42,
        settings: { allowFileUploads: true, maxParticipants: 100, moderationEnabled: false, allowedFileTypes: [] },
      },
    ];
    
    render(<ChannelsPage />);
    
    expect(screen.getByText('3 members')).toBeInTheDocument(); // 2 participants + 1 agent
    expect(screen.getByText('42 messages')).toBeInTheDocument();
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('shows private channel indicator', () => {
    mockStore.channels = [
      {
        id: '1',
        name: 'Private Channel',
        description: 'Private description',
        type: ChannelType.DIRECT,
        participants: [],
        agents: [],
        owner: 'test-owner',
        isPrivate: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 5,
        settings: { allowFileUploads: true, maxParticipants: 2, moderationEnabled: false, allowedFileTypes: [] },
      },
    ];
    
    render(<ChannelsPage />);
    
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });
});