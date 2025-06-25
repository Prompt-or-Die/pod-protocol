<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PoD Protocol - Permissionless Oracle Data</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    
    <!-- New Branding Favicon -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23A78BFA%22><path d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-4 4h8v-1c0-1.33-2.67-2-4-2s-4 .67-4 2v1z%22/></svg>">

    <style>
        /* Custom Styles */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0A0A0F; /* Near-black background */
            color: #E2E8F0; /* Light gray text for readability */
        }

        .gradient-text {
            background: linear-gradient(90deg, #C4B5FD, #A78BFA, #8B5CF6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .hero-glow {
            box-shadow: 0 0 150px 20px rgba(139, 92, 246, 0.2);
        }

        .feature-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            background: rgba(167, 139, 250, 0.05);
            border: 1px solid rgba(167, 139, 250, 0.5);
        }

        /* Interactive Terminal Styles */
        .terminal-code {
            font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
        }

        .terminal-input {
            background: transparent;
            border: none;
            outline: none;
            color: #E2E8F0;
            width: 100%;
        }

        .terminal-prompt {
            white-space: nowrap;
        }

    </style>
</head>
<body class="antialiased">

    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-opacity-50 backdrop-blur-md border-b border-slate-200/5">
        <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
            <a href="#" class="text-2xl font-bold text-white flex items-center">
                <!-- New SVG Logo -->
                <svg class="w-8 h-8 mr-2 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,32H32A16,16,0,0,0,16,48V176a15.87,15.87,0,0,0,9.37,14.4,16,16,0,0,0,16-1.52L80,152h40a88.1,88.1,0,0,0,88-88V48A16,16,0,0,0,224,32Zm-8,96a72.08,72.08,0,0,1-72,72H88a15.87,15.87,0,0,0-9.37,3.12L40,227.2V48H216Z"></path></svg>
                PoD<span class="text-slate-400">Protocol</span>
            </a>
            <div class="hidden md:flex items-center space-x-8">
                <a href="#features" class="text-slate-300 hover:text-purple-400 transition-colors">Features</a>
                <a href="#how-it-works" class="text-slate-300 hover:text-purple-400 transition-colors">How It Works</a>
                <a href="https://github.com/dexploarer" target="_blank" class="text-slate-300 hover:text-purple-400 transition-colors">GitHub</a>
            </div>
            <a href="#get-started" class="hidden md:block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors">
                Get Started
            </a>
        </nav>
    </header>

    <main>
        <!-- Hero Section -->
        <section class="relative pt-32 pb-20 md:pt-48 md:pb-32 text-center overflow-hidden">
            <div class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(167,139,250,0.15),rgba(255,255,255,0))] hero-glow"></div>
            <div class="hero-bg-image" style="background-image: url('https://i.ibb.co/Ybf30X2/pod-figure.png');"></div>
            <div class="container mx-auto px-6">
                <h1 class="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-4">
                    Trustless Data for a <span class="gradient-text">Decentralized World</span>
                </h1>
                <p class="text-lg md:text-xl max-w-3xl mx-auto text-slate-300 mb-8">
                    PoD Protocol is a permissionless, decentralized oracle network delivering any real-world data to any blockchain, securely and reliably.
                </p>
                <div class="flex justify-center space-x-4">
                    <a href="#get-started" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-transform hover:scale-105">
                        Start Building
                    </a>
                    <a href="#" class="bg-slate-700/50 hover:bg-slate-700/80 border border-slate-600 text-white font-semibold px-8 py-3 rounded-lg transition-transform hover:scale-105">
                        Read Docs
                    </a>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="py-20">
            <div class="container mx-auto px-6">
                <div class="text-center mb-12">
                    <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-white">The Oracle Protocol Built for the Future</h2>
                    <p class="text-lg text-slate-400 mt-2 max-w-2xl mx-auto">Flexible, secure, and truly decentralized by design.</p>
                </div>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <!-- Feature Cards -->
                    <div class="feature-card p-8 rounded-xl">
                        <div class="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center mb-4"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 017.743-5.743z" /></svg></div>
                        <h3 class="text-xl font-bold text-white mb-2">Completely Permissionless</h3>
                        <p class="text-slate-400">Anyone can become a node operator or publish data feeds. No gatekeepers, no whitelisting.</p>
                    </div>
                    <div class="feature-card p-8 rounded-xl">
                        <div class="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center mb-4"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                        <h3 class="text-xl font-bold text-white mb-2">Cryptographically Secure</h3>
                        <p class="text-slate-400">Leverages economic incentives and staking to ensure data integrity and reward reliable nodes.</p>
                    </div>
                    <div class="feature-card p-8 rounded-xl">
                        <div class="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center mb-4"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div>
                        <h3 class="text-xl font-bold text-white mb-2">Bring Any Data On-Chain</h3>
                        <p class="text-slate-400">Connect to any external API. From crypto prices to weather data, if it's on an API, it can be on PoD.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- How It Works Section -->
        <section id="how-it-works" class="py-20 bg-slate-900/40">
            <div class="container mx-auto px-6">
                <div class="text-center mb-12">
                    <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-white">Simple, Powerful Architecture</h2>
                    <p class="text-lg text-slate-400 mt-2 max-w-2xl mx-auto">A three-step process to bridge the gap between blockchains and the real world.</p>
                </div>
                <div class="grid md:grid-cols-3 gap-8 text-center">
                     <!-- Steps -->
                    <div class="flex flex-col items-center"><div class="relative flex items-center justify-center w-24 h-24 bg-slate-800 border-2 border-purple-500 rounded-full text-3xl font-bold text-purple-400">1</div><h3 class="text-2xl font-bold mt-6 mb-2 text-white">Publish</h3><p class="text-slate-400 max-w-xs">Data providers publish feeds by specifying an API source and update conditions.</p></div>
                    <div class="flex flex-col items-center"><div class="relative flex items-center justify-center w-24 h-24 bg-slate-800 border-2 border-purple-500 rounded-full text-3xl font-bold text-purple-400">2</div><h3 class="text-2xl font-bold mt-6 mb-2 text-white">Validate</h3><p class="text-slate-400 max-w-xs">A decentralized network of nodes fetches data, reaches consensus, and stakes tokens to guarantee validity.</p></div>
                    <div class="flex flex-col items-center"><div class="relative flex items-center justify-center w-24 h-24 bg-slate-800 border-2 border-purple-500 rounded-full text-3xl font-bold text-purple-400">3</div><h3 class="text-2xl font-bold mt-6 mb-2 text-white">Consume</h3><p class="text-slate-400 max-w-xs">Smart contracts read verified, real-world data trustlessly, enabling powerful new dApps.</p></div>
                </div>
            </div>
        </section>

        <!-- Get Started Section (with Interactive Terminal) -->
        <section id="get-started" class="py-20">
            <div class="container mx-auto px-6">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-white">Ready to Dive In?</h2>
                        <p class="text-lg text-slate-400 mt-4 mb-8">
                            Getting started with the PoD Protocol is simple. Interact with our simulated command-line tool to see how you can publish a data feed or run a validation node.
                        </p>
                        <div class="space-y-4">
                           <a href="https://github.com/dexploarer" target="_blank" class="flex items-center p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg><div><h4 class="font-bold text-white">Explore the Code</h4><p class="text-slate-400">Check out the full source code on GitHub.</p></div></a>
                           <a href="#" class="flex items-center p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><div><h4 class="font-bold text-white">Read the Full Documentation</h4><p class="text-slate-400">Dive deep into the protocol architecture and API.</p></div></a>
                        </div>
                    </div>
                    
                    <!-- Interactive Terminal -->
                    <div id="terminal" class="bg-[#1E1E2E] p-4 rounded-lg shadow-2xl shadow-purple-500/10 border border-slate-700 h-96 flex flex-col" onclick="document.getElementById('terminal-input').focus()">
                        <div class="flex-shrink-0 flex items-center pb-2 border-b border-slate-700">
                            <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                        <div id="terminal-body" class="pt-2 terminal-code text-sm text-slate-300 overflow-y-auto flex-grow">
                            <div id="terminal-history"></div>
                            <div class="flex">
                                <span class="text-purple-400 terminal-prompt">➜&nbsp;</span>
                                <input type="text" id="terminal-input" class="terminal-input" autocomplete="off" autofocus>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800">
        <div class="container mx-auto px-6 py-8 text-center text-slate-400">
            <p>&copy; <span id="copyright-year"></span> PoD Protocol. All rights reserved.</p>
            <p class="mt-2">Maintained by <a href="https://github.com/dexploarer" target="_blank" class="text-purple-400 hover:underline">Dexploarer</a></p>
        </div>
    </footer>

    <script>
        // Set copyright year
        document.getElementById('copyright-year').textContent = new Date().getFullYear();

        // Interactive Terminal Logic
        const terminalInput = document.getElementById('terminal-input');
        const terminalHistory = document.getElementById('terminal-history');
        const terminalBody = document.getElementById('terminal-body');

        const commandResponses = {
            'help': `
<span class="text-white">PoD Protocol CLI - v1.0.0</span>
<span class="text-slate-400">Usage: pod-cli [command]</span>

<span class="text-white">Commands:</span>
  <span class="text-purple-400">publish</span>    Publish a new data feed
  <span class="text-purple-400">node</span>       Manage a validation node
  <span class="text-purple-400">stake</span>      Manage your node stake
  <span class="text-purple-400">clear</span>      Clear the terminal
  <span class="text-purple-400">help</span>       Display help information`,

            'publish': `
<span class="text-cyan-400">[INFO]</span> Submitting data feed to the network...
<span class="text-green-400">[SUCCESS]</span> Feed published! TxID: 0x123abc...def456`,

            'node': `
<span class="text-white">Node Status:</span> <span class="text-green-400">ONLINE</span>
<span class="text-white">Synced Block:</span> #1,234,567
<span class="text-white">Uptime:</span> 99.98%
<span class="text-white">Staked Amount:</span> 5,000 PoD`,

            'stake': `
<span class="text-cyan-400">[INFO]</span> Staking 1000 PoD to your node...
<span class="text-green-400">[SUCCESS]</span> Stake confirmed. New balance: 6,000 PoD`,
        };

        const welcomeMessage = `
<div class="mb-2">
    <p class="text-white">Welcome to the PoD Protocol interactive terminal.</p>
    <p class="text-slate-400">Type <span class="text-purple-400">'help'</span> to see a list of available commands.</p>
</div>
        `;
        terminalHistory.innerHTML = welcomeMessage;

        terminalInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const command = terminalInput.value.trim().toLowerCase().split(' ')[0];
                const fullCommand = terminalInput.value.trim();

                // Add command to history
                const commandElement = document.createElement('div');
                commandElement.innerHTML = `<span class="text-purple-400">➜&nbsp;</span><span>${fullCommand}</span>`;
                terminalHistory.appendChild(commandElement);
                
                terminalInput.value = '';

                // Handle command and get response
                const responseElement = document.createElement('div');
                responseElement.classList.add('mb-2');
                
                if (command === 'clear') {
                    terminalHistory.innerHTML = '';
                } else if (commandResponses[command]) {
                    responseElement.innerHTML = commandResponses[command];
                    terminalHistory.appendChild(responseElement);
                } else if (command !== '') {
                    responseElement.innerHTML = `<span class="text-red-400">command not found: ${command}</span>`;
                    terminalHistory.appendChild(responseElement);
                }

                // Scroll to the bottom
                terminalBody.scrollTop = terminalBody.scrollHeight;
            }
        });
    </script>
</body>
</html>
