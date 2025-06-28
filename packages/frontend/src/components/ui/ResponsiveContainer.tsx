'use client';

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'narrow' | 'wide' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}) => {
  const containerClasses = {
    default: 'max-w-7xl mx-auto',
    narrow: 'max-w-4xl mx-auto',
    wide: 'max-w-full mx-auto',
    full: 'w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 sm:px-6',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
    xl: 'px-8 sm:px-12 lg:px-16',
  };

  return (
    <div className={cn(
      containerClasses[variant],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;