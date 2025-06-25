'use client';

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: { container: 'h-8', icon: 'w-8 h-8', text: 'text-lg' },
  md: { container: 'h-10', icon: 'w-10 h-10', text: 'text-xl' },
  lg: { container: 'h-12', icon: 'w-12 h-12', text: 'text-2xl' },
  xl: { container: 'h-16', icon: 'w-16 h-16', text: 'text-4xl' },
};

const LogoIcon: React.FC<{ size: keyof typeof sizeClasses; animated?: boolean }> = ({ size, animated = true }) => {
  const iconAnimation = animated ? {
    animate: { 
      rotate: [0, 360],
      scale: [1, 1.05, 1],
    },
    transition: { 
      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    }
  } : {};

  return (
    <motion.div
      className={cn(
        'relative rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-emerald-500 p-0.5',
        sizeClasses[size].icon
      )}
      {...iconAnimation}
    >
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <circle cx="8" cy="8" r="1" fill="url(#neural-gradient)" />
            <circle cx="24" cy="8" r="1" fill="url(#neural-gradient)" />
            <circle cx="8" cy="24" r="1" fill="url(#neural-gradient)" />
            <circle cx="24" cy="24" r="1" fill="url(#neural-gradient)" />
            <circle cx="16" cy="16" r="1.5" fill="url(#neural-gradient)" />
            <line x1="8" y1="8" x2="16" y2="16" stroke="url(#neural-gradient)" strokeWidth="0.5" />
            <line x1="24" y1="8" x2="16" y2="16" stroke="url(#neural-gradient)" strokeWidth="0.5" />
            <line x1="8" y1="24" x2="16" y2="16" stroke="url(#neural-gradient)" strokeWidth="0.5" />
            <line x1="24" y1="24" x2="16" y2="16" stroke="url(#neural-gradient)" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* Main P logo */}
        <span className={cn(
          'font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-blue-400 to-emerald-400 relative z-10',
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : size === 'lg' ? 'text-lg' : 'text-2xl'
        )}>
          P
        </span>
      </div>
    </motion.div>
  );
};

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'full', 
  className,
  animated = true 
}) => {
  const textAnimation = animated ? {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, delay: 0.2 }
  } : {};

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center', className)}>
        <LogoIcon size={size} animated={animated} />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <motion.div 
        className={cn('flex items-center', className)}
        {...textAnimation}
      >
        <span className={cn(
          'font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400',
          sizeClasses[size].text
        )}>
          PoD Protocol
        </span>
      </motion.div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3', sizeClasses[size].container, className)}>
      <LogoIcon size={size} animated={animated} />
      {variant === 'full' && (
        <motion.div className="flex flex-col" {...textAnimation}>
          <span className={cn(
            'font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400',
            sizeClasses[size].text
          )}>
            PoD Protocol
          </span>
          <span className="text-xs text-gray-400 font-medium -mt-1">
            Prompt or Die
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default Logo;
