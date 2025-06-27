'use client';

import { ReactNode, useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallback?: ReactNode;
}

interface AsyncErrorState {
  hasAsyncError: boolean;
  asyncError?: Error;
  retryCount: number;
}

const AsyncErrorBoundary: React.FC<Props> = ({ children, onRetry, fallback }) => {
  const [asyncErrorState, setAsyncErrorState] = useState<AsyncErrorState>({
    hasAsyncError: false,
    retryCount: 0,
  });

  // Listen for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      setAsyncErrorState(prev => ({
        hasAsyncError: true,
        asyncError: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        retryCount: prev.retryCount,
      }));

      // Prevent the default browser behavior
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleRetry = () => {
    setAsyncErrorState(prev => ({
      hasAsyncError: false,
      asyncError: undefined,
      retryCount: prev.retryCount + 1,
    }));

    if (onRetry) {
      onRetry();
    }
  };

  const handleReset = () => {
    setAsyncErrorState({
      hasAsyncError: false,
      asyncError: undefined,
      retryCount: 0,
    });
  };

  if (asyncErrorState.hasAsyncError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 border border-orange-500/20 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-4">
              Connection Error
            </h3>
            
            <p className="text-gray-400 mb-6">
              We couldn't complete your request. This might be due to a network issue or server problem.
            </p>

            {process.env.NODE_ENV === 'development' && asyncErrorState.asyncError && (
              <details className="text-left mb-6">
                <summary className="text-orange-400 cursor-pointer mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 font-mono">
                  <div className="mb-2">
                    <strong>Message:</strong> {asyncErrorState.asyncError.message}
                  </div>
                  {asyncErrorState.asyncError.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="text-xs mt-1 overflow-auto">
                        {asyncErrorState.asyncError.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Retry ({asyncErrorState.retryCount + 1})
              </button>
              
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      key={asyncErrorState.retryCount} // Reset error boundary on retry
      onError={(error, errorInfo) => {
        console.error('Sync error caught by ErrorBoundary:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AsyncErrorBoundary;