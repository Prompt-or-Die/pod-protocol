'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animate = true,
}) => {
  const baseClasses = `bg-gray-700/50 ${rounded ? 'rounded-full' : 'rounded'} ${className}`;
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        style={style}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  return <div className={baseClasses} style={style} />;
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        height="0.875rem"
        width={index === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div className={`bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 ${className}`}>
    <div className="flex items-start space-x-4">
      <SkeletonLoader width={48} height={48} rounded />
      <div className="flex-1 space-y-3">
        <SkeletonLoader height="1.25rem" width="60%" />
        <SkeletonText lines={2} />
        <div className="flex space-x-4">
          <SkeletonLoader width={80} height="0.75rem" />
          <SkeletonLoader width={60} height="0.75rem" />
          <SkeletonLoader width={70} height="0.75rem" />
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonChannelList: React.FC<{ count?: number }> = ({
  count = 3,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

export const SkeletonButton: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <SkeletonLoader
    className={`rounded-lg ${className}`}
    width={120}
    height={40}
  />
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <SkeletonLoader
    className={className}
    width={size}
    height={size}
    rounded
  />
);

export const SkeletonMessage: React.FC<{ isOwn?: boolean }> = ({
  isOwn = false,
}) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`flex space-x-3 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {!isOwn && <SkeletonAvatar size={32} />}
      <div className={`rounded-lg p-3 ${isOwn ? 'bg-purple-600/20' : 'bg-gray-700/50'}`}>
        <SkeletonText lines={Math.floor(Math.random() * 3) + 1} />
      </div>
    </div>
  </div>
);

export const SkeletonChatMessages: React.FC<{ count?: number }> = ({
  count = 5,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonMessage key={index} isOwn={Math.random() > 0.5} />
    ))}
  </div>
);

export default SkeletonLoader;