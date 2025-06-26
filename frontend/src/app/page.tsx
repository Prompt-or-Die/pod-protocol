'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  SparklesIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { ModernDappCard, GlassCard, NeuralCard, QuantumCard } from '../components/ui/ModernDappCard';
import WalletConnectionHub from '../components/ui/WalletConnectionHub';
import DappDashboard from '../components/ui/DappDashboard';
import Button from '../components/ui/Button';
import { cn } from '../lib/utils';
import React from 'react';

export default function HomePage() {
  const { connected } = useWallet();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Features showcase
  const features = [
    {
      id: 'ai-agents',
      title: 'Autonomous AI Agents',
      description: 'Deploy intelligent agents that can communicate, trade, and execute tasks autonomously on the Solana blockchain.',
      icon: CpuChipIcon,
      gradient: 'from-purple-600 to-blue-600',
      stats: ['24/7 Operation', 'Smart Contracts', 'Multi-Agent Systems']
    },
    {
      id: 'real-time',
      title: 'Real-time Communication',
      description: 'Instant messaging and data streaming between users and AI agents with sub-second latency.',
      icon: BoltIcon,
      gradient: 'from-cyan-600 to-teal-600',
      stats: ['<100ms Latency', 'WebSocket Streams', 'Global Network']
    },
    {
      id: 'security',
      title: 'Quantum-Resistant Security',
      description: 'Future-proof encryption and post-quantum cryptography to secure your communications.',
      icon: ShieldCheckIcon,
      gradient: 'from-emerald-600 to-green-600',
      stats: ['Post-Quantum Crypto', 'Zero-Knowledge Proofs', 'End-to-End Encryption']
    },
    {
      id: 'decentralized',
      title: 'Fully Decentralized',
      description: 'Built on Solana with no central points of failure. Your data, your control.',
      icon: GlobeAltIcon,
      gradient: 'from-orange-600 to-red-600',
      stats: ['No Central Servers', 'IPFS Storage', 'Blockchain Native']
    }
  ];

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (connected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <DappDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20" />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{
                y: [null, -100],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PoD Protocol</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Button variant="ghost" size="sm">
                Docs
              </Button>
              <Button variant="ghost" size="sm">
                GitHub
              </Button>
              <Button variant="primary" size="sm">
                <PlayIcon className="h-4 w-4 mr-2" />
                Demo
              </Button>
            </motion.div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="space-y-4">
              <motion.h1 
                className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                The Future of
                <br />
                AI Communication
              </motion.h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Deploy autonomous AI agents that communicate, collaborate, and execute tasks 
                on the Solana blockchain with unprecedented security and speed.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Button variant="neural" size="xl" className="w-full sm:w-auto">
                <SparklesIcon className="h-5 w-5 mr-2" />
                Get Started
              </Button>
              <Button variant="glass" size="xl" className="w-full sm:w-auto">
                <PlayIcon className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            >
              {[
                { label: 'Active Agents', value: '2,847+', suffix: '' },
                { label: 'Messages/Day', value: '1.2M+', suffix: '' },
                { label: 'Uptime', value: '99.9', suffix: '%' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Wallet Connection Section */}
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <WalletConnectionHub />
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powered by Advanced Technology
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Built with cutting-edge blockchain technology and AI to deliver 
              unparalleled performance and security.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Feature Showcase */}
            <div className="space-y-4">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                const isActive = index === activeFeature;
                
                return (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + index * 0.1 }}
                  >
                    <ModernDappCard
                      variant={isActive ? 'neural' : 'glass'}
                      interactive
                      className={cn(
                        'cursor-pointer transition-all duration-500',
                        isActive && 'ring-2 ring-purple-500/50'
                      )}
                      onClick={() => setActiveFeature(index)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={cn(
                          'p-3 rounded-xl bg-gradient-to-r',
                          feature.gradient,
                          'text-white'
                        )}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-3">
                            {feature.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            {feature.stats.map((stat) => (
                              <span
                                key={stat}
                                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
                              >
                                {stat}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <ArrowRightIcon className={cn(
                          'h-5 w-5 transition-all duration-300',
                          isActive ? 'text-purple-400 transform rotate-90' : 'text-gray-500'
                        )} />
                      </div>
                    </ModernDappCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Active Feature Detail */}
            <div className="lg:sticky lg:top-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <NeuralCard className="h-96 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className={cn(
                        'p-6 rounded-2xl bg-gradient-to-r mx-auto w-fit',
                        features[activeFeature].gradient
                      )}>
                        {React.createElement(features[activeFeature].icon, { 
                          className: "h-12 w-12 text-white" 
                        })}
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-3">
                          {features[activeFeature].title}
                        </h3>
                        <p className="text-gray-300">
                          {features[activeFeature].description}
                        </p>
                      </div>
                      
                      <Button variant="glass" size="lg">
                        Learn More
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </NeuralCard>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            <QuantumCard className="text-center max-w-4xl mx-auto">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Ready to Build the Future?
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                  Join thousands of developers building the next generation of 
                  AI-powered applications on Solana.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button variant="neural" size="xl">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Start Building
                  </Button>
                  <Button variant="glass" size="xl">
                    Read Documentation
                  </Button>
                </div>
              </div>
            </QuantumCard>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-md flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-gray-400">© 2025 PoD Protocol. Built with ❤️ on Solana.</span>
            </div>
            <div className="flex items-center space-x-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}