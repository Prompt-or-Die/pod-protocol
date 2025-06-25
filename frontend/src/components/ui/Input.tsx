'use client';

import { forwardRef, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type InputVariant = 'default' | 'glass' | 'neural' | 'minimal';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  glow?: boolean;
}

const inputVariants = {
  default: 'bg-gray-800 border-gray-600 focus:border-purple-500 focus:ring-purple-500/25',
  glass: 'bg-white/10 backdrop-blur-md border-white/20 focus:border-purple-400 focus:ring-purple-400/25',
  neural: 'bg-gradient-to-r from-gray-800/90 to-gray-800/70 border-purple-500/30 focus:border-purple-400 focus:ring-purple-400/25',
  minimal: 'bg-transparent border-b-2 border-gray-600 focus:border-purple-500 rounded-none focus:ring-0',
};

const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      loading = false,
      glow = false,
      className,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;

    const inputClasses = cn(
      // Base styles
      'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 text-gray-100 placeholder-gray-400',
      // Size
      inputSizes[size as keyof typeof inputSizes],
      // Variant
      inputVariants[variant as keyof typeof inputVariants],
      // Icons
      leftIcon && 'pl-10',
      (rightIcon || type === 'password') && 'pr-10',
      // States
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
      loading && 'opacity-50 cursor-wait',
      glow && 'shadow-lg shadow-purple-500/25',
      // Custom className
      className
    );

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            {...props}
          />

          {/* Right Icon or Password Toggle */}
          {(rightIcon || type === 'password') && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {type === 'password' ? (
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              ) : (
                <div className="text-gray-400">{rightIcon}</div>
              )}
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Hint or Error */}
        {(hint || error) && (
          <p className={cn(
            'mt-2 text-sm',
            error ? 'text-red-400' : 'text-gray-400'
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  hint?: string;
  error?: string;
  loading?: boolean;
  glow?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      hint,
      error,
      loading = false,
      glow = false,
      className,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaClasses = cn(
      // Base styles
      'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 text-gray-100 placeholder-gray-400 resize-none',
      // Size
      inputSizes[size as keyof typeof inputSizes],
      // Variant
      inputVariants[variant as keyof typeof inputVariants],
      // States
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
      loading && 'opacity-50 cursor-wait',
      glow && 'shadow-lg shadow-purple-500/25',
      // Custom className
      className
    );

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={ref}
            rows={rows}
            className={textareaClasses}
            {...props}
          />

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Hint or Error */}
        {(hint || error) && (
          <p className={cn(
            'mt-2 text-sm',
            error ? 'text-red-400' : 'text-gray-400'
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Textarea };
export default Input;
