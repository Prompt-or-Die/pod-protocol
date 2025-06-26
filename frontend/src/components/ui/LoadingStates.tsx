'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// ============================================================================
// Loading Spinner Components
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'primary', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-purple-600',
    secondary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-500'
  };

  return (
    <motion.div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </motion.div>
  );
};

// Pulse Loading Indicator
export const PulseLoader: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'primary', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6'
  };

  const colorClasses = {
    primary: 'bg-purple-600',
    secondary: 'bg-blue-600',
    white: 'bg-white',
    gray: 'bg-gray-500'
  };

  return (
    <div className={cn('flex space-x-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn(
            'rounded-full',
            sizeClasses[size],
            colorClasses[color]
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Progress Ring
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#8b5cf6',
  trackColor = '#374151',
  showPercentage = true,
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>
      {showPercentage && (
        <motion.div
          className="absolute text-sm font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// Skeleton Components
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animate = true
}) => {
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-lg'
  };

  const baseClasses = 'bg-gray-700/50 backdrop-blur-sm';
  const animationClasses = animate ? 'animate-pulse' : '';

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses,
        !height && variant === 'text' && 'h-4',
        !width && variant === 'text' && 'w-full',
        className
      )}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-gray-800/50 rounded-lg border border-gray-700/50', className)}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="90%" height={12} />
      </div>
      
      {/* Footer */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton width={60} height={24} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  </div>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center space-x-3 p-4', className)}>
    <Skeleton variant="circular" width={32} height={32} />
    <div className="flex-1 space-y-2">
      <Skeleton width="70%" height={14} />
      <Skeleton width="40%" height={10} />
    </div>
    <Skeleton width={24} height={24} variant="rounded" />
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns: number; className?: string }> = ({ 
  columns, 
  className 
}) => (
  <tr className={cn('border-b border-gray-700/50', className)}>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton width="80%" height={16} />
      </td>
    ))}
  </tr>
);

// ============================================================================
// Loading Overlays
// ============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  spinner?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  spinner,
  className,
  overlay = true,
  blur = true
}) => {
  return (
    <div className={cn('relative', className)}>
      {/* Content */}
      <div className={cn(isLoading && blur && 'blur-sm transition-all duration-200')}>
        {children}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && overlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="flex flex-col items-center space-y-3 text-center">
              {spinner || <Spinner size="lg" color="white" />}
              {loadingText && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white font-medium"
                >
                  {loadingText}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Fullscreen Loading
interface FullscreenLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  spinner?: React.ReactNode;
  progress?: number;
  steps?: string[];
  currentStep?: number;
}

export const FullscreenLoading: React.FC<FullscreenLoadingProps> = ({
  isLoading,
  loadingText = 'Loading...',
  spinner,
  progress,
  steps,
  currentStep = 0
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="text-center space-y-6 max-w-md px-6">
            {/* Spinner or Progress */}
            <div className="flex justify-center">
              {progress !== undefined ? (
                <ProgressRing progress={progress} size={80} showPercentage />
              ) : (
                spinner || <Spinner size="xl" color="white" />
              )}
            </div>

            {/* Loading Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h3 className="text-xl font-semibold text-white">{loadingText}</h3>
              
              {/* Steps */}
              {steps && (
                <div className="space-y-1">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0.5 }}
                      animate={{ 
                        opacity: index === currentStep ? 1 : index < currentStep ? 0.8 : 0.5 
                      }}
                      className={cn(
                        'text-sm transition-colors',
                        index === currentStep ? 'text-purple-400' : 
                        index < currentStep ? 'text-green-400' : 'text-gray-400'
                      )}
                    >
                      {index < currentStep ? '✓' : index === currentStep ? '●' : '○'} {step}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Loading Button
// ============================================================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  spinner?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText,
  spinner,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-700/50 text-gray-300'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center"
          >
            {spinner || <Spinner size="sm" color="white" />}
            {loadingText && <span className="ml-2">{loadingText}</span>}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

// ============================================================================
// Loading Provider & Hook
// ============================================================================

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingText: string;
  setLoadingText: (text: string) => void;
  progress: number;
  setProgress: (progress: number) => void;
}

const LoadingContext = React.createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [progress, setProgress] = useState(0);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setProgress(0);
      setLoadingText('Loading...');
    }
  };

  const value: LoadingContextType = {
    isLoading,
    setLoading,
    loadingText,
    setLoadingText,
    progress,
    setProgress
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <FullscreenLoading
        isLoading={isLoading}
        loadingText={loadingText}
        progress={progress > 0 ? progress : undefined}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// ============================================================================
// Utility Hook for Async Operations
// ============================================================================

export const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async <T>(
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      loadingText?: string;
    }
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      options?.onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, execute };
};

export default {
  Spinner,
  PulseLoader,
  ProgressRing,
  Skeleton,
  CardSkeleton,
  ListItemSkeleton,
  TableRowSkeleton,
  LoadingOverlay,
  FullscreenLoading,
  LoadingButton,
  LoadingProvider,
  useLoading,
  useAsyncOperation
}; 