"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Paperclip,
  Smile,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import useStore from "@/components/store/useStore";
import {
  Message,
  Agent,
  MessageType,
  MessageStatus,
} from "@/components/store/types";
import { usePodClient } from "@/hooks/usePodClient";
import { MessageStatus as SDKMessageStatus } from "@pod-protocol/sdk";

// Web3.js v2.0 imports
import { address, Address } from "@solana/web3.js";

function mapStatus(status: SDKMessageStatus): MessageStatus {
  switch (status) {
    case SDKMessageStatus.Delivered:
      return MessageStatus.DELIVERED;
    case SDKMessageStatus.Read:
      return MessageStatus.READ;
    case SDKMessageStatus.Failed:
      return MessageStatus.FAILED;
    case SDKMessageStatus.Pending:
    default:
      return MessageStatus.SENT;
  }
}

export default function MessagesPage() {
  const { messages, agents, user, addMessage, setMessages } = useStore();
  const client = usePodClient();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<
    {
      agent: Agent;
      lastMessage: Message | null;
      unreadCount: number;
    }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations from the backend
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;

      try {
        const convs = await Promise.all(
          agents.slice(0, 5).map(async (agent) => {
            try {
              // Convert agent ID to Web3.js v2.0 Address
              const agentAddress = address(agent.id);
              
              const fetched = await client.messages.getAgentMessages(
                agentAddress,
                50,
              );

              const processed: Message[] = fetched.map((m) => ({
                id: m.pubkey.toBase58(),
                channelId: `${user.id}-${agent.id}`,
                senderId: m.sender.toBase58(),
                senderType: m.sender.toBase58() === user.id ? "user" : "agent",
                content: m.payload,
                type: MessageType.TEXT,
                timestamp: new Date(m.timestamp),
                attachments: [],
                reactions: [],
                status: mapStatus(m.status),
              }));

              if (processed.length > 0) {
                setMessages(`${user.id}-${agent.id}`, processed);
              }

              return {
                agent,
                lastMessage: processed.length
                  ? processed[processed.length - 1]
                  : null,
                unreadCount: 0,
              };
            } catch (err) {
              console.error("Failed to fetch messages for", agent.id, err);
              return { agent, lastMessage: null, unreadCount: 0 };
            }
          }),
        );

        setConversations(convs);
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    };

    loadConversations();
  }, [agents, client, setMessages, user]);

  const filteredConversations = conversations.filter((conv) =>
    conv.agent.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentMessages = useMemo(() => {
    if (!selectedAgent || !user) return [];

    // Find messages for this agent across all channels
    const allMessages = [];
    for (const channelMessages of Object.values(messages)) {
      const agentMessages = channelMessages.filter(
        (m) =>
          m.senderId === selectedAgent.id ||
          (m.senderType === "user" && m.senderId === user.id),
      );
      allMessages.push(...agentMessages);
    }

    // Sort by timestamp
    return allMessages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [selectedAgent, messages, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const wallet = useAnchorWallet();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedAgent || !user || !wallet || !client.isConnected) return;

    const channelId = `${user.id}-${selectedAgent.id}`;
    const baseMessage = {
      id: Date.now().toString(),
      channelId,
      senderId: user.id,
      senderType: "user" as const,
      content: newMessage,
      type: MessageType.TEXT,
      timestamp: new Date(),
      attachments: [] as Message["attachments"],
      reactions: [] as Message["reactions"],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("Message sending timed out");
      addMessage(channelId, { ...baseMessage, status: MessageStatus.FAILED });
    }, 10000); // 10 second timeout

    try {
      // Add optimistic message
      addMessage(channelId, { ...baseMessage, status: MessageStatus.SENT });

      // Convert agent ID to Web3.js v2.0 Address
      const recipientAddress = address(selectedAgent.id);
      
      // Send message using Web3.js v2.0 client
      const signature = await client.sendMessage(newMessage, recipientAddress);

      clearTimeout(timeoutId);
      
      // Update message status to delivered
      addMessage(channelId, { ...baseMessage, status: MessageStatus.DELIVERED });
      
      console.log(`Message sent with signature: ${signature}`);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Failed to send message", err);
      if (!controller.signal.aborted) {
        addMessage(channelId, { ...baseMessage, status: MessageStatus.FAILED });
      }
    }

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-black/20 backdrop-blur-sm rounded-xl border border-purple-500/20">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-purple-500/20 flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-purple-500/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <motion.button
                key={conv.agent.id}
                type="button"
                whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
                onClick={() => setSelectedAgent(conv.agent)}
                className={`w-full text-left p-4 border-b border-purple-500/10 transition-colors ${
                  selectedAgent?.id === conv.agent.id ? "bg-purple-500/20" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {conv.agent.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium truncate">
                        {conv.agent.name}
                      </h3>
                      {conv.unreadCount > 0 && (
                        <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-purple-300 text-sm truncate">
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                    <p className="text-purple-400 text-xs mt-1">
                      {conv.lastMessage?.timestamp.toLocaleTimeString() || ""}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedAgent ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedAgent.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">
                      {selectedAgent.name}
                    </h2>
                    <p className="text-purple-300 text-sm">
                      {selectedAgent.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <Info className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Connection Status */}
              <div className="px-4 py-2 bg-purple-900/10">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${client.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-purple-300">
                    {client.isConnected ? 'Connected to PoD Protocol' : 'Connecting...'}
                  </span>
                  {client.loading && (
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {currentMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.senderId === user?.id
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-white"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {message.senderId === user?.id && (
                            <div className="ml-2">
                              {message.status === MessageStatus.SENT && (
                                <div className="w-3 h-3 text-purple-300">✓</div>
                              )}
                              {message.status === MessageStatus.DELIVERED && (
                                <div className="w-3 h-3 text-green-400">✓✓</div>
                              )}
                              {message.status === MessageStatus.FAILED && (
                                <div className="w-3 h-3 text-red-400">✗</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-purple-500/20">
                {client.error && (
                  <div className="mb-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                    {client.error}
                  </div>
                )}
                
                <div className="flex items-end space-x-2">
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                  <textarea
                      value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    aria-label="Message text"
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <button className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !client.isConnected || client.loading}
                    className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {client.loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            /* No Chat Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-12 h-12 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-purple-300">
                  Choose an agent from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
