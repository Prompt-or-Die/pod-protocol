'use client';

import { toast, Toaster } from 'react-hot-toast';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface CustomToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

const toastColors = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const CustomToast: React.FC<CustomToastProps & { id: string; visible: boolean }> = ({
  id,
  type,
  title,
  message,
  action,
  visible,
}) => {
  const Icon = toastIcons[type];

  return (
    <div
      className={cn(
        'max-w-md w-full bg-gray-800/95 backdrop-blur-md border rounded-lg p-4 shadow-lg transition-all duration-300',
        toastColors[type],
        visible ? 'animate-slide-up opacity-100' : 'opacity-0'
      )}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-100">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-sm text-gray-300">
              {message}
            </p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Toast utility functions
export const showToast = {
  success: (title: string, message?: string, options?: { duration?: number; action?: CustomToastProps['action'] }) => {
    toast.custom((t) => (
      <CustomToast
        id={t.id}
        type="success"
        title={title}
        message={message}
        action={options?.action}
        visible={t.visible}
      />
    ), {
      duration: options?.duration || 4000,
    });
  },

  error: (title: string, message?: string, options?: { duration?: number; action?: CustomToastProps['action'] }) => {
    toast.custom((t) => (
      <CustomToast
        id={t.id}
        type="error"
        title={title}
        message={message}
        action={options?.action}
        visible={t.visible}
      />
    ), {
      duration: options?.duration || 6000,
    });
  },

  warning: (title: string, message?: string, options?: { duration?: number; action?: CustomToastProps['action'] }) => {
    toast.custom((t) => (
      <CustomToast
        id={t.id}
        type="warning"
        title={title}
        message={message}
        action={options?.action}
        visible={t.visible}
      />
    ), {
      duration: options?.duration || 5000,
    });
  },

  info: (title: string, message?: string, options?: { duration?: number; action?: CustomToastProps['action'] }) => {
    toast.custom((t) => (
      <CustomToast
        id={t.id}
        type="info"
        title={title}
        message={message}
        action={options?.action}
        visible={t.visible}
      />
    ), {
      duration: options?.duration || 4000,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        const successMessage = typeof messages.success === 'function' ? messages.success(data) : messages.success;
        return successMessage;
      },
      error: (error) => {
        const errorMessage = typeof messages.error === 'function' ? messages.error(error) : messages.error;
        return errorMessage;
      },
    });
  },
};

// Enhanced Toaster Component
export const EnhancedToaster: React.FC = () => (
  <Toaster
    position="top-right"
    gutter={8}
    containerClassName="top-4 right-4"
    toastOptions={{
      duration: 4000,
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        boxShadow: 'none',
      },
    }}
  />
);

export default CustomToast;
