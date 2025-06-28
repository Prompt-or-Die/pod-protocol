'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import LoadingState, { LoadingSpinner } from '../ui/LoadingState';
import { SkeletonCard, SkeletonChannelList } from '../ui/SkeletonLoader';

// Dynamic import wrapper with proper loading states
const createLazyComponent = <T extends object>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ReactNode,
  options?: {
    ssr?: boolean;
    loading?: () => React.ReactNode;
  }
) => {
  return dynamic(importFn, {
    ssr: options?.ssr ?? false,
    loading: options?.loading || (() => fallback || <LoadingSpinner className="mx-auto" />),
  });
};

// Lazy-loaded modals (heavy components that aren't needed immediately)
export const LazyCreateChannelModal = createLazyComponent(
  () => import('../modals/CreateChannelModal'),
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 max-w-md w-full mx-4">
      <div className="space-y-4">
        <div className="h-6 bg-gray-700/50 rounded animate-pulse"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-700/50 rounded animate-pulse"></div>
        </div>
        <div className="flex justify-end space-x-3">
          <div className="h-10 w-20 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-purple-600/50 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

export const LazySettingsModal = createLazyComponent(
  () => import('../modals/SettingsModal'),
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <LoadingState message="Loading Settings..." size="md" />
    </div>
  </div>
);

export const LazyUserProfileModal = createLazyComponent(
  () => import('../modals/UserProfileModal'),
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <SkeletonCard className="max-w-md w-full mx-4" />
  </div>
);

// Lazy-loaded pages/views
export const LazyChatInterface = createLazyComponent(
  () => import('../chat/ChatInterface'),
  <div className="h-full flex flex-col">
    <div className="h-16 bg-gray-900/50 border-b border-purple-500/20 animate-pulse"></div>
    <div className="flex-1 p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="max-w-xs p-3 rounded-lg bg-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-600/50 rounded mb-1"></div>
            <div className="h-3 bg-gray-600/50 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
    <div className="h-16 bg-gray-900/50 border-t border-purple-500/20 animate-pulse"></div>
  </div>
);

export const LazyAgentManagement = createLazyComponent(
  () => import('../agents/AgentManagement'),
  <div className="space-y-6">
    <LoadingState message="Loading Agents..." submessage="Fetching AI agents and their configurations" />
  </div>
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('../analytics/AnalyticsDashboard'),
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} className="h-32" />
      ))}
    </div>
    <SkeletonCard className="h-64" />
  </div>
);

// Lazy-loaded complex UI components
export const LazyCodeEditor = createLazyComponent(
  () => import('../editor/CodeEditor'),
  <div className="w-full h-64 bg-gray-900/50 border border-purple-500/20 rounded-lg flex items-center justify-center">
    <LoadingState message="Loading Code Editor..." size="sm" />
  </div>
);

export const LazyMarkdownEditor = createLazyComponent(
  () => import('../editor/MarkdownEditor'),
  <div className="w-full h-48 bg-gray-900/50 border border-purple-500/20 rounded-lg flex items-center justify-center">
    <LoadingState message="Loading Editor..." size="sm" />
  </div>
);

export const LazyFileUploader = createLazyComponent(
  () => import('../upload/FileUploader'),
  <div className="w-full h-32 bg-gray-900/50 border-2 border-dashed border-purple-500/20 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="h-8 w-8 bg-purple-500/20 rounded mx-auto mb-2 animate-pulse"></div>
      <div className="h-4 w-24 bg-gray-700/50 rounded mx-auto animate-pulse"></div>
    </div>
  </div>
);

// Lazy-loaded third-party integrations
export const LazyWalletConnector = createLazyComponent(
  () => import('../wallet/WalletConnector'),
  <div className="space-y-4">
    <LoadingState message="Loading Wallet Options..." size="sm" />
  </div>
);

export const LazyNotificationCenter = createLazyComponent(
  () => import('../notifications/NotificationCenter'),
  <div className="w-80 max-h-96 bg-gray-900/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-xl">
    <div className="p-4">
      <LoadingState message="Loading Notifications..." size="sm" />
    </div>
  </div>
);

// Higher-order component for lazy loading with Suspense
export const withLazyLoading = <P extends object>(
  LazyComponent: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner className="mx-auto" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// Preloader utility for critical components
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Only preload in browser environment
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback if available, otherwise use setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  }
};

// Preload critical components after initial load
export const preloadCriticalComponents = () => {
  preloadComponent(() => import('../chat/ChatInterface'));
  preloadComponent(() => import('../modals/CreateChannelModal'));
  preloadComponent(() => import('../notifications/NotificationCenter'));
};

// Bundle size optimization utilities
export const BundleOptimizer = {
  // Lazy load heavy libraries only when needed
  loadChartLibrary: () => import('recharts'),
  loadDateLibrary: () => import('date-fns'),
  loadCryptoLibrary: () => import('crypto-js'),
  loadMarkdownLibrary: () => import('react-markdown'),
  
  // Conditional loading based on feature flags
  loadFeature: async (featureName: string) => {
    const features: Record<string, () => Promise<any>> = {
      analytics: () => import('../analytics/AnalyticsDashboard'),
      marketplace: () => import('../marketplace/MarketplaceDashboard'),
      developer: () => import('../developer/DeveloperTools'),
    };
    
    if (features[featureName]) {
      return await features[featureName]();
    }
    
    throw new Error(`Feature ${featureName} not found`);
  },
};

export default {
  LazyCreateChannelModal,
  LazySettingsModal,
  LazyUserProfileModal,
  LazyChatInterface,
  LazyAgentManagement,
  LazyAnalyticsDashboard,
  LazyCodeEditor,
  LazyMarkdownEditor,
  LazyFileUploader,
  LazyWalletConnector,
  LazyNotificationCenter,
  withLazyLoading,
  preloadComponent,
  preloadCriticalComponents,
  BundleOptimizer,
};