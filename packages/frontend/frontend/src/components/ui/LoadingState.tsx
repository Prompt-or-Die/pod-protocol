'use client';

import { motion } from 'framer-motion';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpinner?: boolean;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  submessage,
  size = 'md',
  showSpinner = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      spinner: 'w-6 h-6',
      title: 'text-lg',
      subtitle: 'text-sm',
    },
    md: {
      container: 'py-12',
      spinner: 'w-8 h-8',
      title: 'text-xl',
      subtitle: 'text-base',
    },
    lg: {
      container: 'py-20',
      spinner: 'w-12 h-12',
      title: 'text-2xl',
      subtitle: 'text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${classes.container} ${className}`}>
      {showSpinner && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="mb-4"
        >
          <ArrowPathIcon className={`${classes.spinner} text-purple-400`} />
        </motion.div>
      )}
      
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`font-semibold text-white mb-2 ${classes.title}`}
      >
        {message}
      </motion.h3>
      
      {submessage && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-gray-400 ${classes.subtitle}`}
        >
          {submessage}
        </motion.p>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    }}
    className={className}
  >
    <ArrowPathIcon style={{ width: size, height: size }} className="text-purple-400" />
  </motion.div>
);

export const LoadingDots: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div className={`flex space-x-1 ${className}`}>
    {[0, 1, 2].map((index) => (
      <motion.div
        key={index}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: index * 0.2,
        }}
        className="w-2 h-2 bg-purple-400 rounded-full"
      />
    ))}
  </div>
);

export const LoadingPulse: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={`w-4 h-4 bg-purple-400 rounded-full ${className}`}
  />
);

export default LoadingState;