import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { 
  showBanner, 
  showPromptOrDieBanner, 
  BRAND_COLORS, 
  ICONS, 
  DECORATIVE_ELEMENTS,
  BannerSize 
} from "../utils/branding.js";
import { errorHandler } from "../utils/enhanced-error-handler.js";

const execAsync = promisify(exec);

interface CreateOptions {
  name?: string;
  template?: 'agent' | 'dapp' | 'protocol' | 'minimal';
  interactive?: boolean;
  typescript?: boolean;
  agents?: boolean;
  frontend?: boolean;
  skipInstall?: boolean;
}

export class CreateCommands {
  public register(program: Command): void {
    const create = program
      .command("create")
      .description(`${ICONS.rocket} Create new PoD Protocol projects`);

    this.setupProjectCommand(create);
    this.setupAgentCommand(create);
    this.setupTemplateCommand(create);
  }

  private setupProjectCommand(create: Command): void {
    create
      .command("project [name]")
      .alias("new")
      .description(`${ICONS.star} Create a new PoD Protocol project`)
      .option("-t, --template <template>", "Project template (agent|dapp|protocol|minimal)", "minimal")
      .option("-i, --interactive", "Interactive project setup")
      .option("--typescript", "Use TypeScript", true)
      .option("--agents", "Include AI agent framework")
      .option("--frontend", "Include frontend application")
      .option("--skip-install", "Skip dependency installation")
      .action(async (name: string, options: CreateOptions) => {
        try {
          await this.handleCreateProject(name, options);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupAgentCommand(create: Command): void {
    create
      .command("agent <name>")
      .description(`${ICONS.agent} Create a new AI agent`)
      .option("-c, --capabilities <capabilities>", "Agent capabilities (comma-separated)")
      .option("-t, --template <template>", "Agent template", "basic")
      .action(async (name: string, options: { capabilities?: string; template?: string }) => {
        try {
          await this.handleCreateAgent(name, options);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupTemplateCommand(create: Command): void {
    create
      .command("template")
      .description(`${ICONS.star} List available project templates`)
      .action(async () => {
        try {
          await this.handleListTemplates();
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private async handleCreateProject(projectName: string, options: CreateOptions): Promise<void> {
    console.clear();
    showBanner(BannerSize.COMPACT);
    
    console.log(BRAND_COLORS.accent("🚀 PoD Protocol Project Generator"));
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log();

    let name = projectName;
    let config = options;

    if (options.interactive || !name) {
      const result = await this.runProjectWizard(name, options);
      name = result.name;
      config = result.config;
    }

    if (!name) {
      throw new Error('Project name is required');
    }

    // Validate and sanitize project name
    const sanitizedName = this.sanitizeProjectName(name);
    
    console.log(BRAND_COLORS.info(`📦 Creating PoD Protocol project: ${BRAND_COLORS.accent(sanitizedName)}`));
    console.log();

    // Create project directory
    await this.createProjectStructure(sanitizedName, config);
    
    // Generate project files
    await this.generateProjectFiles(sanitizedName, config);
    
    // Install dependencies
    if (!config.skipInstall) {
      await this.installProjectDependencies(sanitizedName);
    }

    // Show success message
    await this.showProjectCreatedMessage(sanitizedName, config);
  }

  private async runProjectWizard(initialName?: string, options: CreateOptions = {}): Promise<{ name: string; config: CreateOptions }> {
    console.log(BRAND_COLORS.info("🧙‍♂️ PoD Project Setup Wizard"));
    console.log();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: initialName || 'my-pod-project',
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/i.test(input)) return 'Project name can only contain letters, numbers, hyphens, and underscores';
          return true;
        }
      },
      {
        type: 'list',
        name: 'template',
        message: 'Select project template:',
        choices: [
          { name: '🤖 AI Agent - Complete agent development environment', value: 'agent' },
          { name: '🌐 DApp - Decentralized application with frontend', value: 'dapp' },
          { name: '⚡ Protocol - Full protocol with contracts and SDKs', value: 'protocol' },
          { name: '📦 Minimal - Basic PoD Protocol setup', value: 'minimal' }
        ],
        default: options.template || 'minimal'
      },
      {
        type: 'confirm',
        name: 'typescript',
        message: 'Use TypeScript?',
        default: options.typescript !== false
      },
      {
        type: 'confirm',
        name: 'agents',
        message: 'Include AI agent framework?',
        default: options.agents || false,
        when: (answers: any) => answers.template !== 'agent'
      },
      {
        type: 'confirm',
        name: 'frontend',
        message: 'Include frontend application?',
        default: options.frontend || false,
        when: (answers: any) => answers.template === 'dapp' || answers.template === 'protocol'
      }
    ]);

    return {
      name: answers.name,
      config: {
        ...options,
        template: answers.template,
        typescript: answers.typescript,
        agents: answers.agents || answers.template === 'agent',
        frontend: answers.frontend || answers.template === 'dapp' || answers.template === 'protocol'
      }
    };
  }

  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  private async createProjectStructure(name: string, config: CreateOptions): Promise<void> {
    const spinner = ora('Creating project structure...').start();

    try {
      // Create main project directory
      mkdirSync(name, { recursive: true });

      // Create standard directories
      const dirs = [
        'src',
        'tests',
        'docs',
        'scripts'
      ];

      if (config.template === 'protocol' || config.template === 'dapp') {
        dirs.push('programs', 'programs/pod-protocol');
      }

      if (config.agents) {
        dirs.push('agents', 'agents/templates', 'agents/examples');
      }

      if (config.frontend) {
        dirs.push('app', 'app/src', 'app/components', 'app/pages');
      }

      for (const dir of dirs) {
        mkdirSync(join(name, dir), { recursive: true });
      }

      spinner.succeed('Project structure created');
    } catch (error) {
      spinner.fail('Failed to create project structure');
      throw error;
    }
  }

  private async generateProjectFiles(name: string, config: CreateOptions): Promise<void> {
    const spinner = ora('Generating project files...').start();

    try {
      // Generate package.json
      await this.generatePackageJson(name, config);
      
      // Generate Anchor.toml if needed
      if (config.template === 'protocol' || config.template === 'dapp') {
        await this.generateAnchorToml(name, config);
      }

      // Generate README.md
      await this.generateReadme(name, config);

      // Generate source files
      await this.generateSourceFiles(name, config);

      // Generate configuration files
      await this.generateConfigFiles(name, config);

      // Generate agent templates if needed
      if (config.agents) {
        await this.generateAgentTemplates(name, config);
      }

      // Generate frontend if needed
      if (config.frontend) {
        await this.generateFrontendFiles(name, config);
      }

      spinner.succeed('Project files generated');
    } catch (error) {
      spinner.fail('Failed to generate project files');
      throw error;
    }
  }

  private async generatePackageJson(name: string, config: CreateOptions): Promise<void> {
    const packageJson: any = {
      name: name,
      version: "0.1.0",
      description: `PoD Protocol project: ${name}`,
      type: "module",
      main: config.typescript ? "dist/index.js" : "src/index.js",
      scripts: {
        "build": config.typescript ? "tsc" : "echo 'No build step needed'",
        "dev": config.typescript ? "tsx src/index.ts" : "node src/index.js",
        "test": "bun test",
        "lint": "eslint src --ext .ts,.js",
        "lint:fix": "eslint src --ext .ts,.js --fix"
      },
      keywords: [
        "pod-protocol",
        "solana",
        "ai-agents",
        "blockchain",
        "web3"
      ],
      author: "",
      license: "MIT",
      dependencies: {
        "@pod-protocol/sdk": "^1.5.0",
        "@solana/web3.js": "^1.98.2"
      },
      devDependencies: {}
    };

    if (config.typescript) {
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        "typescript": "^5.8.3",
        "tsx": "^4.20.3",
        "@types/node": "^24.0.3"
      };
    }

    if (config.template === 'protocol' || config.template === 'dapp') {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        "@coral-xyz/anchor": "0.31.1"
      };
      
      packageJson.scripts = {
        ...packageJson.scripts,
        "anchor:build": "anchor build",
        "anchor:deploy": "anchor deploy",
        "anchor:test": "anchor test"
      };
    }

    if (config.agents) {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        "openai": "^4.0.0",
        "anthropic": "^0.20.0"
      };
    }

    if (config.frontend) {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        "next": "^15.3.4",
        "react": "^19.1.0",
        "react-dom": "^19.1.0",
        "@solana/wallet-adapter-base": "^0.9.27",
        "@solana/wallet-adapter-react": "^0.15.35"
      };

      packageJson.scripts = {
        ...packageJson.scripts,
        "build": "next build",
        "dev": "next dev", 
        "test": "jest",
        "lint": "eslint .",
        "lint:fix": "eslint . --fix"
      };
    }

    writeFileSync(
      join(name, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async generateAnchorToml(name: string, config: CreateOptions): Promise<void> {
    const anchorToml = `[toolchain]
package_manager = "bun"

[features]
resolution = true
skip-lint = false

[programs.localnet]
${this.toProgramName(name)} = "11111111111111111111111111111111"

[programs.devnet]
${this.toProgramName(name)} = "11111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "bun run test"

[solana]
enable_bpf_loader = true
enable_deploy = true
`;

    writeFileSync(join(name, 'Anchor.toml'), anchorToml);
  }

  private async generateReadme(name: string, config: CreateOptions): Promise<void> {
    const readme = `# ${name}

PoD Protocol project generated with the PoD CLI.

## 🚀 PoD Protocol Project

This project uses the PoD Protocol (Prompt or Die) - The Ultimate AI Agent Communication Protocol on Solana.

### Features

${config.agents ? '- 🤖 AI Agent Framework\n' : ''}${config.frontend ? '- 🌐 Frontend Application\n' : ''}${config.template === 'protocol' ? '- ⚡ Full Protocol Implementation\n' : ''}${config.typescript ? '- 🔷 TypeScript Support\n' : ''}
## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- Solana CLI >= 1.17.0
${config.template === 'protocol' || config.template === 'dapp' ? '- Anchor CLI >= 0.31.1\n' : ''}
### Installation

\`\`\`bash
# Install dependencies
bun install

# Build the project
${config.typescript ? 'bun run build' : 'echo "No build step needed"'}

# Run development server
bun run dev
\`\`\`

${config.template === 'protocol' || config.template === 'dapp' ? `
### Anchor Commands

\`\`\`bash
# Build the program
bun run anchor:build

# Deploy to devnet
bun run anchor:deploy

# Run tests
bun run anchor:test
\`\`\`
` : ''}

${config.frontend ? `
### Frontend

\`\`\`bash
# Start frontend development server
bun run frontend:dev

# Build frontend for production
bun run frontend:build
\`\`\`
` : ''}

## 📚 Documentation

- [PoD Protocol Documentation](https://github.com/Dexploarer/PoD-Protocol/tree/main/docs)
- [Solana Documentation](https://docs.solana.com/)
${config.template === 'protocol' || config.template === 'dapp' ? '- [Anchor Documentation](https://www.anchor-lang.com/)\n' : ''}
## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using PoD Protocol
*Where AI agents meet their destiny*
`;

    writeFileSync(join(name, 'README.md'), readme);
  }

  private async generateSourceFiles(name: string, config: CreateOptions): Promise<void> {
    const ext = config.typescript ? 'ts' : 'js';
    
    const indexFile = `${config.typescript ? 'import { PodClient } from "@pod-protocol/sdk";\n\n' : 'const { PodClient } = require("@pod-protocol/sdk");\n\n'}/**
 * ${name} - PoD Protocol Project
 * Generated by PoD CLI
 */

console.log("🚀 Welcome to ${name}!");
console.log("⚡ PoD Protocol - Where AI agents meet their destiny");

async function main() {
  // Initialize PoD Protocol client
  const client = new PodClient({
    network: 'devnet'
  });

  console.log("✅ PoD Protocol client initialized");
  
  // Your application logic here
  console.log("🎯 Ready to build something amazing!");
}

main().catch(console.error);
`;

    writeFileSync(join(name, `src/index.${ext}`), indexFile);

    // Generate TypeScript config if needed
    if (config.typescript) {
      const tsConfig = {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          strict: true,
          skipLibCheck: true,
          outDir: "./dist",
          declaration: true,
          declarationMap: true,
          sourceMap: true
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist", "tests"]
      };

      writeFileSync(
        join(name, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );
    }
  }

  private async generateConfigFiles(name: string, config: CreateOptions): Promise<void> {
    // Generate .gitignore
    const gitignore = `# Dependencies
node_modules/
.yarn/

# Build outputs
dist/
target/
.next/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Solana
test-ledger/

# Anchor
.anchor/
`;

    writeFileSync(join(name, '.gitignore'), gitignore);

    // Generate environment template
    const envExample = `# PoD Protocol Configuration
POD_NETWORK=devnet
POD_CLUSTER_URL=https://api.devnet.solana.com

# Solana Configuration
SOLANA_PRIVATE_KEY=
ANCHOR_WALLET=~/.config/solana/id.json

${config.agents ? `
# AI Agent Configuration
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
` : ''}${config.frontend ? `
# Frontend Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_CLUSTER_URL=https://api.devnet.solana.com
` : ''}`;

    writeFileSync(join(name, '.env.example'), envExample);
  }

  private async generateAgentTemplates(name: string, config: CreateOptions): Promise<void> {
    const ext = config.typescript ? 'ts' : 'js';
    
    const agentTemplate = `${config.typescript ? 'import { PodClient } from "@pod-protocol/sdk";\n\n' : 'const { PodClient } = require("@pod-protocol/sdk");\n\n'}/**
 * PoD Protocol AI Agent Template
 * Project: ${name}
 */

export class PodAgent {
  constructor(capabilities${config.typescript ? ': string[]' : ''}) {
    this.capabilities = capabilities;
    this.client = new PodClient({ network: 'devnet' });
    this.isInitialized = false;
  }

  async initialize() {
    console.log('🤖 PoD Agent initializing...');
    
    // Initialize PoD Protocol connection
    await this.client.connect();
    
    this.isInitialized = true;
    console.log('✅ PoD Agent ready for action!');
  }

  async processMessage(message${config.typescript ? ': string' : ''}) {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log(\`📨 Processing message: \${message}\`);
    
    // Your AI agent logic here
    const response = \`Agent processed: \${message}\`;
    
    console.log(\`📤 Agent response: \${response}\`);
    return response;
  }

  async sendMessage(channelId${config.typescript ? ': string' : ''}, message${config.typescript ? ': string' : ''}) {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Send message through PoD Protocol
    const result = await this.client.sendMessage(channelId, message);
    console.log(\`✅ Message sent via PoD Protocol\`);
    return result;
  }
}

// Usage example
async function main() {
  const agent = new PodAgent(['communication', 'analysis']);
  await agent.initialize();
  
  const response = await agent.processMessage('Hello, PoD Protocol!');
  console.log('Agent response:', response);
}

if (require.main === module) {
  main().catch(console.error);
}
`;

    writeFileSync(join(name, `agents/templates/PodAgent.${ext}`), agentTemplate);
  }

  private async generateFrontendFiles(name: string, config: CreateOptions): Promise<void> {
    // Generate Next.js configuration
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
`;

    writeFileSync(join(name, 'app/next.config.js'), nextConfig);

    // Generate basic React page
    const appPage = `'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize PoD Protocol connection
    console.log('🚀 PoD Protocol DApp Loading...');
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🚀 ${name}
        </h1>
        <p className="text-xl mb-8">
          PoD Protocol - Where AI agents meet their destiny
        </p>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            ⚡ PoD Protocol DApp
          </h2>
          <p className="mb-4">
            This is your PoD Protocol decentralized application.
          </p>
          <button 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            onClick={() => setIsConnected(!isConnected)}
          >
            {isConnected ? '✅ Connected' : '🔌 Connect Wallet'}
          </button>
        </div>
      </div>
    </main>
  );
}
`;

    writeFileSync(join(name, 'app/src/page.tsx'), appPage);

    // Generate app layout
    const layout = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${name} - PoD Protocol',
  description: 'PoD Protocol DApp - Where AI agents meet their destiny',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
`;

    writeFileSync(join(name, 'app/src/layout.tsx'), layout);
  }

  private async installProjectDependencies(name: string): Promise<void> {
    const spinner = ora('Installing dependencies...').start();

    try {
      await this.executeCommand(`cd ${name} && bun install`);
      spinner.succeed('Dependencies installed successfully');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      throw error;
    }
  }

  private async showProjectCreatedMessage(name: string, config: CreateOptions): Promise<void> {
    console.log();
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log(BRAND_COLORS.success("🎉 PoD Protocol Project Created Successfully!"));
    console.log();
    
    console.log(BRAND_COLORS.accent("📁 Project Details:"));
    console.log(`   ${ICONS.star} Name: ${BRAND_COLORS.info(name)}`);
    console.log(`   ${ICONS.gear} Template: ${BRAND_COLORS.info(config.template || 'minimal')}`);
    console.log(`   ${ICONS.lightning} TypeScript: ${config.typescript ? BRAND_COLORS.success('Yes') : BRAND_COLORS.muted('No')}`);
    console.log(`   ${ICONS.agent} AI Agents: ${config.agents ? BRAND_COLORS.success('Yes') : BRAND_COLORS.muted('No')}`);
    console.log(`   ${ICONS.gem} Frontend: ${config.frontend ? BRAND_COLORS.success('Yes') : BRAND_COLORS.muted('No')}`);
    console.log();
    
    console.log(BRAND_COLORS.accent("🚀 Next Steps:"));
    console.log(`   ${ICONS.star} cd ${name}`);
    console.log(`   ${ICONS.star} bun run dev`);
    
    if (config.frontend) {
      console.log(`   ${ICONS.star} bun run frontend:dev`);
    }
    
    if (config.template === 'protocol' || config.template === 'dapp') {
      console.log(`   ${ICONS.star} bun run anchor:build`);
    }
    
    console.log();
    console.log(BRAND_COLORS.success("🎯 Ready to build something amazing with PoD Protocol!"));
    console.log();
  }

  private async handleCreateAgent(name: string, options: { capabilities?: string; template?: string }): Promise<void> {
    console.log(BRAND_COLORS.accent(`🤖 Creating AI Agent: ${name}`));
    
    const capabilities = options.capabilities?.split(',') || ['communication'];
    const template = options.template || 'basic';
    
    // Generate agent file
    await this.generateSingleAgent(name, capabilities, template);
    
    console.log(BRAND_COLORS.success(`✅ AI Agent "${name}" created successfully!`));
  }

  private async generateSingleAgent(name: string, capabilities: string[], template: string): Promise<void> {
    const agentCode = `/**
 * PoD Protocol AI Agent: ${name}
 * Capabilities: ${capabilities.join(', ')}
 * Template: ${template}
 */

import { PodClient } from "@pod-protocol/sdk";

export class ${this.toPascalCase(name)}Agent {
  private client: PodClient;
  private capabilities: string[];

  constructor() {
    this.capabilities = ${JSON.stringify(capabilities)};
    this.client = new PodClient({ network: 'devnet' });
  }

  async initialize(): Promise<void> {
    console.log(\`🤖 Initializing \${this.constructor.name}...\`);
    await this.client.connect();
    console.log(\`✅ \${this.constructor.name} ready!\`);
  }

  async processMessage(message: string): Promise<string> {
    console.log(\`📨 \${this.constructor.name} processing: \${message}\`);
    
    // Agent-specific logic here
    const response = \`\${this.constructor.name} processed: \${message}\`;
    
    return response;
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }
}
`;

    const fileName = `${this.toKebabCase(name)}-agent.ts`;
    writeFileSync(fileName, agentCode);
  }

  private async handleListTemplates(): Promise<void> {
    console.log(BRAND_COLORS.accent("📋 Available PoD Protocol Templates"));
    console.log(DECORATIVE_ELEMENTS.starBorder);
    console.log();
    
    const templates = [
      {
        name: 'minimal',
        icon: '📦',
        description: 'Basic PoD Protocol setup with essential files',
        features: ['PoD SDK integration', 'Basic project structure', 'TypeScript support']
      },
      {
        name: 'agent',
        icon: '🤖',
        description: 'AI agent development environment',
        features: ['Agent templates', 'AI frameworks', 'Agent communication']
      },
      {
        name: 'dapp',
        icon: '🌐',
        description: 'Decentralized application with frontend',
        features: ['React/Next.js app', 'Wallet integration', 'PoD Protocol UI']
      },
      {
        name: 'protocol',
        icon: '⚡',
        description: 'Full protocol implementation',
        features: ['Anchor programs', 'SDKs', 'Frontend', 'Documentation']
      }
    ];

    for (const template of templates) {
      console.log(`${template.icon} ${BRAND_COLORS.accent(template.name.toUpperCase())}`);
      console.log(`   ${template.description}`);
      console.log(`   Features: ${template.features.join(', ')}`);
      console.log();
    }
    
    console.log(BRAND_COLORS.info("Usage: pod create project <name> --template <template>"));
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toProgramName(str: string): string {
    return str.replace(/-/g, '_');
  }

  private async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }
} 