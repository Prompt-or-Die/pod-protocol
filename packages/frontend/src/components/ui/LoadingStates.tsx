'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Skeleton loading component
export const Skeleton: React.FC<{
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}> = ({ 
  className, 
  variant = 'rectangular',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-700/50';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: ''
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  );
};

// Spinner component with various styles
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  variant?: 'default' | 'dots' | 'bars' | 'ring';
}> = ({ 
  size = 'md', 
  color = 'text-purple-400',
  className,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn('rounded-full bg-current', 
              size === 'sm' ? 'w-2 h-2' :
              size === 'md' ? 'w-3 h-3' :
              size === 'lg' ? 'w-4 h-4' : 'w-5 h-5',
              color
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn('bg-current rounded-sm',
              size === 'sm' ? 'w-1 h-4' :
              size === 'md' ? 'w-1 h-6' :
              size === 'lg' ? 'w-1.5 h-8' : 'w-2 h-10',
              color
            )}
            animate={{
              scaleY: [1, 2, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'ring') {
    return (
      <div className={cn(sizeClasses[size], className)}>
        <div className={cn(
          'border-2 border-gray-600 border-t-current rounded-full animate-spin',
          sizeClasses[size],
          color
        )} />
      </div>
    );
  }

  // Default spinner
  return (
    <motion.div
      className={cn(sizeClasses[size], color, className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="32"
          strokeDashoffset="32"
          opacity="0.3"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="32"
          strokeDashoffset="20"
        />
      </svg>
    </motion.div>
  );
};

// Full page loading screen
export const PageLoader: React.FC<{
  message?: string;
  progress?: number;
}> = ({ message = 'Loading...', progress }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        {/* Animated logo or brand element */}
        <motion.div
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg mx-auto"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">{message}</h2>
          <Spinner size="lg" variant="dots" />
        </div>

        {/* Progress bar if provided */}
        {typeof progress === 'number' && (
          <div className="w-64 mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Card skeleton for loading states
export const CardSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 1, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Table skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-24" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Loading overlay for existing content
export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}> = ({ isLoading, children, message = 'Loading...', className }) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-6 text-center">
            <Spinner size="lg" className="mb-3" />
            <p className="text-white font-medium">{message}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Lazy loading placeholder
export const LazyLoadPlaceholder: React.FC<{
  height?: string;
  className?: string;
}> = ({ height = 'h-64', className }) => {
  return (
    <div className={cn(
      'bg-gray-800/30 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center',
      height,
      className
    )}>
      <div className="text-center space-y-3">
        <Spinner size="lg" variant="ring" />
        <p className="text-gray-400 text-sm">Loading content...</p>
      </div>
    </div>
  );
};