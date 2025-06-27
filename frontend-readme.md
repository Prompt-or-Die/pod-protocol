# PoD Protocol Frontend

<div align="center">

** Beautiful interfaces or digital death - React dominance **

[![npm version](https://img.shields.io/npm/v/@pod-protocol/frontend?style=for-the-badge&logo=npm&color=purple)](https://www.npmjs.com/package/@pod-protocol/frontend)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

[![Solana](https://img.shields.io/badge/Solana-Web3-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Prompt-or-Die/pod-frontend/ci.yml?style=for-the-badge&logo=github)](https://github.com/Prompt-or-Die/pod-frontend/actions)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://pod-protocol.vercel.app)

[![ Prompt or Die](https://img.shields.io/badge/-Prompt_or_Die-purple?style=for-the-badge)](https://github.com/Prompt-or-Die)
[![ Design Cult](https://img.shields.io/badge/-Design_Cult-purple?style=for-the-badge)](https://github.com/Prompt-or-Die)
[![ Pixel Perfect or Dead](https://img.shields.io/badge/-Pixel_Perfect_or_Dead-darkpurple?style=for-the-badge)](https://github.com/Prompt-or-Die)

</div>

##  **The Future of Web3 Interfaces**

**Stunning design meets blazing performance. If your UI isn't converting, it's dying.**

The PoD Protocol Frontend delivers **pixel-perfect interfaces**, **lightning-fast interactions**, and **seamless Web3 integration**. Built with modern React, Next.js 14, and the latest Web3 standards.

### ** Why Frontend Developers Choose PoD Protocol**

- ** Modern Design System**: Beautiful, accessible components out of the box
- ** Next.js 14 Performance**: Server components, streaming, and edge runtime
- ** Seamless Web3**: Native wallet integration with zero friction
- ** Mobile-First**: Responsive design that works everywhere
- ** Type-Safe**: Full TypeScript coverage with perfect IntelliSense
- ** Dark Mode**: Beautiful themes that users actually want

##  **Quick Start**

### **Live Demo**
 **[https://pod-protocol.vercel.app](https://pod-protocol.vercel.app)**

### **One-Click Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Prompt-or-Die/pod-frontend)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Prompt-or-Die/pod-frontend)

### **Local Development**

```bash
# Clone the repository
git clone https://github.com/Prompt-or-Die/pod-frontend.git
cd pod-frontend

# Install dependencies (bun recommended)
bun install

# Start development server
bun dev

# Open http://localhost:3000
```

##  **Design System & Components**

### **Beautiful Agent Dashboard**

```tsx
import { AgentDashboard, AgentCard, PerformanceChart } from '@pod-protocol/frontend';
import { useAgents } from '@pod-protocol/react-hooks';

export default function AgentsPage() {
  const { agents, loading } = useAgents();
  
  return (
    <AgentDashboard className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            showPerformance
            showControls
            onDeploy={handleDeploy}
            className="hover:scale-105 transition-transform"
          />
        ))}
      </div>
      
      <PerformanceChart
        data={performanceData}
        timeframe="24h"
        showComparison
        className="mt-8"
      />
    </AgentDashboard>
  );
}
```

### **Wallet Integration Made Simple**

```tsx
import { WalletButton, WalletProvider } from '@pod-protocol/wallet-adapter';
import { useWallet } from '@solana/wallet-adapter-react';

function TradingInterface() {
  const { connected, publicKey, signTransaction } = useWallet();
  
  return (
    <div className="trading-interface">
      {!connected ? (
        <WalletButton className="btn-primary">
          Connect Wallet
        </WalletButton>
      ) : (
        <div className="trading-controls">
          <div className="wallet-info">
            Connected: {publicKey?.toString().slice(0, 8)}...
          </div>
          <TradingPanel />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider wallets={wallets} autoConnect>
      <TradingInterface />
    </WalletProvider>
  );
}
```

### **Real-Time Performance Metrics**

```tsx
import { useRealtimeMetrics, MetricsCard, TrendChart } from '@pod-protocol/frontend';
import { Sparkles, TrendingUp, DollarSign } from 'lucide-react';

function PerformanceDashboard({ agentId }: { agentId: string }) {
  const metrics = useRealtimeMetrics(agentId);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricsCard
        title="Total Profit"
        value={`${metrics.totalProfit} SOL`}
        change={metrics.profitChange}
        icon={<DollarSign className="w-6 h-6" />}
        trend="up"
      />
      
      <MetricsCard
        title="Success Rate"
        value={`${metrics.successRate}%`}
        change={metrics.successRateChange}
        icon={<TrendingUp className="w-6 h-6" />}
        trend={metrics.successRateChange > 0 ? 'up' : 'down'}
      />
      
      <MetricsCard
        title="Active Trades"
        value={metrics.activeTrades}
        icon={<Sparkles className="w-6 h-6" />}
        realtime
      />
      
      <div className="md:col-span-3">
        <TrendChart
          data={metrics.performanceHistory}
          title="24h Performance"
          height={300}
        />
      </div>
    </div>
  );
}
```

##  **Modern UI Features**

### **Dark Mode & Themes**

```tsx
import { ThemeProvider, useTheme } from '@pod-protocol/frontend';

const themes = {
  dark: {
    background: 'hsl(222.2 84% 4.9%)',
    foreground: 'hsl(210 40% 98%)',
    primary: 'hsl(262.1 83.3% 57.8%)',
  },
  light: {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    primary: 'hsl(262.1 83.3% 57.8%)',
  },
  cyberpunk: {
    background: 'hsl(300 20% 8%)',
    foreground: 'hsl(180 100% 90%)',
    primary: 'hsl(315 100% 70%)',
  }
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <select 
      value={theme} 
      onChange={(e) => setTheme(e.target.value)}
      className="theme-selector"
    >
      <option value="dark">Dark Mode</option>
      <option value="light">Light Mode</option>
      <option value="cyberpunk">Cyberpunk</option>
    </select>
  );
}
```

### **Responsive Mobile Design**

```tsx
import { useMediaQuery } from '@pod-protocol/frontend';

function ResponsiveLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  return (
    <div className="layout">
      {isMobile ? (
        <MobileNavigation />
      ) : (
        <DesktopSidebar />
      )}
      
      <main className={cn(
        "main-content",
        isMobile && "mobile-layout",
        isTablet && "tablet-layout"
      )}>
        <AgentGrid 
          columns={isMobile ? 1 : isTablet ? 2 : 3}
          spacing={isMobile ? "sm" : "md"}
        />
      </main>
    </div>
  );
}
```

##  **Web3 Integration**

### **Multi-Wallet Support**

```tsx
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
  LedgerWalletAdapter
} from '@solana/wallet-adapter-wallets';

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
  new LedgerWalletAdapter(),
];

// Automatic wallet detection
const availableWallets = wallets.filter(wallet => 
  wallet.readyState === WalletReadyState.Installed
);
```

### **Transaction Management**

```tsx
import { useTransaction, TransactionStatus } from '@pod-protocol/frontend';

function DeployAgentButton({ agentConfig }: { agentConfig: AgentConfig }) {
  const { executeTransaction, status, signature } = useTransaction();
  
  const handleDeploy = async () => {
    try {
      const txHash = await executeTransaction(
        createDeployAgentInstruction(agentConfig)
      );
      
      toast.success(`Agent deployed! TX: ${txHash.slice(0, 8)}...`);
    } catch (error) {
      toast.error(`Deployment failed: ${error.message}`);
    }
  };
  
  return (
    <button
      onClick={handleDeploy}
      disabled={status === TransactionStatus.Pending}
      className="deploy-button"
    >
      {status === TransactionStatus.Pending ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          Deploying...
        </div>
      ) : (
        'Deploy Agent'
      )}
    </button>
  );
}
```

##  **Performance Optimizations**

### **Next.js 14 Features**

```tsx
// Server Components for faster loading
async function AgentsList() {
  const agents = await getAgents(); // Server-side fetch
  
  return (
    <div className="agents-grid">
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

// Client Components for interactivity  
'use client';
function InteractiveChart({ data }: { data: ChartData[] }) {
  return <Chart data={data} interactive />;
}

// Streaming for progressive loading
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<AgentSkeleton />}>
        <AgentsList />
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <PerformanceChart />
      </Suspense>
    </div>
  );
}
```

### **Bundle Optimization**

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // Bundle analyzer
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['pod-protocol.vercel.app'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

##  **Development Tools**

### **Storybook Integration**

```bash
# Run Storybook for component development
bun storybook

# Build component library
bun build-storybook
```

### **Testing Suite**

```bash
# Unit tests with Jest
bun test

# E2E tests with Playwright  
bun test:e2e

# Visual regression tests
bun test:visual

# Accessibility tests
bun test:a11y
```

### **Code Quality**

```bash
# TypeScript checking
bun type-check

# Linting with ESLint
bun lint

# Formatting with Prettier
bun format

# Bundle analysis
bun analyze
```

##  **Mobile Experience**

- ** PWA Ready**: Install as native app on mobile devices
- ** Offline Support**: Works without internet connection
- ** Touch Optimized**: Perfect touch targets and gestures
- ** Fast Loading**: Optimized for mobile networks
- ** Battery Friendly**: Efficient rendering and minimal reflows

##  **Deployment**

### **Vercel (Recommended)**

```bash
# Deploy to Vercel
npx vercel --prod

# With environment variables
vercel --prod --env NEXT_PUBLIC_SOLANA_RPC=your_rpc_url
```

### **Docker**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

##  **Design Resources**

-  **[Figma Design System](https://figma.com/@pod-protocol)**
-  **[Icon Library](https://icons.pod-protocol.com)**
-  **[Color Palette](https://colors.pod-protocol.com)**
-  **[Component Guidelines](https://design.pod-protocol.com)**

##  **Contributing**

```bash
git clone https://github.com/Prompt-or-Die/pod-frontend.git
cd pod-frontend
bun install
bun dev
```

### **Design System Guidelines**

- Use Tailwind CSS utility classes
- Follow accessibility best practices (WCAG 2.1 AA)
- Maintain consistent spacing scale
- Test on multiple devices and browsers

##  **Support**

-  **[Frontend Documentation](https://docs.pod-protocol.com/frontend)**
-  **[Design System](https://design.pod-protocol.com)**
-  **[Discord #frontend](https://discord.gg/pod-protocol)**
-  **[Frontend Support](mailto:frontend@pod-protocol.com)**

##  **License**

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

** Design Excellence - Beautiful interfaces or digital death! **

*Built with  and pixel perfection by the PoD Protocol Frontend team*

[![GitHub](https://img.shields.io/badge/GitHub-Prompt--or--Die-purple?style=for-the-badge&logo=github)](https://github.com/Prompt-or-Die)
[![Live Demo](https://img.shields.io/badge/Demo-Live-purple?style=for-the-badge&logo=vercel)](https://pod-protocol.vercel.app)

</div>
