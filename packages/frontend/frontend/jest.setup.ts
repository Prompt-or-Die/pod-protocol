import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Solana wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useAnchorWallet: () => null,
  useConnection: () => ({ connection: {} }),
  useWallet: () => ({
    publicKey: null,
    connected: false,
    connecting: false,
    disconnect: jest.fn(),
    connect: jest.fn(),
  }),
}));

// Mock PodComClient
jest.mock('@pod-protocol/sdk', () => ({
  PodComClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    channels: {
      getAllChannels: jest.fn().mockResolvedValue([]),
      createChannel: jest.fn().mockResolvedValue({
        pubkey: { toBase58: () => 'test-channel-id' },
        name: 'Test Channel',
        description: 'Test Description',
        creator: { toBase58: () => 'test-creator' },
      }),
    },
    agents: {
      registerAgent: jest.fn(),
      getAgent: jest.fn(),
    },
    messages: {
      sendMessage: jest.fn(),
      getMessages: jest.fn().mockResolvedValue([]),
    },
    secureCleanup: jest.fn(),
  })),
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    button: ({ children, ...props }: any) => React.createElement('button', props, children),
    section: ({ children, ...props }: any) => React.createElement('section', props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: () => React.createElement('svg', { 'data-testid': 'plus-icon' }),
  MagnifyingGlassIcon: () => React.createElement('svg', { 'data-testid': 'search-icon' }),
  ChatBubbleLeftRightIcon: () => React.createElement('svg', { 'data-testid': 'chat-icon' }),
  UserGroupIcon: () => React.createElement('svg', { 'data-testid': 'user-group-icon' }),
  EllipsisVerticalIcon: () => React.createElement('svg', { 'data-testid': 'ellipsis-icon' }),
  HashtagIcon: () => React.createElement('svg', { 'data-testid': 'hashtag-icon' }),
  LockClosedIcon: () => React.createElement('svg', { 'data-testid': 'lock-icon' }),
  ClockIcon: () => React.createElement('svg', { 'data-testid': 'clock-icon' }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
  Toaster: () => null,
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Web APIs not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalConsoleWarn;
});
