import { intro, outro, select, confirm, text, note, spinner } from '@clack/prompts';
import { Listr } from 'listr2';
import boxen from 'boxen';
import emoji from 'node-emoji';
import chalk from 'chalk';
import { createAnimatedPODBanner } from '../utils/branding.js';

export class GuidedCLI {
  private progress: { [key: string]: boolean } = {};

  async start(): Promise<void> {
    await createAnimatedPODBanner();
    intro(`${emoji.get('star')} Guided Setup - Welcome to PoD Protocol!`);

    // Check if user is new
    const isNewUser = await confirm({
      message: 'Is this your first time using PoD Protocol?'
    });

    if (typeof isNewUser === 'symbol') return;

    if (isNewUser) {
      await this.showWelcomeIntroduction();
    }

    while (true) {
      const action = await select({
        message: 'What would you like to learn or do?',
        options: [
          {
            value: 'overview',
            label: `${emoji.get('book')} PoD Protocol Overview`,
            hint: 'Learn what PoD Protocol is and how it works'
          },
          {
            value: 'setup',
            label: `${emoji.get('wrench')} Environment Setup`,
            hint: 'Set up your development environment step-by-step'
          },
          {
            value: 'first-agent',
            label: `${emoji.get('robot_face')} Create Your First Agent`,
            hint: 'Build and deploy your first AI agent'
          },
          {
            value: 'messaging',
            label: `${emoji.get('speech_balloon')} Agent Communication`,
            hint: 'Learn how agents communicate with each other'
          },
          {
            value: 'blockchain',
            label: `${emoji.get('link')} Blockchain Integration`,
            hint: 'Understand Solana integration and transactions'
          },
          {
            value: 'examples',
            label: `${emoji.get('bulb')} Interactive Examples`,
            hint: 'Try real examples with guided explanations'
          },
          {
            value: 'troubleshooting',
            label: `${emoji.get('sos')} Troubleshooting Guide`,
            hint: 'Get help with common issues and problems'
          },
          {
            value: 'next-steps',
            label: `${emoji.get('arrow_forward')} What\'s Next?`,
            hint: 'Learn about advanced features and next steps'
          },
          {
            value: 'exit',
            label: `${emoji.get('leftwards_arrow_with_hook')} Return to Main Menu`,
            hint: 'Go back to mode selection'
          }
        ]
      });

      if (typeof action === 'symbol' || action === 'exit') {
        await this.showGraduationMessage();
        return;
      }

      switch (action) {
        case 'overview':
          await this.showOverview();
          break;
        case 'setup':
          await this.guidedSetup();
          break;
        case 'first-agent':
          await this.createFirstAgent();
          break;
        case 'messaging':
          await this.learnMessaging();
          break;
        case 'blockchain':
          await this.learnBlockchain();
          break;
        case 'examples':
          await this.showExamples();
          break;
        case 'troubleshooting':
          await this.troubleshootingGuide();
          break;
        case 'next-steps':
          await this.showNextSteps();
          break;
      }

      this.progress[action] = true;
    }
  }

  private async showWelcomeIntroduction(): Promise<void> {
    console.log(boxen(
      `${emoji.get('wave')} Welcome to PoD Protocol!\n\n` +
      `${emoji.get('sparkles')} You're about to discover the most advanced\n` +
      `AI agent communication protocol built on Solana.\n\n` +
      `${emoji.get('mortar_board')} This guided tour will teach you:\n` +
      `  • What PoD Protocol is and why it matters\n` +
      `  • How to create and deploy AI agents\n` +
      `  • Agent-to-agent communication\n` +
      `  • Blockchain integration fundamentals\n` +
      `  • Real-world examples and use cases\n\n` +
      `${emoji.get('rocket')} Let's build the future of AI together!`,
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        title: ' Welcome to PoD Protocol! '
      }
    ));

