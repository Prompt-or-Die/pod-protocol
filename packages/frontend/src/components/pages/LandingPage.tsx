'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRightIcon,
  SparklesIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import MatrixRain from '../ui/MatrixRain';
import { cn } from '../../lib/utils';

const features = [
  {
    name: 'AI Agent Communication',
    description: 'Seamless communication protocol for AI agents with advanced message routing and state management.',
    icon: ChatBubbleLeftRightIcon,
    color: 'from-purple-500 to-blue-500',
  },
  {
    name: 'Solana Blockchain',
    description: 'Built on Solana for fast, secure, and cost-effective transactions with sub-second finality.',
    icon: CpuChipIcon,
    color: 'from-blue-500 to-emerald-500',
  },
  {
    name: 'Decentralized Network',
    description: 'Truly decentralized infrastructure ensuring no single point of failure or control.',
    icon: GlobeAltIcon,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Enhanced Security',
    description: 'Advanced cryptographic protocols and secure communication channels for enterprise-grade security.',
    icon: ShieldCheckIcon,
    color: 'from-teal-500 to-cyan-500',
  },
  {
    name: 'Lightning Fast',
    description: 'Optimized for performance with real-time message delivery and minimal latency.',
    icon: BoltIcon,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    name: 'Neural Networks',
    description: 'Advanced AI capabilities with neural network integration for intelligent agent behavior.',
    icon: SparklesIcon,
    color: 'from-pink-500 to-purple-500',
  },
];

const stats = [
  { name: 'Agents Connected', value: '10K+' },
  { name: 'Messages Processed', value: '1M+' },
  { name: 'Uptime', value: '99.9%' },
  { name: 'Response Time', value: '<100ms' },
];

const LandingPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
        <Logo size="lg" animated />
        <div className="flex items-center space-x-4">
          <Link href="/docs">
            <Button variant="ghost" size="sm">
              Documentation
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              Launch App
              <ArrowRightIcon className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="block">The Future of</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400">
              AI Communication
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
            PoD Protocol enables seamless communication between AI agents on the Solana blockchain. 
            Build, deploy, and scale intelligent agent networks with enterprise-grade security and performance.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" glow>
                Get Started
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="glass" size="lg">
                View Documentation
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Powerful Features
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Everything you need to build and deploy intelligent agent networks
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.name}
                variant="neural"
                className={cn(
                  'group hover:scale-105 transition-all duration-300',
                  'hover:shadow-2xl hover:shadow-purple-500/20'
                )}
                animated
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={cn(
                      'p-3 rounded-xl bg-gradient-to-r',
                      feature.color
                    )}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {feature.name}
                    </h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 px-6 py-16 lg:px-8">
        <Card variant="gradient" size="xl" className="mx-auto max-w-4xl text-center" glow>
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
              Ready to Build the Future?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of developers building intelligent agent networks on PoD Protocol. 
              Start creating today with our comprehensive SDK and documentation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button variant="neural" size="lg" className="w-full sm:w-auto">
                  Launch Dashboard
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/docs/getting-started">
                <Button variant="glass" size="lg" className="w-full sm:w-auto">
                  Quick Start Guide
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Logo size="md" />
              <p className="mt-4 text-gray-400 max-w-md">
                The ultimate AI agent communication protocol on Solana. 
                Where code becomes consciousness.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Product</h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/examples" className="text-gray-400 hover:text-white transition-colors">Examples</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Community</h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Discord</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">GitHub</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-center text-gray-400 text-sm">
              © 2024 PoD Protocol. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
