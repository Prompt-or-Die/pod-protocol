'use client';

import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'glass' | 'neural';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  glow?: boolean;
  pulse?: boolean;
  className?: string;
}

const buttonVariants = {
  primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600',
  ghost: 'hover:bg-gray-800/50 text-gray-300 hover:text-white border border-transparent hover:border-gray-700',
  danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg shadow-red-500/25',
  success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25',
  warning: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25',
  glass: 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg',
  neural: 'bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg shadow-cyan-500/25 relative overflow-hidden',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <div
    className="inline-block animate-spin"
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="text-current"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
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
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="20"
      />
    </svg>
  </div>
);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      glow = false,
      pulse = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonClasses = cn(
      // Base styles
      'relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 hover:scale-105 active:scale-95',
      // Size
      buttonSizes[size as keyof typeof buttonSizes],
      // Variant
      buttonVariants[variant as keyof typeof buttonVariants],
      // States
      isDisabled && 'opacity-50 cursor-not-allowed',
      glow && 'animate-pulse',
      pulse && 'animate-pulse-slow',
      // Custom className
      className
    );

    const content = (
      <>
        {/* Neural network animation for neural variant */}
        {variant === 'neural' && (
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/40 to-cyan-400/0 animate-pulse"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative flex items-center justify-center space-x-2">
          {loading && <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
          {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
          {children && <span>{children}</span>}
          {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
        </div>
      </>
    );

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
