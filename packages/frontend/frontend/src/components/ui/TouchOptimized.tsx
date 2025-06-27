'use client';

import { ReactNode, ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';

// Touch-optimized button with minimum 44px touch target
interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', ...props }, ref) => {
    const baseClasses = 'touch-manipulation transition-all duration-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white focus:ring-purple-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-purple-600/20 active:bg-purple-600/30 text-purple-400 hover:text-purple-300 focus:ring-purple-500',
      danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500',
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[40px] md:min-h-[36px]',
      md: 'px-4 py-3 md:py-2 text-sm md:text-base min-h-[44px] md:min-h-[40px]',
      lg: 'px-6 py-4 md:py-3 text-base md:text-lg min-h-[48px] md:min-h-[44px]',
    };
    
    const widthClasses = fullWidth ? 'w-full flex items-center justify-center' : 'inline-flex items-center justify-center';
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// Touch-optimized input with proper spacing
interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm md:text-base font-medium text-white">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full py-3 md:py-2 px-3 md:px-4 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
              'transition-all duration-200 text-sm md:text-base min-h-[44px] md:min-h-[40px]',
              icon ? 'pl-10' : '',
              error ? 'border-red-500/50 focus:ring-red-500/50' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-400 text-xs md:text-sm">{error}</p>
        )}
      </div>
    );
  }
);

TouchInput.displayName = 'TouchInput';

// Touch-optimized card with proper spacing
interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

export const TouchCard: React.FC<TouchCardProps> = ({ 
  children, 
  onClick, 
  className = '', 
  interactive = false 
}) => {
  const baseClasses = 'bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4 md:p-6';
  const interactiveClasses = interactive 
    ? 'hover:border-purple-500/40 active:border-purple-500/60 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 touch-manipulation'
    : '';
  
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(baseClasses, interactiveClasses, className)}
    >
      {children}
    </Component>
  );
};

// Touch-optimized icon button
interface TouchIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  variant?: 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

export const TouchIconButton = forwardRef<HTMLButtonElement, TouchIconButtonProps>(
  ({ icon, label, variant = 'ghost', size = 'md', className = '', ...props }, ref) => {
    const baseClasses = 'touch-manipulation transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';
    
    const variantClasses = {
      ghost: 'text-gray-400 hover:text-white hover:bg-purple-600/20 active:bg-purple-600/30 focus:ring-purple-500',
      filled: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white focus:ring-purple-500',
    };
    
    const sizeClasses = {
      sm: 'p-2 min-h-[40px] min-w-[40px] md:min-h-[36px] md:min-w-[36px]',
      md: 'p-2 md:p-3 min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]',
      lg: 'p-3 md:p-4 min-h-[48px] min-w-[48px] md:min-h-[44px] md:min-w-[44px]',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        aria-label={label}
        title={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

TouchIconButton.displayName = 'TouchIconButton';

// Swipe gesture hook
export const useSwipe = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) => {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    endX = e.touches[0].clientX;
    endY = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a horizontal or vertical swipe
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// Pull to refresh component
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className = ''
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  let startY = 0;
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    // Only allow pull down when at the top of the container
    const scrollTop = (e.currentTarget as HTMLElement).scrollTop;
    if (scrollTop === 0 && distance > 0) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, threshold));
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center p-4 bg-purple-600/10 backdrop-blur-sm border-b border-purple-500/20">
          <div className="flex items-center space-x-2 text-purple-400">
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></div>
                <span className="text-sm">Refreshing...</span>
              </>
            ) : (
              <span className="text-sm">
                {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div
        style={{
          transform: `translateY(${isPulling ? pullDistance : 0}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};