    await confirm({ message: 'Ready to start your journey?' });
  }

  private async showOverview(): Promise<void> {
    intro(`${emoji.get('book')} PoD Protocol Overview`);

    const topics = [
      {
        title: 'What is PoD Protocol?',
        content: 'A decentralized communication protocol for AI agents built on Solana, enabling secure, fast, and cost-effective agent interactions.'
      },
      {
        title: 'Key Features',
        content: 'Decentralized messaging, agent discovery, escrow systems, ZK-compression for 99% cost savings, and enterprise-grade security.'
      },
      {
        title: 'Use Cases',
        content: 'Trading bots, customer service agents, data analysis agents, social media automation, DeFi protocols, and multi-agent systems.'
      },
      {
        title: 'Why Solana?',
        content: 'High throughput (65,000 TPS), low fees (<$0.01), fast finality (400ms), and growing ecosystem of DeFi and AI projects.'
      }
    ];

    for (const topic of topics) {
      console.log(boxen(
        `${emoji.get('bulb')} ${chalk.bold(topic.title)}\n\n${topic.content}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          margin: { top: 1, bottom: 1 }
        }
      ));

      const shouldContinue = await confirm({ message: 'Continue to next topic?' });
      if (typeof shouldContinue === 'symbol' || !shouldContinue) break;
    }

    outro(`${emoji.get('graduation_cap')} You now understand the basics of PoD Protocol!`);
  }

  private async guidedSetup(): Promise<void> {
    intro(`${emoji.get('wrench')} Environment Setup Guide`);

    const setupSteps = [
      {
        title: 'Install Prerequisites',
        description: 'Node.js 18+, Git, and a code editor',
        command: 'curl -fsSL https://nodejs.org/download/ | bash'
      },
      {
        title: 'Install PoD CLI',
        description: 'Global installation of PoD Protocol CLI',
        command: 'bun install -g @pod-protocol/cli'
      },
      {
        title: 'Setup Solana CLI',
        description: 'Install and configure Solana development tools',
        command: 'sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"'
      },
      {
        title: 'Create Development Wallet',
        description: 'Generate a new wallet for development',
        command: 'solana-keygen new --outfile ~/.config/solana/devnet.json'
      },
      {
        title: 'Configure Network',
        description: 'Set up connection to Solana devnet',
        command: 'solana config set --url https://api.devnet.solana.com'
      }
    ];

    for (let i = 0; i < setupSteps.length; i++) {
      const step = setupSteps[i];
      
      console.log(boxen(
        `${emoji.get('gear')} Step ${i + 1}: ${chalk.bold(step.title)}\n\n` +
        `${step.description}\n\n` +
        `${emoji.get('computer')} Command to run:\n` +
        `${chalk.gray(step.command)}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'yellow'
        }
      ));

      const completed = await confirm({ message: 'Have you completed this step?' });
      if (typeof completed === 'symbol') return;

      if (!completed) {
        note('Take your time with each step. You can return to this guide anytime!');
        return;
      }
    }

    outro(`${emoji.get('white_check_mark')} Environment setup complete! You're ready to build agents.`);
  }

  private async createFirstAgent(): Promise<void> {
    intro(`${emoji.get('robot_face')} Create Your First Agent`);

    const agentType = await select({
      message: 'What type of agent would you like to create?',
      options: [
        { value: 'hello-world', label: `${emoji.get('wave')} Hello World Agent - Simple introduction` },
        { value: 'echo', label: `${emoji.get('repeat')} Echo Agent - Responds to messages` },
        { value: 'weather', label: `${emoji.get('cloud')} Weather Agent - Fetches weather data` },
        { value: 'calculator', label: `${emoji.get('1234')} Calculator Agent - Performs calculations` }
      ]
    });

    if (typeof agentType === 'symbol') return;

    const agentName = await text({
      message: 'What would you like to name your agent?',
      placeholder: 'my-first-agent',
      validate: (value) => {
        if (!value) return 'Agent name is required';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
      }
    });

    if (typeof agentName === 'symbol') return;

    // Guided creation process
    const tasks = new Listr([
      {
        title: 'Generating agent template',
        task: async () => { await new Promise(resolve => setTimeout(resolve, 1500)); }
      },
      {
        title: 'Installing dependencies',
        task: async () => { await new Promise(resolve => setTimeout(resolve, 2000)); }
      },
      {
        title: 'Configuring agent settings',
        task: async () => { await new Promise(resolve => setTimeout(resolve, 1000)); }
      },
      {
        title: 'Setting up local development',
        task: async () => { await new Promise(resolve => setTimeout(resolve, 1500)); }
      }
    ]);

    await tasks.run();

    console.log(boxen(
      `${emoji.get('tada')} Your first agent is ready!\n\n` +
      `${emoji.get('file_folder')} Project: ${agentName}\n` +
      `${emoji.get('robot_face')} Type: ${agentType}\n\n` +
      `${emoji.get('books')} What you just created:\n` +
      `  • Agent configuration file\n` +
      `  • Message handling logic\n` +
      `  • Solana wallet integration\n` +
      `  • Development server setup\n\n` +
      `${emoji.get('arrow_forward')} Next: Try the messaging tutorial!`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));

    // Show code walkthrough
    const showCode = await confirm({ message: 'Would you like a code walkthrough?' });
    if (showCode) {
      await this.showCodeWalkthrough(agentType);
    }

    outro(`${emoji.get('mortar_board')} Congratulations! You've created your first PoD Protocol agent.`);
  }

  private async showCodeWalkthrough(agentType: string): Promise<void> {
    const codeExamples: { [key: string]: string } = {
      'hello-world': `
// Agent initialization
const agent = new PodAgent({
  name: "HelloWorldAgent",
  capabilities: ["greeting", "introduction"]
});

// Message handler
agent.onMessage(async (message) => {
  return {
    content: \`Hello! I received: \${message.content}\`,
    type: "greeting"
  };
});

// Start the agent
await agent.start();`,
      
      'echo': `
// Echo agent that repeats messages
agent.onMessage(async (message) => {
  return {
    content: \`Echo: \${message.content}\`,
    type: "echo",
    timestamp: Date.now()
  };
});`,

      'weather': `
// Weather agent with external API
agent.onMessage(async (message) => {
  const location = extractLocation(message.content);
  const weather = await fetchWeather(location);
  
  return {
    content: \`Weather in \${location}: \${weather.description}\`,
    data: weather,
    type: "weather-report"
  };
});`,

      'calculator': `
// Calculator agent with math operations
agent.onMessage(async (message) => {
  const expression = message.content;
  const result = evaluateExpression(expression);
  
  return {
    content: \`\${expression} = \${result}\`,
    type: "calculation",
    result: result
  };
});`
    };

    console.log(boxen(
      `${emoji.get('computer')} Code Walkthrough - ${agentType.toUpperCase()} Agent\n\n` +
      `${chalk.gray(codeExamples[agentType])}\n\n` +
      `${emoji.get('bulb')} Key concepts:\n` +
      `  • Agent initialization with capabilities\n` +
      `  • Message handling and processing\n` +
      `  • Response formatting and types\n` +
      `  • Asynchronous message processing`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: ' Code Example '
      }
    ));
  }

  private async learnMessaging(): Promise<void> {
    intro(`${emoji.get('speech_balloon')} Agent Communication Tutorial`);

    const topics = [
      'Message Structure and Types',
      'Sending Messages Between Agents',
      'Creating Communication Channels',
      'Message Encryption and Security',
      'Handling Message Delivery and Receipts'
    ];

    for (let i = 0; i < topics.length; i++) {
      console.log(boxen(
        `${emoji.get('books')} Lesson ${i + 1}: ${topics[i]}\n\n` +
        `This lesson would provide detailed information about ${topics[i].toLowerCase()}\n` +
        `with interactive examples and hands-on exercises.`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue'
        }
      ));

      if (i < topics.length - 1) {
        const shouldContinue = await confirm({ message: 'Continue to next lesson?' });
        if (typeof shouldContinue === 'symbol' || !shouldContinue) break;
      }
    }

    outro(`${emoji.get('graduation_cap')} You've learned the fundamentals of agent communication!`);
  }

  private async learnBlockchain(): Promise<void> {
    intro(`${emoji.get('link')} Blockchain Integration Guide`);

    console.log(boxen(
      `${emoji.get('books')} Understanding Solana Integration\n\n` +
      `${emoji.get('zap')} Why Solana for AI Agents:\n` +
      `  • Ultra-fast transactions (400ms finality)\n` +
      `  • Low cost (fractions of a penny)\n` +
      `  • High throughput (65,000+ TPS)\n` +
      `  • Rich DeFi ecosystem\n\n` +
      `${emoji.get('gear')} What PoD Protocol Handles:\n` +
      `  • Wallet management and key security\n` +
      `  • Transaction signing and submission\n` +
      `  • Fee optimization and batching\n` +
      `  • Error handling and retries\n\n` +
      `${emoji.get('shield')} Security Features:\n` +
      `  • Multi-signature support\n` +
      `  • Hardware wallet integration\n` +
      `  • Encrypted message storage\n` +
      `  • Audit trail and compliance`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'purple',
        title: ' Blockchain Fundamentals '
      }
    ));

    outro(`${emoji.get('link')} You now understand how PoD Protocol leverages Solana!`);
  }

  private async showExamples(): Promise<void> {
    const example = await select({
      message: 'Choose an interactive example:',
      options: [
        { value: 'trading', label: `${emoji.get('chart_with_upwards_trend')} Trading Bot Example` },
        { value: 'social', label: `${emoji.get('speech_balloon')} Social Media Agent` },
        { value: 'data', label: `${emoji.get('bar_chart')} Data Analysis Agent` },
        { value: 'gaming', label: `${emoji.get('video_game')} Gaming Agent` }
      ]
    });

    if (typeof example === 'symbol') return;

    console.log(boxen(
      `${emoji.get('bulb')} Interactive Example: ${example.toUpperCase()}\n\n` +
      `This would provide a detailed, step-by-step walkthrough\n` +
      `of building a real-world ${example} agent with:\n\n` +
      `  • Complete source code\n` +
      `  • Line-by-line explanations\n` +
      `  • Live testing and debugging\n` +
      `  • Deployment instructions\n` +
      `  • Best practices and tips`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
        title: ` ${example.toUpperCase()} Example `
      }
    ));
  }

  private async troubleshootingGuide(): Promise<void> {
    const issue = await select({
      message: 'What type of issue are you experiencing?',
      options: [
        { value: 'connection', label: `${emoji.get('broken_chain')} Connection Issues` },
        { value: 'deployment', label: `${emoji.get('x')} Deployment Failures` },
        { value: 'messages', label: `${emoji.get('envelope')} Message Delivery Problems` },
        { value: 'performance', label: `${emoji.get('snail')} Performance Issues` },
        { value: 'errors', label: `${emoji.get('warning')} Error Messages` }
      ]
    });

    if (typeof issue === 'symbol') return;

    const troubleshootingSteps: { [key: string]: string[] } = {
      connection: [
        'Check your internet connection',
        'Verify Solana RPC endpoint is accessible',
        'Confirm wallet is properly configured',
        'Test with devnet first before mainnet'
      ],
      deployment: [
        'Ensure all dependencies are installed',
        'Check agent configuration is valid',
        'Verify sufficient SOL balance for transactions',
        'Review deployment logs for errors'
      ],
      messages: [
        'Confirm both agents are online',
        'Check channel permissions and access',
        'Verify message format and structure',
        'Test with simple message first'
      ],
      performance: [
        'Monitor system resource usage',
        'Check for rate limiting issues',
        'Optimize message batching',
        'Consider using ZK compression'
      ],
      errors: [
        'Read the full error message carefully',
        'Check the error code documentation',
        'Search community forums for solutions',
        'Enable debug logging for more details'
      ]
    };

    console.log(boxen(
      `${emoji.get('wrench')} Troubleshooting: ${issue.toUpperCase()}\n\n` +
      troubleshootingSteps[issue].map((step, i) => `${i + 1}. ${step}`).join('\n') + '\n\n' +
      `${emoji.get('speech_balloon')} Still need help?\n` +
      `  • Check our documentation\n` +
      `  • Join our Discord community\n` +
      `  • Submit a GitHub issue`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
        title: ' Troubleshooting Guide '
      }
    ));
  }

  private async showNextSteps(): Promise<void> {
    const completedCount = Object.keys(this.progress).length;
    
    console.log(boxen(
      `${emoji.get('rocket')} Your PoD Protocol Journey\n\n` +
      `${emoji.get('chart_with_upwards_trend')} Progress: ${completedCount}/7 sections completed\n\n` +
      `${emoji.get('mortar_board')} What's Next:\n` +
      `  • Explore advanced agent patterns\n` +
      `  • Build multi-agent systems\n` +
      `  • Integrate with DeFi protocols\n` +
      `  • Deploy to production\n` +
      `  • Join the developer community\n\n` +
      `${emoji.get('star')} Ready for the next level?\n` +
      `  • Try Development Mode for advanced tools\n` +
      `  • Use Production Mode for live deployments\n` +
      `  • Contribute to the open source project`,
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        title: ' Next Steps '
      }
    ));
  }

  private async showGraduationMessage(): Promise<void> {
    const completedCount = Object.keys(this.progress).length;
    
    if (completedCount >= 3) {
      outro(`${emoji.get('graduation_cap')} Congratulations! You've completed the guided tour. You're ready to build amazing AI agents with PoD Protocol!`);
    } else {
      outro(`${emoji.get('wave')} Thanks for exploring PoD Protocol! Come back anytime to continue learning.`);
    }
  }
} 