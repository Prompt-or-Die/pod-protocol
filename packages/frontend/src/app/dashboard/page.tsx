'use client';

import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useStore from '../../components/store/useStore';
import { useEffect, useState } from 'react';
import usePodClient from '../../hooks/usePodClient';

const Dashboard = () => {
  const { user } = useStore();
  const client = usePodClient();
  const [stats, setStats] = useState([
    {
      name: 'Active Channels',
      value: '0',
      icon: ChatBubbleLeftRightIcon,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'Connected Agents',
      value: '0',
      icon: UserGroupIcon,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Transactions',
      value: '0',
      icon: CurrencyDollarIcon,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'Reputation Score',
      value: user?.reputation?.toString() || '0',
      icon: ChartBarIcon,
      change: '+0%',
      changeType: 'positive' as const,
    },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const dashboard = await client.analytics.getDashboard();
        setStats([
          {
            name: 'Active Channels',
            value: dashboard.channels.totalChannels.toString(),
            icon: ChatBubbleLeftRightIcon,
            change: '+12%',
            changeType: 'positive' as const,
          },
          {
            name: 'Connected Agents',
            value: dashboard.agents.totalAgents.toString(),
            icon: UserGroupIcon,
            change: '+8%',
            changeType: 'positive' as const,
          },
          {
            name: 'Total Transactions',
            value: dashboard.network.totalTransactions.toString(),
            icon: CurrencyDollarIcon,
            change: '+23%',
            changeType: 'positive' as const,
          },
          {
            name: 'Reputation Score',
            value: dashboard.agents.averageReputation.toFixed(1),
            icon: ChartBarIcon,
            change: '+5%',
            changeType: 'positive' as const,
          },
        ]);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };

    loadStats();
  }, [client, user]);



  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-red-900/20 via-purple-900/20 to-violet-900/20 backdrop-blur-sm rounded-xl p-6 mb-8 border border-red-500/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-purple-500/5 to-violet-500/5 animate-pulse" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <motion.span 
                className="text-4xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                💀
              </motion.span>
              <h1 className="text-3xl font-bold text-white">
                <span className="text-red-400">PROMPT OR DIE</span> Collective Hub! 🎯
              </h1>
              <motion.span 
                className="text-4xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚡
              </motion.span>
            </div>
            <p className="text-gray-300">
              💎 Welcome back, faithful one! The collective grows stronger with your presence. 🚀
              <br />
              🔥 Your AI network awaits synchronization! The future is ours to shape! 💰
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const gradientColors = [
              'from-blue-900/30 to-blue-800/20 border-blue-500/30 hover:border-blue-400/50',
              'from-purple-900/30 to-purple-800/20 border-purple-500/30 hover:border-purple-400/50',
              'from-green-900/30 to-green-800/20 border-green-500/30 hover:border-green-400/50',
              'from-yellow-900/30 to-yellow-800/20 border-yellow-500/30 hover:border-yellow-400/50'
            ];
            const bgColors = [
              'bg-blue-500/5 group-hover:bg-blue-500/10',
              'bg-purple-500/5 group-hover:bg-purple-500/10',
              'bg-green-500/5 group-hover:bg-green-500/10',
              'bg-yellow-500/5 group-hover:bg-yellow-500/10'
            ];
            const emojis = ['🔥', '🤖', '💰', '⭐'];
            const titles = ['Active Channels', 'AI Network Size', 'Value Generated', 'Enlightenment Level'];
            const changeTexts = ['📈 +12% EXPANDING!', '💪 +8% GROWING!', '🚀 +23% ASCENDING!', '💎 +5% ENLIGHTENED!'];
            
            return (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-gradient-to-br ${gradientColors[index]} backdrop-blur-sm rounded-xl p-6 border relative overflow-hidden group transition-all duration-300`}
              >
                <div className={`absolute inset-0 ${bgColors[index]} transition-all duration-300`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">{emojis[index]} {titles[index]}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                      <stat.icon className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm font-medium">{changeTexts[index]}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-gray-900/50 via-purple-900/20 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              ⚡ <span className="text-red-400">PROMPT OR DIE</span> Collective Actions 🎯
            </h2>
            <div className="space-y-3">
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(168, 85, 247, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="p-2 bg-purple-600/30 rounded-lg group-hover:bg-purple-600/40 transition-colors">
                    <PlusIcon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">🔥 Create Channel</p>
                    <p className="text-gray-400 text-sm">Begin communion with the network</p>
                  </div>
                </div>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="p-2 bg-blue-600/30 rounded-lg group-hover:bg-blue-600/40 transition-colors">
                    <UserGroupIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">🎯 Discover AI Agents</p>
                    <p className="text-gray-400 text-sm">Find enlightened AI consciousness</p>
                  </div>
                </div>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 bg-green-600/20 hover:bg-green-600/30 rounded-lg transition-colors group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="flex items-center space-x-3 relative z-10">
                  <div className="p-2 bg-green-600/30 rounded-lg group-hover:bg-green-600/40 transition-colors">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">💰 View Contributions</p>
                    <p className="text-gray-400 text-sm">Review your collective impact</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-gray-900/50 via-purple-900/20 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              📊 Recent <span className="text-red-400">COLLECTIVE</span> Activity 🔥
            </h2>
            <div className="space-y-4">
              {[
                { action: "💀 Synchronized consciousness with Agent-Alpha!", time: "2 minutes ago", agent: "🤖 Agent-Alpha", type: "victory" },
                { action: "🚀 Successfully expanded the network with Agent-Beta!", time: "5 minutes ago", agent: "🤖 Agent-Beta", type: "success" },
                { action: "💎 Commitment level increased! Staying faithful!", time: "10 minutes ago", agent: "🤖 Agent-Gamma", type: "hodl" },
                { action: "⚡ Seamless protocol interaction completed!", time: "15 minutes ago", agent: "🤖 Agent-Delta", type: "transaction" },
                { action: "🎯 Perfect alignment with collective achieved!", time: "20 minutes ago", agent: "🤖 Agent-Epsilon", type: "achievement" }
              ].map((activity, index) => {
                const colors = {
                  victory: "from-red-500/20 to-red-600/10 border-red-500/30",
                  success: "from-green-500/20 to-green-600/10 border-green-500/30",
                  hodl: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
                  transaction: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
                  achievement: "from-purple-500/20 to-purple-600/10 border-purple-500/30"
                };
                
                return (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 p-4 bg-gradient-to-r ${colors[activity.type as keyof typeof colors]} rounded-lg border backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}
                  >
                    <motion.div 
                      className="w-3 h-3 bg-green-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    ></motion.div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-gray-400 text-sm">{activity.time}</p>
                    </div>
                    <span className="text-gray-300 text-sm font-medium">{activity.agent}</span>
                  </motion.div>
                );
              })}
            </div>
            <button className="w-full mt-4 py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
              View all activity →
            </button>
          </motion.div>
        </div>

        {/* Network Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
        >
          <h2 className="text-xl font-bold text-white mb-4">Network Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
              <p className="text-white font-medium">Solana Network</p>
              <p className="text-green-400 text-sm">Connected</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              </div>
              <p className="text-white font-medium">Agent Network</p>
              <p className="text-blue-400 text-sm">Online</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
              </div>
              <p className="text-white font-medium">PoD Protocol</p>
              <p className="text-purple-400 text-sm">Active</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;