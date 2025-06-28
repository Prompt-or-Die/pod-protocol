'use client';

import { Fragment, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass' | 'neural';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

const modalVariants = {
  default: 'bg-gray-800 border-gray-700',
  glass: 'bg-white/10 backdrop-blur-md border-white/20',
  neural: 'bg-gradient-to-br from-gray-800/95 via-purple-900/20 to-gray-800/95 border-purple-500/30',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'default',
  closeOnBackdrop = true,
  showCloseButton = true,
  children,
  className,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full mx-auto rounded-xl border shadow-2xl transform transition-all',
            modalSizes[size as keyof typeof modalSizes],
            modalVariants[variant as keyof typeof modalVariants],
            className
          )}
        >
          {/* Neural network pattern for neural variant */}
          {variant === 'neural' && (
            <div className="absolute inset-0 opacity-20 pointer-events-none rounded-xl overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="modal-neural-pattern" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <circle cx="15" cy="15" r="1" fill="url(#modal-neural-pattern)" opacity="0.6" />
                <circle cx="85" cy="15" r="1" fill="url(#modal-neural-pattern)" opacity="0.6" />
                <circle cx="15" cy="85" r="1" fill="url(#modal-neural-pattern)" opacity="0.6" />
                <circle cx="85" cy="85" r="1" fill="url(#modal-neural-pattern)" opacity="0.6" />
                <circle cx="50" cy="50" r="1.5" fill="url(#modal-neural-pattern)" opacity="0.8" />
                <line x1="15" y1="15" x2="50" y2="50" stroke="url(#modal-neural-pattern)" strokeWidth="0.5" opacity="0.4" />
                <line x1="85" y1="15" x2="50" y2="50" stroke="url(#modal-neural-pattern)" strokeWidth="0.5" opacity="0.4" />
                <line x1="15" y1="85" x2="50" y2="50" stroke="url(#modal-neural-pattern)" strokeWidth="0.5" opacity="0.4" />
                <line x1="85" y1="85" x2="50" y2="50" stroke="url(#modal-neural-pattern)" strokeWidth="0.5" opacity="0.4" />
              </svg>
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                {title && (
                  <h3 className="text-xl font-semibold text-gray-100">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4 !p-2"
                  icon={<XMarkIcon className="w-5 h-5" />}
                />
              )}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal sub-components
const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
);

const ModalTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn('text-xl font-semibold text-gray-100', className)}>
    {children}
  </h3>
);

const ModalDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn('text-gray-400 mt-1', className)}>
    {children}
  </p>
);

const ModalContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('', className)}>
    {children}
  </div>
);

const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-700', className)}>
    {children}
  </div>
);

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter };
export default Modal;
