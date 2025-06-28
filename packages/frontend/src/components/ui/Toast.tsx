'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Toast Interface
export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  persistent?: boolean;
  progress?: number;
}

// Toast Context
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
      dismissible: toast.dismissible ?? true
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts, defaultDuration]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    updateToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position={position} />
    </ToastContext.Provider>
  );
};

// Toast Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  // Helper methods for different toast types
  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return context.addToast({ type: 'success', message, ...options });
  }, [context]);

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return context.addToast({ type: 'error', message, duration: 7000, ...options });
  }, [context]);

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return context.addToast({ type: 'warning', message, ...options });
  }, [context]);

  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return context.addToast({ type: 'info', message, ...options });
  }, [context]);

  const loading = useCallback((message: string, options?: Partial<Toast>) => {
    return context.addToast({ 
      type: 'loading', 
      message, 
      persistent: true, 
      dismissible: false,
      ...options 
    });
  }, [context]);

  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ): Promise<T> => {
    const loadingId = loading(options.loading);

    try {
      const result = await promise;
      context.removeToast(loadingId);
      success(
        typeof options.success === 'function' 
          ? options.success(result) 
          : options.success
      );
      return result;
    } catch (err) {
      context.removeToast(loadingId);
      const errorMessage = typeof options.error === 'function' 
        ? options.error(err as Error) 
        : options.error;
      error(errorMessage);
      throw err;
    }
  }, [context, loading, success, error]);

  return {
    ...context,
    success,
    error,
    warning,
    info,
    loading,
    promise
  };
};

// Toast Container
interface ToastContainerProps {
  position: ToastPosition;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ position }) => {
  const { toasts } = useToast();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col space-y-2 pointer-events-none',
        positionClasses[position]
      )}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Toast Component
interface ToastItemProps {
  toast: Toast;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const { removeToast } = useToast();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (toast.persistent || !toast.duration || isPaused) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (toast.duration! / 100));
        if (newProgress <= 0) {
          removeToast(toast.id);
          toast.onDismiss?.();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast.duration, toast.persistent, isPaused, removeToast, toast.id, toast.onDismiss, toast]);

  const handleDismiss = () => {
    removeToast(toast.id);
    toast.onDismiss?.();
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className={cn(iconClass, "text-green-400")} />;
      case 'error':
        return <XCircleIcon className={cn(iconClass, "text-red-400")} />;
      case 'warning':
        return <ExclamationTriangleIcon className={cn(iconClass, "text-yellow-400")} />;
      case 'info':
        return <InformationCircleIcon className={cn(iconClass, "text-blue-400")} />;
      case 'loading':
        return (
          <motion.div
            className={cn(iconClass, "border-2 border-gray-300 border-t-purple-500 rounded-full")}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        );
      default:
        return <InformationCircleIcon className={cn(iconClass, "text-gray-400")} />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500/20 bg-green-900/20';
      case 'error':
        return 'border-red-500/20 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-900/20';
      case 'info':
        return 'border-blue-500/20 bg-blue-900/20';
      case 'loading':
        return 'border-purple-500/20 bg-purple-900/20';
      default:
        return 'border-gray-500/20 bg-gray-900/20';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative max-w-sm w-full bg-gray-800/90 backdrop-blur-sm border rounded-lg shadow-lg pointer-events-auto',
        'p-4 flex items-start space-x-3',
        getColorClasses()
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-medium text-white mb-1">
            {toast.title}
          </div>
        )}
        <div className="text-sm text-gray-300">
          {toast.message}
        </div>
        
        {toast.action && (
          <div className="mt-3">
            <button
              onClick={toast.action.onClick}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}

      {/* Progress Bar */}
      {!toast.persistent && toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-current opacity-50"
            style={{ width: `${progress}%` }}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Custom Progress */}
      {toast.progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-purple-500"
            initial={{ width: '0%' }}
            animate={{ width: `${toast.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
};

// Utility component for easy toast notifications
export const ToastManager = {
  success: (message: string, options?: Partial<Toast>) => {
    // This would be called from the useToast hook in practice
    console.log('Toast success:', message, options);
  },
  error: (message: string, options?: Partial<Toast>) => {
    console.log('Toast error:', message, options);
  },
  warning: (message: string, options?: Partial<Toast>) => {
    console.log('Toast warning:', message, options);
  },
  info: (message: string, options?: Partial<Toast>) => {
    console.log('Toast info:', message, options);
  }
};

export default ToastProvider;
