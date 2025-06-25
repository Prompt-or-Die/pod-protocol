'use client';

import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

type CardVariant = 'default' | 'glass' | 'neural' | 'gradient' | 'glow';
type CardSize = 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  elevated?: boolean;
  bordered?: boolean;
  animated?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}

const cardVariants = {
  default: 'bg-gray-800/90 border-gray-700',
  glass: 'bg-white/10 backdrop-blur-md border-white/20',
  neural: 'bg-gradient-to-br from-gray-800/90 via-purple-900/20 to-gray-800/90 border-purple-500/30',
  gradient: 'bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-emerald-900/50 border-purple-500/40',
  glow: 'bg-gray-800/90 border-purple-500/50 shadow-lg shadow-purple-500/25',
};

const cardSizes = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      elevated = true,
      bordered = true,
      animated = true,
      glow = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const cardClasses = cn(
      // Base styles
      'relative overflow-hidden rounded-xl transition-all duration-300',
      // Size
      cardSizes[size as keyof typeof cardSizes],
      // Variant
      cardVariants[variant as keyof typeof cardVariants],
      // Features
      bordered && 'border',
      elevated && 'shadow-xl',
      animated && 'hover:scale-[1.02] hover:shadow-2xl',
      glow && 'animate-pulse-slow',
      // Custom className
      className
    );

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {/* Neural network pattern for neural variant */}
        {variant === 'neural' && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="neural-pattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="2" fill="url(#neural-pattern)" opacity="0.6" />
              <circle cx="80" cy="20" r="2" fill="url(#neural-pattern)" opacity="0.6" />
              <circle cx="20" cy="80" r="2" fill="url(#neural-pattern)" opacity="0.6" />
              <circle cx="80" cy="80" r="2" fill="url(#neural-pattern)" opacity="0.6" />
              <circle cx="50" cy="50" r="3" fill="url(#neural-pattern)" opacity="0.8" />
              <line x1="20" y1="20" x2="50" y2="50" stroke="url(#neural-pattern)" strokeWidth="1" opacity="0.4" />
              <line x1="80" y1="20" x2="50" y2="50" stroke="url(#neural-pattern)" strokeWidth="1" opacity="0.4" />
              <line x1="20" y1="80" x2="50" y2="50" stroke="url(#neural-pattern)" strokeWidth="1" opacity="0.4" />
              <line x1="80" y1="80" x2="50" y2="50" stroke="url(#neural-pattern)" strokeWidth="1" opacity="0.4" />
            </svg>
          </div>
        )}

        {/* Glow effect */}
        {glow && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 animate-pulse" />
        )}

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-semibold text-gray-100', className)} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn('text-gray-400 mt-1', className)} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-gray-700', className)} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;
