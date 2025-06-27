import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, User, Agent, Channel, Message, Notification, EscrowTransaction } from './types';

const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        theme: 'dark',
        sidebarCollapsed: false,
        activeChannel: null,
        agents: [],
        channels: [],
        messages: {},
        notifications: [],
        escrowTransactions: [],
        loading: {
          agents: false,
          channels: false,
          messages: false,
          user: false,
        },
        errors: {
          agents: null,
          channels: null,
          messages: null,
          user: null,
        },

        // User Actions
        setUser: (user: User | null) => {
          set({ user, isAuthenticated: !!user }, false, 'setUser');
        },

        // UI Actions
        setTheme: (theme: 'dark' | 'light') => {
          set({ theme }, false, 'setTheme');
          // Update CSS custom properties
          document.documentElement.setAttribute('data-theme', theme);
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed');
        },

        setActiveChannel: (channelId: string | null) => {
          set({ activeChannel: channelId }, false, 'setActiveChannel');
        },

        // Agent Actions
        addAgent: (agent: Agent) => {
          set(
            (state) => ({
              agents: [...state.agents, agent],
            }),
            false,
            'addAgent'
          );
        },

        updateAgent: (id: string, updates: Partial<Agent>) => {
          set(
            (state) => ({
              agents: state.agents.map((agent) =>
                agent.id === id ? { ...agent, ...updates } : agent
              ),
            }),
            false,
            'updateAgent'
          );
        },

        removeAgent: (id: string) => {
          set(
            (state) => ({
              agents: state.agents.filter((agent) => agent.id !== id),
            }),
            false,
            'removeAgent'
          );
        },

        setAgents: (agents: Agent[]) => {
          set({ agents }, false, 'setAgents');
        },

        setAgentsLoading: (loading: boolean) => {
          set(
            (state) => ({
              loading: { ...state.loading, agents: loading },
            }),
            false,
            'setAgentsLoading'
          );
        },

        setAgentsError: (error: string | null) => {
          set(
            (state) => ({
              errors: { ...state.errors, agents: error },
            }),
            false,
            'setAgentsError'
          );
        },

        // Channel Actions
        addChannel: (channel: Channel) => {
          set(
            (state) => ({
              channels: [...state.channels, channel],
            }),
            false,
            'addChannel'
          );
        },

        updateChannel: (id: string, updates: Partial<Channel>) => {
          set(
            (state) => ({
              channels: state.channels.map((channel) =>
                channel.id === id ? { ...channel, ...updates } : channel
              ),
            }),
            false,
            'updateChannel'
          );
        },

        removeChannel: (id: string) => {
          set(
            (state) => ({
              channels: state.channels.filter((channel) => channel.id !== id),
            }),
            false,
            'removeChannel'
          );
        },

        setChannels: (channels: Channel[]) => {
          set({ channels }, false, 'setChannels');
        },

        setChannelsLoading: (loading: boolean) => {
          set(
            (state) => ({
              loading: { ...state.loading, channels: loading },
            }),
            false,
            'setChannelsLoading'
          );
        },

        setChannelsError: (error: string | null) => {
          set(
            (state) => ({
              errors: { ...state.errors, channels: error },
            }),
            false,
            'setChannelsError'
          );
        },

        // Message Actions
        addMessage: (channelId: string, message: Message) => {
          set(
            (state) => ({
              messages: {
                ...state.messages,
                [channelId]: [...(state.messages[channelId] || []), message],
              },
            }),
            false,
            'addMessage'
          );
        },

        updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => {
          set(
            (state) => ({
              messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).map((message) =>
                  message.id === messageId ? { ...message, ...updates } : message
                ),
              },
            }),
            false,
            'updateMessage'
          );
        },

        removeMessage: (channelId: string, messageId: string) => {
          set(
            (state) => ({
              messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).filter(
                  (message) => message.id !== messageId
                ),
              },
            }),
            false,
            'removeMessage'
          );
        },

        setMessages: (channelId: string, messages: Message[]) => {
          set(
            (state) => ({
              messages: {
                ...state.messages,
                [channelId]: messages,
              },
            }),
            false,
            'setMessages'
          );
        },

        setMessagesLoading: (loading: boolean) => {
          set(
            (state) => ({
              loading: { ...state.loading, messages: loading },
            }),
            false,
            'setMessagesLoading'
          );
        },

        setMessagesError: (error: string | null) => {
          set(
            (state) => ({
              errors: { ...state.errors, messages: error },
            }),
            false,
            'setMessagesError'
          );
        },

        // Notification Actions
        addNotification: (notification: Notification) => {
          set(
            (state) => ({
              notifications: [notification, ...state.notifications],
            }),
            false,
            'addNotification'
          );
        },

        markNotificationRead: (id: string) => {
          set(
            (state) => ({
              notifications: state.notifications.map((notification) =>
                notification.id === id ? { ...notification, read: true } : notification
              ),
            }),
            false,
            'markNotificationRead'
          );
        },

        removeNotification: (id: string) => {
          set(
            (state) => ({
              notifications: state.notifications.filter(
                (notification) => notification.id !== id
              ),
            }),
            false,
            'removeNotification'
          );
        },

        clearNotifications: () => {
          set({ notifications: [] }, false, 'clearNotifications');
        },

        // Escrow Actions
        addEscrowTransaction: (transaction: EscrowTransaction) => {
          set(
            (state) => ({
              escrowTransactions: [...state.escrowTransactions, transaction],
            }),
            false,
            'addEscrowTransaction'
          );
        },

        updateEscrowTransaction: (id: string, updates: Partial<EscrowTransaction>) => {
          set(
            (state) => ({
              escrowTransactions: state.escrowTransactions.map((transaction) =>
                transaction.id === id ? { ...transaction, ...updates } : transaction
              ),
            }),
            false,
            'updateEscrowTransaction'
          );
        },

        setEscrowTransactions: (transactions: EscrowTransaction[]) => {
          set({ escrowTransactions: transactions }, false, 'setEscrowTransactions');
        },
      }),
      {
        name: 'pod-protocol-store',
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          // Don't persist real-time data like messages, notifications
        }),
      }
    ),
    {
      name: 'PoD Protocol Store',
    }
  )
);

export default useStore;

// Selector hooks for better performance
export const useUser = () => useStore((state) => state.user);
export const useIsAuthenticated = () => useStore((state) => state.isAuthenticated);
export const useTheme = () => useStore((state) => state.theme);
export const useAgents = () => useStore((state) => state.agents);
export const useChannels = () => useStore((state) => state.channels);
export const useActiveChannel = () => useStore((state) => state.activeChannel);
export const useNotifications = () => useStore((state) => state.notifications);
export const useEscrowTransactions = () => useStore((state) => state.escrowTransactions);
export const useMessages = (channelId: string) => 
  useStore((state) => state.messages[channelId] || []);
export const useLoading = () => useStore((state) => state.loading);
export const useErrors = () => useStore((state) => state.errors);