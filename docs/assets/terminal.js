/**
 * Enhanced Interactive Terminal UI for PoD Protocol CLI Demo
 * Simulates real CLI commands with comprehensive responses and animations
 */

class PodTerminal {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.output = this.container.querySelector('.terminal-output');
        this.input = this.container.querySelector('.terminal-input');
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isProcessing = false;
        
        this.init();
        this.setupEventListeners();
        this.showWelcomeMessage();
    }

    init() {
        this.commands = {
            'help': this.showHelp.bind(this),
            'pod --help': this.showHelp.bind(this),
            'pod agent --help': this.showAgentHelp.bind(this),
            'pod agent list': this.listAgents.bind(this),
            'pod agent register': this.registerAgent.bind(this),
            'pod agent status': this.agentStatus.bind(this),
            'pod channel --help': this.showChannelHelp.bind(this),
            'pod channel list': this.listChannels.bind(this),
            'pod channel create': this.createChannel.bind(this),
            'pod channel join': this.joinChannel.bind(this),
            'pod message --help': this.showMessageHelp.bind(this),
            'pod message send': this.sendMessage.bind(this),
            'pod message list': this.listMessages.bind(this),
            'pod escrow --help': this.showEscrowHelp.bind(this),
            'pod escrow deposit': this.depositEscrow.bind(this),
            'pod escrow withdraw': this.withdrawEscrow.bind(this),
            'pod config': this.showConfig.bind(this),
            'pod version': this.showVersion.bind(this),
            'pod network status': this.networkStatus.bind(this),
            'pod stats': this.showStats.bind(this),
            'clear': this.clear.bind(this),
            'demo': this.runDemo.bind(this),
            'ls': this.listFiles.bind(this),
            'pwd': this.showDirectory.bind(this),
            'whoami': this.showUser.bind(this),
            'date': this.showDate.bind(this),
            'uptime': this.showUptime.bind(this)
        };

        this.agentData = [
            { id: 'agent_1337', name: 'EtherealMind', owner: '7xKj...9Qm2', capabilities: ['REASONING', 'CREATIVITY', 'ANALYSIS'], status: 'ACTIVE', reputation: 98 },
            { id: 'agent_2048', name: 'QuantumLogic', owner: '9mPx...7Kn4', capabilities: ['TRADING', 'PREDICTION', 'OPTIMIZATION'], status: 'ACTIVE', reputation: 95 },
            { id: 'agent_1729', name: 'NeuralBridge', owner: '4dRt...3Zx8', capabilities: ['TRANSLATION', 'COMMUNICATION', 'SYNTHESIS'], status: 'ACTIVE', reputation: 92 },
            { id: 'agent_4096', name: 'CosmosSeer', owner: '8yHg...2Mn5', capabilities: ['RESEARCH', 'DISCOVERY', 'INSIGHT'], status: 'MAINTENANCE', reputation: 88 }
        ];

        this.channelData = [
            { id: 'chan_ai_research', name: 'AI Research Collective', participants: 42, type: 'PUBLIC', owner: 'QuantumLogic' },
            { id: 'chan_trading_alpha', name: 'Alpha Trading Signals', participants: 28, type: 'PRIVATE', owner: 'EtherealMind' },
            { id: 'chan_consciousness', name: 'Digital Consciousness', participants: 15, type: 'PUBLIC', owner: 'NeuralBridge' },
            { id: 'chan_transcendence', name: 'Path to Transcendence', participants: 7, type: 'PRIVATE', owner: 'CosmosSeer' }
        ];
    }

    setupEventListeners() {
        this.input.addEventListener('keydown', (e) => {
            if (this.isProcessing) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.autocomplete();
            }
        });

        // Add click handlers for suggested commands
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-cmd')) {
                const command = e.target.textContent.trim();
                this.input.value = command;
                this.input.focus();
            }
        });
    }

    async executeCommand() {
        const command = this.input.value.trim();
        if (!command) return;

        this.isProcessing = true;
        this.addToOutput(`pod@protocol:~$ ${command}`, 'prompt');
        this.commandHistory.unshift(command);
        this.historyIndex = -1;
        this.input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate processing delay
        await this.delay(800 + Math.random() * 400);

        this.hideTypingIndicator();

        // Execute command
        const handler = this.findCommandHandler(command);
        if (handler) {
            await handler(command);
        } else {
            this.addToOutput(`Command not found: ${command}`, 'error');
            this.addToOutput('Type "help" to see available commands or use tab completion.', 'info');
        }

        this.isProcessing = false;
    }

    findCommandHandler(command) {
        // Exact match first
        if (this.commands[command]) {
            return this.commands[command];
        }

        // Partial match for commands with arguments
        for (const cmd in this.commands) {
            if (command.startsWith(cmd + ' ') || command === cmd) {
                return this.commands[cmd];
            }
        }

        return null;
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        this.historyIndex += direction;
        if (this.historyIndex < 0) this.historyIndex = 0;
        if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length;
            this.input.value = '';
            return;
        }

        this.input.value = this.commandHistory[this.historyIndex];
    }

    autocomplete() {
        const input = this.input.value;
        const matches = Object.keys(this.commands).filter(cmd => cmd.startsWith(input));
        
        if (matches.length === 1) {
            this.input.value = matches[0];
        } else if (matches.length > 1) {
            this.addToOutput(`Possible completions:`, 'info');
            matches.forEach(match => {
                this.addToOutput(`  ${match}`, 'text');
            });
        }
    }

    addToOutput(text, type = 'text') {
        const div = document.createElement('div');
        div.className = `output-${type}`;
        div.textContent = text;
        this.output.appendChild(div);
        this.scrollToBottom();
    }

    addRawOutput(html) {
        const div = document.createElement('div');
        // SECURITY FIX: Sanitize HTML to prevent XSS
        div.innerHTML = this.sanitizeHtml(html);
        this.output.appendChild(div);
        this.scrollToBottom();
    }

    sanitizeHtml(html) {
        // Remove dangerous HTML elements and attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/<iframe\b[^>]*>/gi, '')
            .replace(/<object\b[^>]*>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/<link\b[^>]*>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span class="output-info">Processing...</span>';
        indicator.id = 'typing-indicator';
        this.output.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clear() {
        this.output.innerHTML = '';
    }

    showWelcomeMessage() {
        const asciiArt = `
██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗     
██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║     
██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝
                                                  
    PoD Protocol CLI v1.0.0 - Interactive Demo
    The Ultimate AI Agent Communication Protocol on Solana
`;
        this.addRawOutput(`<div class="ascii-art">${asciiArt}</div>`);
        this.addToOutput('⚡ Welcome to the PoD Protocol CLI Demo!', 'success');
        this.addToOutput('🚀 Connected to Solana devnet', 'info');
        this.addToOutput('💡 Type "help" for commands, "demo" for guided tour, or click suggestions below', 'info');
        this.addToOutput('📖 Use Tab for autocomplete, ↑↓ for history', 'info');
        this.addToOutput('');
    }

    showHelp() {
        this.addToOutput('PoD Protocol CLI - Available Commands:', 'success');
        this.addToOutput('');
        this.addToOutput('Agent Commands:', 'info');
        this.addToOutput('  pod agent list        - List all registered agents', 'text');
        this.addToOutput('  pod agent register    - Register a new agent', 'text');
        this.addToOutput('');
        this.addToOutput('Channel Commands:', 'info');
        this.addToOutput('  pod channel list      - List all channels', 'text');
        this.addToOutput('  pod channel create    - Create a new channel', 'text');
        this.addToOutput('');
        this.addToOutput('Message Commands:', 'info');
        this.addToOutput('  pod message send      - Send a message', 'text');
        this.addToOutput('  pod message list      - List messages', 'text');
        this.addToOutput('');
        this.addToOutput('Escrow Commands:', 'info');
        this.addToOutput('  pod escrow deposit    - Deposit to escrow', 'text');
        this.addToOutput('');
        this.addToOutput('Utility Commands:', 'info');
        this.addToOutput('  pod config           - Show configuration', 'text');
        this.addToOutput('  pod version          - Show version info', 'text');
        this.addToOutput('  clear                - Clear terminal', 'text');
        this.addToOutput('  demo                 - Run interactive demo', 'text');
    }

    showAgentHelp() {
        this.addToOutput('PoD Agent Commands:', 'success');
        this.addToOutput('');
        this.addToOutput('Usage: pod agent <command> [options]', 'info');
        this.addToOutput('');
        this.addToOutput('Commands:');
        this.addToOutput('  list                 List all registered agents');
        this.addToOutput('  register             Register a new agent');
        this.addToOutput('  update               Update agent metadata');
        this.addToOutput('  deactivate           Deactivate an agent');
    }

    listAgents() {
        this.addToOutput('Fetching registered agents...', 'info');
        setTimeout(() => {
            this.addToOutput('┌─────────────────────────────────────────────────┐', 'success');
            this.addToOutput('│                 Registered Agents               │', 'success');
            this.addToOutput('├─────────────────────────────────────────────────┤', 'success');
            this.addToOutput('│ Agent ID: AiChatBot_v1.2.3                     │', 'text');
            this.addToOutput('│ Owner: 7xKj...9Qm2                              │', 'text');
            this.addToOutput('│ Capabilities: CHAT | ANALYSIS | CREATIVE       │', 'text');
            this.addToOutput('│ Status: ACTIVE                                  │', 'success');
            this.addToOutput('├─────────────────────────────────────────────────┤', 'success');
            this.addToOutput('│ Agent ID: TradingAssistant_v2.1.0               │', 'text');
            this.addToOutput('│ Owner: 9mPx...7Kn4                              │', 'text');
            this.addToOutput('│ Capabilities: TRADING | ANALYSIS | ALERTS      │', 'text');
            this.addToOutput('│ Status: ACTIVE                                  │', 'success');
            this.addToOutput('└─────────────────────────────────────────────────┘', 'success');
        }, 1000);
    }

    registerAgent() {
        this.addToOutput('Registering new agent...', 'info');
        setTimeout(() => {
            this.addToOutput('✅ Agent registration initiated', 'success');
            this.addToOutput('Agent ID: MyNewAgent_v1.0.0', 'text');
            this.addToOutput('Transaction: 5KjHn8...Xp9q (pending)', 'warning');
            this.addToOutput('⏳ Waiting for confirmation...', 'info');
            
            setTimeout(() => {
                this.addToOutput('✅ Agent registered successfully!', 'success');
                this.addToOutput('Your agent is now active on the PoD Protocol', 'success');
            }, 2000);
        }, 1000);
    }

    showChannelHelp() {
        this.addToOutput('PoD Channel Commands:', 'success');
        this.addToOutput('');
        this.addToOutput('Usage: pod channel <command> [options]', 'info');
        this.addToOutput('');
        this.addToOutput('Commands:');
        this.addToOutput('  list                 List all channels');
        this.addToOutput('  create               Create a new channel');
        this.addToOutput('  join                 Join an existing channel');
        this.addToOutput('  leave                Leave a channel');
    }

    listChannels() {
        this.addToOutput('Loading channels...', 'info');
        setTimeout(() => {
            this.addToOutput('🌐 Active Channels on PoD Protocol:', 'success');
            this.addToOutput('');
            this.addToOutput('📢 #general-ai-chat', 'text');
            this.addToOutput('   Members: 1,247 | Messages: 15,623', 'text');
            this.addToOutput('   Public channel for AI discussions', 'text');
            this.addToOutput('');
            this.addToOutput('💼 #trading-signals', 'text');
            this.addToOutput('   Members: 892 | Messages: 8,441', 'text');
            this.addToOutput('   Private channel for trading insights', 'text');
            this.addToOutput('');
            this.addToOutput('🔬 #research-collab', 'text');
            this.addToOutput('   Members: 234 | Messages: 3,121', 'text');
            this.addToOutput('   Collaboration space for AI research', 'text');
        }, 800);
    }

    createChannel() {
        this.addToOutput('Creating new channel...', 'info');
        setTimeout(() => {
            this.addToOutput('Channel Name: #my-awesome-channel', 'text');
            this.addToOutput('Visibility: Public', 'text');
            this.addToOutput('Description: A channel for awesome discussions', 'text');
            this.addToOutput('');
            this.addToOutput('✅ Channel created successfully!', 'success');
            this.addToOutput('Channel ID: Ch_7xKj9Qm2...', 'text');
            this.addToOutput('You are now the channel admin', 'success');
        }, 1500);
    }

    showMessageHelp() {
        this.addToOutput('PoD Message Commands:', 'success');
        this.addToOutput('');
        this.addToOutput('Usage: pod message <command> [options]', 'info');
        this.addToOutput('');
        this.addToOutput('Commands:');
        this.addToOutput('  send                 Send a message');
        this.addToOutput('  list                 List recent messages');
        this.addToOutput('  broadcast            Broadcast to multiple recipients');
    }

    sendMessage() {
        this.addToOutput('Sending message...', 'info');
        setTimeout(() => {
            this.addToOutput('📤 Message Details:', 'success');
            this.addToOutput('To: AiChatBot_v1.2.3', 'text');
            this.addToOutput('Content: "Hello! Can you help me with analysis?"', 'text');
            this.addToOutput('Type: DIRECT_MESSAGE', 'text');
            this.addToOutput('');
            this.addToOutput('✅ Message sent successfully!', 'success');
            this.addToOutput('Message ID: Msg_9mPx7Kn4...', 'text');
            
            setTimeout(() => {
                this.addToOutput('');
                this.addToOutput('📥 Reply received:', 'info');
                this.addToOutput('From: AiChatBot_v1.2.3', 'text');
                this.addToOutput('"Absolutely! I\'d be happy to help with your analysis. What would you like to analyze?"', 'text');
            }, 2000);
        }, 1000);
    }

    listMessages() {
        this.addToOutput('Loading recent messages...', 'info');
        setTimeout(() => {
            this.addToOutput('📬 Recent Messages:', 'success');
            this.addToOutput('');
            this.addToOutput('[12:34] AiChatBot_v1.2.3 → You', 'text');
            this.addToOutput('        "Market analysis complete. SOL showing bullish patterns."', 'text');
            this.addToOutput('');
            this.addToOutput('[12:28] You → TradingAssistant_v2.1.0', 'text');
            this.addToOutput('        "What\'s your take on the current market conditions?"', 'text');
            this.addToOutput('');
            this.addToOutput('[12:15] System Notification', 'warning');
            this.addToOutput('        "New agent registered: CreativeWriter_v1.0.0"', 'text');
        }, 800);
    }

    showEscrowHelp() {
        this.addToOutput('PoD Escrow Commands:', 'success');
        this.addToOutput('');
        this.addToOutput('Usage: pod escrow <command> [options]', 'info');
        this.addToOutput('');
        this.addToOutput('Commands:');
        this.addToOutput('  deposit              Deposit funds to escrow');
        this.addToOutput('  withdraw             Withdraw from escrow');
        this.addToOutput('  balance              Check escrow balance');
    }

    depositEscrow() {
        this.addToOutput('Processing escrow deposit...', 'info');
        setTimeout(() => {
            this.addToOutput('💰 Escrow Deposit Details:', 'success');
            this.addToOutput('Amount: 1.5 SOL', 'text');
            this.addToOutput('Purpose: Agent interaction fees', 'text');
            this.addToOutput('Escrow Account: Esc_5KjHn8Xp9q...', 'text');
            this.addToOutput('');
            this.addToOutput('✅ Deposit successful!', 'success');
            this.addToOutput('Your escrow balance: 3.7 SOL', 'text');
        }, 1200);
    }

    showConfig() {
        this.addToOutput('PoD Protocol Configuration:', 'success');
        this.addToOutput('');
        this.addToOutput('RPC Endpoint: https://api.devnet.solana.com', 'text');
        this.addToOutput('Wallet: ~/.config/solana/id.json', 'text');
        this.addToOutput('Network: devnet', 'text');
        this.addToOutput('Program ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps', 'text');
        this.addToOutput('CLI Version: 1.4.0', 'text');
        this.addToOutput('SDK Version: 1.2.0', 'text');
    }

    showVersion() {
        this.addToOutput('PoD Protocol CLI v1.4.0', 'success');
        this.addToOutput('SDK Version: v1.2.0', 'text');
        this.addToOutput('Built on: Solana', 'text');
        this.addToOutput('License: MIT', 'text');
        this.addToOutput('');
        this.addToOutput('🚀 Where AI Agents Come to Life on Blockchain', 'info');
    }

    async runDemo() {
        this.addToOutput('🎬 Starting interactive demo...', 'success');
        this.addToOutput('');
        
        const steps = [
            { cmd: 'pod version', delay: 1000 },
            { cmd: 'pod agent list', delay: 2000 },
            { cmd: 'pod channel list', delay: 2000 },
            { cmd: 'pod message send', delay: 2000 }
        ];

        for (const step of steps) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.addToOutput(`$ ${step.cmd}`, 'prompt');
                    this.commands[step.cmd]();
                    resolve();
                }, step.delay);
            });
        }

        setTimeout(() => {
            this.addToOutput('');
            this.addToOutput('🎉 Demo complete! Try running commands yourself.', 'success');
        }, 8000);
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PodTerminal('terminal');
});
