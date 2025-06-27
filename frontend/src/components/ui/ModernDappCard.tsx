'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  tilt?: boolean;
  onClick?: () => void;
}

// Simplified glass card component
export const GlassCard: React.FC<CardProps> = ({ 
  children, 
  className, 
  interactive = false, 
  onClick 
}) => {
  return (
    <div
      className={cn(
        'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg',
        interactive && 'hover:border-purple-500/30 transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Simplified neural card component
export const NeuralCard: React.FC<CardProps> = ({ 
  children, 
  className, 
  interactive = false, 
  onClick 
}) => {
  return (
    <div
      className={cn(
        'bg-gray-800/30 backdrop-blur-sm border border-gray-600/30 rounded-xl',
        interactive && 'hover:border-purple-500/40 transition-all cursor-pointer hover:bg-gray-800/50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Simplified quantum card component (if needed)
export const QuantumCard: React.FC<CardProps> = ({ 
  children, 
  className, 
  interactive = false, 
  onClick 
}) => {
  return (
    <div
      className={cn(
        'bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg',
        interactive && 'hover:border-cyan-500/30 transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Main export for backwards compatibility
export const ModernDappCard: React.FC<CardProps & { variant?: 'glass' | 'neural' | 'quantum' }> = ({ 
  variant = 'glass', 
  ...props 
}) => {
  switch (variant) {
    case 'neural':
      return <NeuralCard {...props} />;
    case 'quantum':
      return <QuantumCard {...props} />;
    default:
      return <GlassCard {...props} />;
  }
};

export default ModernDappCard; 