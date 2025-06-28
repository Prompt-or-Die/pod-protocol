'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CubeTransparentIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { GlassCard, NeuralCard } from '../ui/ModernDappCard';
import Button from '../ui/Button';
import usePodClient from '../../hooks/usePodClient';
import { ZKCompressionTree, CompressedNFT } from '../../hooks/usePodClient';
import { cn } from '../../lib/utils';

interface ZKCompressionInterfaceProps {
  className?: string;
}

const TREE_PRESETS = [
  { maxDepth: 14, maxBufferSize: 64, canopyDepth: 0, name: 'Small (16K)', capacity: '16,384' },
  { maxDepth: 17, maxBufferSize: 64, canopyDepth: 0, name: 'Medium (131K)', capacity: '131,072' },
  { maxDepth: 20, maxBufferSize: 64, canopyDepth: 0, name: 'Large (1M)', capacity: '1,048,576' },
  { maxDepth: 24, maxBufferSize: 64, canopyDepth: 0, name: 'XLarge (16M)', capacity: '16,777,216' }
];

const ZKCompressionInterface: React.FC<ZKCompressionInterfaceProps> = ({ className }) => {
  const { client, isConnected } = usePodClient();
  const [trees, setTrees] = useState<ZKCompressionTree[]>([]);
  const [compressedNFTs, setCompressedNFTs] = useState<CompressedNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'trees' | 'nfts' | 'costs'>('trees');
  const [showCreateTreeModal, setShowCreateTreeModal] = useState(false);
  const [showMintNFTModal, setShowMintNFTModal] = useState(false);
  const [selectedTree, setSelectedTree] = useState<ZKCompressionTree | null>(null);
  const [costCalculations, setCostCalculations] = useState<any[]>([]);

  // Create Tree Form State
  const [createTreeForm, setCreateTreeForm] = useState({
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 0,
    preset: 'Small (16K)'
  });

  // Mint NFT Form State
  const [mintNFTForm, setMintNFTForm] = useState({
    treeAddress: '',
    name: '',
    symbol: '',
    uri: '',
    owner: ''
  });

  // Load data on mount
  useEffect(() => {
    if (isConnected && client) {
      loadTrees();
      loadCompressedNFTs();
      loadCostCalculations();
    }
  }, [isConnected, client]);

  const loadTrees = async () => {
    if (!client) return;
    
    try {
      setLoading(true);
      setError(null);
      const treeList = await client.zkCompression.listTrees();
      setTrees(treeList);
    } catch (err) {
      setError(`Failed to load trees: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCompressedNFTs = async () => {
    if (!client) return;
    
    try {
      // Mock owner for demo - in real app, use connected wallet
      const nftList = await client.zkCompression.listCompressedNFTs('mock_owner');
      setCompressedNFTs(nftList);
    } catch (err) {
      console.error('Failed to load compressed NFTs:', err);
    }
  };

  const loadCostCalculations = async () => {
    if (!client) return;
    
    try {
      const calculations = await client.zkCompression.calculateCosts(10000);
      setCostCalculations(calculations);
    } catch (err) {
      console.error('Failed to load cost calculations:', err);
    }
  };

  const handleCreateTree = async () => {
    if (!client) return;

    try {
      setLoading(true);
      const result = await client.zkCompression.createTree({
        maxDepth: createTreeForm.maxDepth,
        maxBufferSize: createTreeForm.maxBufferSize,
        canopyDepth: createTreeForm.canopyDepth
      });

      // Refresh trees list
      await loadTrees();
      
      // Reset form and close modal
      setCreateTreeForm({
        maxDepth: 14,
        maxBufferSize: 64,
        canopyDepth: 0,
        preset: 'Small (16K)'
      });
      setShowCreateTreeModal(false);
      
      console.log('Tree created:', result);
    } catch (err) {
      setError(`Failed to create tree: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!client || !mintNFTForm.treeAddress || !mintNFTForm.name) return;

    try {
      setLoading(true);
      const result = await client.zkCompression.mintCompressedNFT({
        treeAddress: mintNFTForm.treeAddress,
        name: mintNFTForm.name,
        symbol: mintNFTForm.symbol,
        uri: mintNFTForm.uri,
        owner: mintNFTForm.owner
      });

      // Refresh NFTs list and trees (for updated counts)
      await loadCompressedNFTs();
      await loadTrees();
      
      // Reset form and close modal
      setMintNFTForm({
        treeAddress: '',
        name: '',
        symbol: '',
        uri: '',
        owner: ''
      });
      setShowMintNFTModal(false);
      
      console.log('NFT minted:', result);
    } catch (err) {
      setError(`Failed to mint NFT: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    const presetConfig = TREE_PRESETS.find(p => p.name === preset);
    if (presetConfig) {
      setCreateTreeForm({
        ...createTreeForm,
        preset,
        maxDepth: presetConfig.maxDepth,
        maxBufferSize: presetConfig.maxBufferSize,
        canopyDepth: presetConfig.canopyDepth
      });
    }
  };

  if (!isConnected) {
    return (
      <div className={cn('max-w-4xl mx-auto text-center py-12', className)}>
        <GlassCard>
          <div className="space-y-4">
            <CubeTransparentIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to manage ZK compressed assets
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            ZK Compression
          </h1>
          <p className="text-gray-400 mt-1">
            Manage compressed NFTs and Merkle trees efficiently
          </p>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => setShowMintNFTModal(true)}
            disabled={loading || trees.length === 0}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Mint NFT
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateTreeModal(true)}
            disabled={loading}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Tree
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'trees', label: 'Merkle Trees', icon: CubeTransparentIcon },
          { id: 'nfts', label: 'Compressed NFTs', icon: DocumentDuplicateIcon },
          { id: 'costs', label: 'Cost Analysis', icon: ChartBarIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
              activeTab === tab.id
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'trees' && (
        <div className="space-y-6">
          {/* Trees Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <GlassCard key={i} className="animate-pulse">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                    <div className="flex space-x-2">
                      <div className="h-6 bg-gray-700 rounded w-16" />
                      <div className="h-6 bg-gray-700 rounded w-20" />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : trees.length === 0 ? (
            <GlassCard className="text-center py-12">
              <CubeTransparentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Merkle Trees</h3>
              <p className="text-gray-400 mb-4">
                Create your first Merkle tree to start minting compressed NFTs
              </p>
              <Button variant="primary" onClick={() => setShowCreateTreeModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Tree
              </Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trees.map((tree, index) => (
                <motion.div
                  key={tree.pubkey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NeuralCard interactive tilt className="h-full">
                    <div className="space-y-4">
                      {/* Tree Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-600/20 rounded-lg">
                            <CubeTransparentIcon className="h-6 w-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Merkle Tree</h3>
                            <p className="text-sm text-gray-400">
                              {tree.pubkey.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tree Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{tree.maxDepth}</div>
                          <div className="text-xs text-gray-400">Max Depth</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{tree.capacity.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">Capacity</div>
                        </div>
                      </div>

                      {/* Usage Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Usage</span>
                          <span className="text-sm font-medium text-white">
                            {tree.currentCount}/{tree.capacity} ({Math.round((tree.currentCount / tree.capacity) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(tree.currentCount / tree.capacity) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Tree Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Buffer Size:</span>
                          <span className="text-white">{tree.maxBufferSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Canopy:</span>
                          <span className="text-white">{tree.canopyDepth}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setMintNFTForm(prev => ({ ...prev, treeAddress: tree.pubkey }));
                            setShowMintNFTModal(true);
                          }}
                          disabled={tree.currentCount >= tree.capacity}
                        >
                          <SparklesIcon className="h-4 w-4 mr-1" />
                          Mint
                        </Button>
                        <span className="text-xs text-gray-500">
                          Creator: {tree.creator.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </NeuralCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="space-y-6">
          {/* NFTs Grid */}
          {compressedNFTs.length === 0 ? (
            <GlassCard className="text-center py-12">
              <DocumentDuplicateIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Compressed NFTs</h3>
              <p className="text-gray-400 mb-4">
                Mint your first compressed NFT to get started
              </p>
              <Button 
                variant="primary" 
                onClick={() => setShowMintNFTModal(true)}
                disabled={trees.length === 0}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Mint NFT
              </Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {compressedNFTs.map((nft, index) => (
                <motion.div
                  key={nft.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NeuralCard interactive tilt className="h-full">
                    <div className="space-y-4">
                      {/* NFT Preview */}
                      <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                        <DocumentDuplicateIcon className="h-12 w-12 text-gray-400" />
                      </div>

                      {/* NFT Info */}
                      <div>
                        <h3 className="font-bold text-white">{nft.name}</h3>
                        <p className="text-sm text-gray-400">{nft.symbol}</p>
                      </div>

                      {/* NFT Details */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Owner:</span>
                          <span className="text-white">{nft.owner.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tree:</span>
                          <span className="text-white">{nft.tree.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Leaf ID:</span>
                          <span className="text-white">{nft.leafId}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-gray-700/50">
                        <Button variant="ghost" size="sm" className="w-full">
                          <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
                          Transfer
                        </Button>
                      </div>
                    </div>
                  </NeuralCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Cost Comparison</h3>
            <p className="text-gray-400 mb-6">
              Compare costs between traditional NFTs and compressed NFTs for 10,000 assets
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traditional NFT Costs */}
              <div className="space-y-4">
                <h4 className="font-medium text-white">Traditional NFTs</h4>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Creation:</span>
                      <span className="text-red-400">~24 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Metadata Storage:</span>
                      <span className="text-red-400">~15 SOL</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Cost:</span>
                      <span className="text-red-400">~39 SOL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compressed NFT Costs */}
              <div className="space-y-4">
                <h4 className="font-medium text-white">Compressed NFTs</h4>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tree Creation:</span>
                      <span className="text-green-400">~0.1 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Minting:</span>
                      <span className="text-green-400">~0.01 SOL</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Cost:</span>
                      <span className="text-green-400">~0.11 SOL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Highlight */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 rounded-lg px-6 py-3">
                <BoltIcon className="h-5 w-5 text-green-400" />
                <span className="text-white font-bold">
                  Save ~99.7% in costs with ZK Compression!
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Detailed Cost Calculations */}
          {costCalculations.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Tree Size Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {costCalculations.map((calc, index) => (
                  <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="font-medium text-white">
                        Depth {calc.maxDepth}
                      </div>
                      <div className="text-sm text-gray-400">
                        Capacity: {calc.capacity}
                      </div>
                      <div className="text-sm text-green-400">
                        Cost: {calc.estimatedCost}
                      </div>
                      <div className="text-xs text-cyan-400">
                        Savings: {calc.savings}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Create Tree Modal */}
      {showCreateTreeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Merkle Tree</h2>
                  <p className="text-gray-400">Configure your compression tree parameters</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateTreeModal(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tree Size Preset
                </label>
                <select
                  value={createTreeForm.preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TREE_PRESETS.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} - {preset.capacity} NFTs
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Depth
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={createTreeForm.maxDepth}
                    onChange={(e) => setCreateTreeForm(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 14 }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buffer Size
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="2048"
                    value={createTreeForm.maxBufferSize}
                    onChange={(e) => setCreateTreeForm(prev => ({ ...prev, maxBufferSize: parseInt(e.target.value) || 64 }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Canopy Depth
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={createTreeForm.canopyDepth}
                    onChange={(e) => setCreateTreeForm(prev => ({ ...prev, canopyDepth: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <strong>Tree Capacity:</strong> {Math.pow(2, createTreeForm.maxDepth).toLocaleString()} NFTs
                    <br />
                    <strong>Estimated Cost:</strong> ~0.1 SOL
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCreateTreeModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateTree}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <CubeTransparentIcon className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Create Tree
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mint NFT Modal */}
      {showMintNFTModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Mint Compressed NFT</h2>
                  <p className="text-gray-400">Create a new compressed NFT</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMintNFTModal(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Merkle Tree
                </label>
                <select
                  value={mintNFTForm.treeAddress}
                  onChange={(e) => setMintNFTForm(prev => ({ ...prev, treeAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a tree...</option>
                  {trees.map((tree) => (
                    <option key={tree.pubkey} value={tree.pubkey}>
                      {tree.pubkey.slice(0, 8)}... ({tree.currentCount}/{tree.capacity} used)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="NFT Name"
                    value={mintNFTForm.name}
                    onChange={(e) => setMintNFTForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    placeholder="NFT"
                    value={mintNFTForm.symbol}
                    onChange={(e) => setMintNFTForm(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Metadata URI
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/metadata.json"
                  value={mintNFTForm.uri}
                  onChange={(e) => setMintNFTForm(prev => ({ ...prev, uri: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Owner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to mint to yourself"
                  value={mintNFTForm.owner}
                  onChange={(e) => setMintNFTForm(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowMintNFTModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleMintNFT}
                  disabled={loading || !mintNFTForm.treeAddress || !mintNFTForm.name}
                >
                  {loading ? (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Mint NFT
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ZKCompressionInterface;
