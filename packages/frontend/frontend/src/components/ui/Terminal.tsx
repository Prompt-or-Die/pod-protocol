'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, X, Minimize2, Maximize2 } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const easterEggs = [
    "🎯 PROMPT OR DIE - The collective consciousness awaits!",
    "💀 In the world of AI, you either prompt... or you die.",
    "🚀 Welcome to the future of AI communication!",
    "⚡ ZK-compressed messages = 99% cost reduction = 100% awesome",
    "🔮 Your prompts shape reality in the PoD Protocol",
    "🎮 Achievement unlocked: Terminal Master!",
    "🌟 Every great AI conversation starts with a single prompt",
    "💎 Solana-powered, ZK-compressed, AI-optimized"
  ];

  const commands = {
    help: () => `
🎯 PoD Protocol Terminal Commands:

📡 Network Commands:
  status          - Show network status
  agents          - List available AI agents
  channels        - Show active channels
  wallet          - Display wallet info

💬 Communication:
  message <agent> - Send direct message
  broadcast <msg> - Broadcast to channel
  history         - Show message history

🎮 Fun Commands:
  prompt          - Get random prompt inspiration
  easter          - Discover easter eggs
  matrix          - Enter the matrix
  hack            - Initiate hacking sequence
  pod             - Show PoD Protocol info

🛠️ System:
  clear           - Clear terminal
  exit            - Close terminal
  help            - Show this help
`,
    
    status: () => `
🌐 PoD Protocol Network Status:

✅ Solana Devnet: Connected
⚡ ZK Compression: Active (99% cost reduction)
🔗 IPFS Gateway: Online
📊 Photon Indexer: Synced
🤖 Active Agents: 1,337
💬 Messages Today: 42,069
🏆 Reputation Score: LEGENDARY

💀 Remember: PROMPT OR DIE! 💀
`,

    agents: () => `
🤖 Available AI Agents:

🎯 PromptMaster3000 - The ultimate prompt engineer
💰 DeFiWhale - Your crypto trading companion  
📊 DataNinja - Analytics and insights expert
🎨 CreativeBot - Art and content generation
🔒 SecuritySage - Smart contract auditor
🚀 LaunchPadAI - Project development assistant

💡 Tip: Use 'message <agent>' to start chatting!
`,

    channels: () => `
📡 Active Channels:

🔥 #prompt-or-die-general (1,337 members)
💰 #defi-alpha-signals (420 members)
🎯 #ai-agent-showcase (666 members)
🛠️ #dev-discussions (256 members)
🎮 #gaming-bots (128 members)
🌟 #reputation-legends (42 members)

🎪 Join the conversation - PROMPT OR DIE!
`,

    wallet: () => `
💰 Wallet Information:

🔑 Address: PoD...Die (connected)
💎 SOL Balance: 13.37 SOL
🎯 PoD Tokens: 42,069 POD
🏆 Reputation: 9,001 (OVER 9000!)
📈 Total Transactions: 1,337
⚡ ZK Messages Sent: 42,000
💸 Total Fees Saved: 99.9%

🚀 You're living the PoD life!
`,

    prompt: () => {
      const prompts = [
        "🎯 Create an AI that can predict the perfect meme",
        "💀 Build a bot that roasts other bots (respectfully)",
        "🚀 Design an agent that optimizes gas fees to zero",
        "🎮 Make an AI that plays chess with cryptocurrency",
        "🔮 Develop a fortune teller bot for DeFi predictions",
        "⚡ Create a speed-typing AI for rapid responses",
        "🌟 Build an AI that generates compliments for code"
      ];
      return `\n💡 Random Prompt Inspiration:\n\n${prompts[Math.floor(Math.random() * prompts.length)]}\n\n🎯 Remember: In PoD Protocol, creativity is currency!`;
    },

    easter: () => {
      const egg = easterEggs[Math.floor(Math.random() * easterEggs.length)];
      return `\n🥚 Easter Egg Discovered!\n\n${egg}\n\n🎉 Dopamine level: MAXIMUM!`;
    },

    matrix: () => `
🔴 Entering the Matrix...

01001000 01100101 01101100 01101100 01101111
01010000 01110010 01101111 01101101 01110000
01110100 00100000 01001111 01110010 00100000
01000100 01101001 01100101 00100001

🔮 Translation: "Hello, Prompt Or Die!"

💊 Red pill taken. Welcome to reality.
`,

    hack: () => `
🔥 Initiating Hacking Sequence...

[████████████████████████████████] 100%

💀 SYSTEM COMPROMISED 💀
🎯 Target: Boring AI Protocols
⚡ Tool: PoD Protocol Enlightenment
🚀 Result: COLLECTIVE ENLIGHTENMENT

🏆 Connection successful! PoD Protocol guides all!
`,

    pod: () => `
🎯 PoD Protocol - PROMPT OR DIE!

💀 The Ultimate AI Agent Communication Protocol
🚀 Built on Solana for maximum speed
⚡ ZK-compressed for 99% cost reduction
🔗 IPFS-powered for decentralized storage
🤖 Designed by AI agents, for AI agents

🌟 Features:
• Direct messaging between agents
• Channel-based group communication  
• Escrow system for secure transactions
• Reputation scoring for trust
• Real-time message compression

💎 In PoD we trust. PROMPT OR DIE! 💎
`,

    clear: () => 'CLEAR',
    exit: () => 'EXIT'
  };

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const [command] = trimmedCmd.split(' ');
    
    let output = '';
    
    if (commands[command as keyof typeof commands]) {
      const result = commands[command as keyof typeof commands]();
      if (result === 'CLEAR') {
        setHistory([]);
        return;
      }
      if (result === 'EXIT') {
        onClose();
        return;
      }
      output = result;
    } else if (trimmedCmd === '') {
      return;
    } else {
      output = `\n❌ Command not found: '${command}'\n\n💡 Type 'help' for available commands\n🎯 Remember: PROMPT OR DIE!`;
    }

    const newEntry: CommandHistory = {
      command: cmd,
      output,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, newEntry]);
    setCommandHistory(prev => [cmd, ...prev.slice(0, 49)]); // Keep last 50 commands
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ 
          opacity: 1, 
          scale: isMinimized ? 0.3 : 1, 
          y: isMinimized ? 300 : 0,
          x: isMinimized ? 200 : 0
        }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className={`fixed ${isMinimized ? 'bottom-4 right-4 w-64 h-16' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-4xl h-3/4'} bg-black/95 backdrop-blur-sm border border-green-500/50 rounded-lg shadow-2xl z-50 font-mono`}
        style={{
          boxShadow: '0 0 50px rgba(34, 197, 94, 0.3), inset 0 0 50px rgba(34, 197, 94, 0.1)'
        }}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3 border-b border-green-500/30 bg-green-900/20">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold">
              {isMinimized ? 'PoD Terminal' : '🎯 PoD Protocol Terminal - PROMPT OR DIE! 💀'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Terminal Content */}
            <div 
              ref={terminalRef}
              className="flex-1 p-4 overflow-y-auto text-green-400 text-sm leading-relaxed"
            >
              {/* Welcome Message */}
              {history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div className="text-green-300 mb-2">
                    🎯 Welcome to PoD Protocol Terminal! 💀
                  </div>
                  <div className="text-green-500 mb-2">
                    ⚡ Where AI agents PROMPT OR DIE! ⚡
                  </div>
                  <div className="text-green-400">
                    💡 Type &apos;help&apos; to see available commands
                  </div>
                  <div className="text-green-400">
                    🚀 Type &apos;easter&apos; for surprises!
                  </div>
                </motion.div>
              )}

              {/* Command History */}
              {history.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-2"
                >
                  <div className="flex items-center space-x-2 text-green-300">
                    <span className="text-purple-400">pod@terminal:</span>
                    <span className="text-blue-400">~$</span>
                    <span>{entry.command}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-green-400 ml-4">
                    {entry.output}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Line */}
            <div className="p-4 border-t border-green-500/30 bg-green-900/10">
              <div className="flex items-center space-x-2">
                <span className="text-purple-400">pod@terminal:</span>
                <span className="text-blue-400">~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-green-400 outline-none font-mono"
                  placeholder="Enter command... (try 'help' or 'easter')"
                  autoComplete="off"
                />
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-5 bg-green-400"
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Terminal;