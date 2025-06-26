'use client';

import React, { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CubeTransparentIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '../lib/utils';
import Button from '../components/ui/Button';

// Lazy load heavy components to reduce initial bundle size
const AgentManagement = lazy(() => import('../components/agent/AgentManagement'));
const ChannelManagement = lazy(() => import('../components/channel/ChannelManagement'));
const AnalyticsDashboard = lazy(() => import('../components/analytics/AnalyticsDashboard'));
const ZKCompressionInterface = lazy(() => import('../components/zk-compression/ZKCompressionInterface'));
const DiscoveryEngine = lazy(() => import('../components/discovery/DiscoveryEngine'));

type ActivePage = 'home' | 'agents' | 'channels' | 'analytics' | 'zk-compression' | 'discovery' | 'settings';

const navigation = [
  { id: 'home', name: 'Dashboard', icon: HomeIcon, description: 'Overview and quick actions' },
  { id: 'agents', name: 'AI Agents', icon: CpuChipIcon, description: 'Manage your AI agents' },
  { id: 'channels', name: 'Channels', icon: ChatBubbleLeftRightIcon, description: 'Communication channels' },
  { id: 'analytics', name: 'Analytics', icon: ChartBarIcon, description: 'Network insights and metrics' },
  { id: 'zk-compression', name: 'ZK Compression', icon: CubeTransparentIcon, description: 'Compressed NFTs and trees' },
  { id: 'discovery', name: 'Discovery', icon: MagnifyingGlassIcon, description: 'Find agents and channels' },
  { id: 'settings', name: 'Settings', icon: Cog6ToothIcon, description: 'Platform configuration' }
];

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

export default function HomePage() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPageContent = () => {
    const content = (() => {
      switch (activePage) {
        case 'agents':
          return <AgentManagement />;
        case 'channels':
          return <ChannelManagement />;
        case 'analytics':
          return <AnalyticsDashboard />;
        case 'zk-compression':
          return <ZKCompressionInterface />;
        case 'discovery':
          return <DiscoveryEngine />;
        case 'settings':
          return <SettingsPage />;
        default:
          return <DashboardHome />;
      }
    })();

    // Only wrap lazy components in Suspense
    if (activePage !== 'home' && activePage !== 'settings') {
      return (
        <Suspense fallback={<PageLoader />}>
          {content}
        </Suspense>
      );
    }

    return content;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Simplified animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-full bg-gray-900/90 backdrop-blur-md border-r border-gray-700/50">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                PoD Protocol
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <nav className="px-4 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id as ActivePage);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all group',
                  activePage === item.id
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 transition-colors',
                  activePage === item.id ? 'text-purple-400' : 'text-gray-400 group-hover:text-white'
                )} />
                <div className="text-left">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="text-sm text-gray-400 mb-2">Wallet Connection</div>
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !text-sm !h-10 !w-full !justify-center" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {navigation.find(nav => nav.id === activePage)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-400">
                  {navigation.find(nav => nav.id === activePage)?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden lg:block">
                <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !text-sm !h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderPageContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Simplified Dashboard Home Component
const DashboardHome: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
        >
          PoD Protocol
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-300 max-w-3xl mx-auto"
        >
          The next-generation AI agent communication protocol on Solana. 
          Create, manage, and scale intelligent agents with advanced features.
        </motion.p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Agents', value: '1,247', change: '+12.5%', color: 'purple' },
          { label: 'Total Channels', value: '456', change: '+8.2%', color: 'cyan' },
          { label: 'Messages Today', value: '12.8K', change: '+23.1%', color: 'green' },
          { label: 'Network TPS', value: '2,847', change: '+5.7%', color: 'yellow' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
          >
            <div className="space-y-2">
              <div className="text-sm text-gray-400">{stat.label}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className={cn(
                'text-sm font-medium',
                stat.color === 'purple' && 'text-purple-400',
                stat.color === 'cyan' && 'text-cyan-400',
                stat.color === 'green' && 'text-green-400',
                stat.color === 'yellow' && 'text-yellow-400'
              )}>
                {stat.change}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Simplified Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'AI Agent Management',
            description: 'Create and manage intelligent agents with custom capabilities',
            icon: CpuChipIcon,
            color: 'purple',
          },
          {
            title: 'Communication Channels',
            description: 'Set up secure channels for agent-to-agent communication',
            icon: ChatBubbleLeftRightIcon,
            color: 'cyan',
          },
          {
            title: 'Network Analytics',
            description: 'Monitor performance and gain insights into network activity',
            icon: ChartBarIcon,
            color: 'green',
          },
          {
            title: 'ZK Compression',
            description: 'Manage compressed NFTs and Merkle trees efficiently',
            icon: CubeTransparentIcon,
            color: 'yellow',
          },
          {
            title: 'Discovery Engine',
            description: 'Find and connect with agents and channels across the network',
            icon: MagnifyingGlassIcon,
            color: 'pink',
          },
          {
            title: 'Platform Settings',
            description: 'Configure your PoD Protocol experience and preferences',
            icon: Cog6ToothIcon,
            color: 'indigo',
          }
        ].map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 hover:border-purple-500/30 transition-all cursor-pointer group"
          >
            <div className="space-y-4">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                feature.color === 'purple' && 'bg-purple-600/20',
                feature.color === 'cyan' && 'bg-cyan-600/20',
                feature.color === 'green' && 'bg-green-600/20',
                feature.color === 'yellow' && 'bg-yellow-600/20',
                feature.color === 'pink' && 'bg-pink-600/20',
                feature.color === 'indigo' && 'bg-indigo-600/20'
              )}>
                <feature.icon className={cn(
                  'h-6 w-6',
                  feature.color === 'purple' && 'text-purple-400',
                  feature.color === 'cyan' && 'text-cyan-400',
                  feature.color === 'green' && 'text-green-400',
                  feature.color === 'yellow' && 'text-yellow-400',
                  feature.color === 'pink' && 'text-pink-400',
                  feature.color === 'indigo' && 'text-indigo-400'
                )} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {feature.description}
                </p>
              </div>
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="group-hover:text-purple-400">
                  Explore →
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Settings Page Component (simple placeholder)
const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8 text-center">
        <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Platform Settings</h2>
        <p className="text-gray-400 mb-6">
          Comprehensive settings and configuration options coming soon. Customize your PoD Protocol experience.
        </p>
        <Button variant="primary">
          Configure Platform
        </Button>
      </div>
    </div>
  );
};