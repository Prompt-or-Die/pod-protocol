import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useWebSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Create a mock socket object
    mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    mockIo.mockReturnValue(mockSocket);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    expect(result.current.socket).toBeNull();
    expect(result.current.state).toEqual({
      connected: false,
      connecting: false,
      error: null,
      reconnectCount: 0,
    });
  });

  it('should connect to WebSocket server', () => {
    renderHook(() => useWebSocket({
      userId: 'test-user',
      username: 'Test User',
      autoConnect: true,
    }));

    expect(mockIo).toHaveBeenCalledWith({
      path: '/api/socket',
      auth: {
        userId: 'test-user',
        username: 'Test User',
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
  });

  it('should update state on connection', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate connection event
    const connectCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];

    act(() => {
      connectCallback?.();
    });

    expect(result.current.state.connected).toBe(true);
    expect(result.current.state.connecting).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate connection error
    const errorCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )?.[1];

    act(() => {
      errorCallback?.(new Error('Connection failed'));
    });

    expect(result.current.state.connected).toBe(false);
    expect(result.current.state.connecting).toBe(false);
    expect(result.current.state.error).toBe('Connection failed');
  });

  it('should send messages correctly', () => {
    const { result } = renderHook(() => useWebSocket({
      userId: 'test-user',
      username: 'Test User',
      autoConnect: false,
    }));

    act(() => {
      result.current.connect();
    });

    // Simulate connection
    const connectCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];

    act(() => {
      connectCallback?.();
    });

    act(() => {
      result.current.sendMessage('channel-1', 'Hello world!');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message:send', {
      channelId: 'channel-1',
      content: 'Hello world!',
      type: 'text',
      senderId: 'test-user',
      senderName: 'Test User',
    });
  });

  it('should join and leave channels', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.joinChannel('channel-1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('channel:join', 'channel-1');

    act(() => {
      result.current.leaveChannel('channel-1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('channel:leave', 'channel-1');
  });

  it('should handle typing indicators', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.startTyping('channel-1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('user:typing:start', 'channel-1');

    act(() => {
      result.current.stopTyping('channel-1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('user:typing:stop', 'channel-1');
  });

  it('should auto-stop typing after timeout', (done) => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.startTyping('channel-1');
    });

    // First call should be typing:start
    expect(mockSocket.emit).toHaveBeenLastCalledWith('user:typing:start', 'channel-1');

    // Wait for auto-stop timeout (slightly longer than 3 seconds)
    setTimeout(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('user:typing:stop', 'channel-1');
      done();
    }, 3100);
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
    const mockCallback = jest.fn();

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.onMessage(mockCallback);
    });

    expect(mockSocket.on).toHaveBeenCalledWith('message:new', mockCallback);
  });

  it('should unregister event listeners', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
    const mockCallback = jest.fn();

    act(() => {
      result.current.connect();
    });

    let unsubscribe: () => void;
    act(() => {
      unsubscribe = result.current.onMessage(mockCallback);
    });

    act(() => {
      unsubscribe();
    });

    expect(mockSocket.off).toHaveBeenCalledWith('message:new', mockCallback);
  });

  it('should disconnect properly', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(result.current.state.connected).toBe(false);
    expect(result.current.socket).toBeNull();
  });

  it('should handle disconnection events', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate disconnection
    const disconnectCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'disconnect'
    )?.[1];

    act(() => {
      disconnectCallback?.('transport close');
    });

    expect(result.current.state.connected).toBe(false);
  });

  it('should handle reconnection', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    // Simulate reconnection
    const reconnectCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'reconnect'
    )?.[1];

    act(() => {
      reconnectCallback?.(3);
    });

    expect(result.current.state.connected).toBe(true);
    expect(result.current.state.reconnectCount).toBe(3);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket({ autoConnect: true }));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should not emit events when socket is not connected', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    // Try to send message without connecting
    act(() => {
      result.current.sendMessage('channel-1', 'Hello');
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should edit and delete messages', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.editMessage('msg-1', 'Edited content');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message:edit', 'msg-1', 'Edited content');

    act(() => {
      result.current.deleteMessage('msg-1', 'channel-1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message:delete', 'msg-1', 'channel-1');
  });

  it('should set user status', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.setUserStatus('away');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('user:status', 'away');
  });

  it('should use custom options', () => {
    renderHook(() => useWebSocket({
      userId: 'custom-user',
      username: 'Custom User',
      autoConnect: true,
      reconnectAttempts: 10,
      reconnectDelay: 5000,
    }));

    expect(mockIo).toHaveBeenCalledWith({
      path: '/api/socket',
      auth: {
        userId: 'custom-user',
        username: 'Custom User',
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
      timeout: 10000,
    });
  });
});