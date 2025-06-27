'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  HomeIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Button from './ui/Button';

// Error telemetry interface
interface ErrorTelemetry {
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  errorId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, unknown>;
  stackTrace: string;
  componentStack: string;
  errorBoundary: string;
}

// Error classification
interface ErrorClassification {
  type: 'network' | 'validation' | 'runtime' | 'permission' | 'unknown';
  category: 'recoverable' | 'fatal' | 'user-error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage: string;
  recoverySuggestions: string[];
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableTelemetry?: boolean;
  errorBoundaryName?: string;
  showTechnicalDetails?: boolean;
  allowRetry?: boolean;
  context?: Record<string, unknown>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  classification: ErrorClassification | null;
  showTechnicalDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      classification: null,
      showTechnicalDetails: props.showTechnicalDetails || process.env.NODE_ENV === 'development'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
      classification: this.classifyError(error, errorInfo)
    });

    // Send telemetry
    if (this.props.enableTelemetry !== false) {
      this.sendErrorTelemetry(error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Classification:', this.state.classification);
      console.groupEnd();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private classifyError(error: Error, errorInfo: ErrorInfo): ErrorClassification {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: 'network',
        category: 'recoverable',
        severity: 'medium',
        userMessage: 'Connection issue detected. Please check your internet connection.',
        technicalMessage: `Network error: ${error.message}`,
        recoverySuggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ]
      };
    }

    // Permission/Authentication errors
    if (message.includes('unauthorized') || message.includes('permission') || message.includes('forbidden')) {
      return {
        type: 'permission',
        category: 'user-error',
        severity: 'high',
        userMessage: 'Access denied. Please check your permissions or sign in again.',
        technicalMessage: `Permission error: ${error.message}`,
        recoverySuggestions: [
          'Sign out and sign in again',
          'Check your account permissions',
          'Contact support if the issue persists'
        ]
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        type: 'validation',
        category: 'user-error',
        severity: 'low',
        userMessage: 'Invalid input detected. Please check your entries and try again.',
        technicalMessage: `Validation error: ${error.message}`,
        recoverySuggestions: [
          'Check all required fields',
          'Verify input formats',
          'Clear the form and try again'
        ]
      };
    }

    // React component errors
    if (stack.includes('react') || errorInfo.componentStack) {
      return {
        type: 'runtime',
        category: 'fatal',
        severity: 'high',
        userMessage: 'An unexpected error occurred. The page will be refreshed automatically.',
        technicalMessage: `React component error: ${error.message}`,
        recoverySuggestions: [
          'Refresh the page',
          'Clear browser cache',
          'Try a different browser'
        ]
      };
    }

    // Default classification
    return {
      type: 'unknown',
      category: 'fatal',
      severity: 'critical',
      userMessage: 'An unexpected error occurred. Our team has been notified.',
      technicalMessage: error.message,
      recoverySuggestions: [
        'Refresh the page',
        'Try again in a few minutes',
        'Contact support if the issue persists'
      ]
    };
  }

  private async sendErrorTelemetry(error: Error, errorInfo: ErrorInfo) {
    try {
             const telemetry: ErrorTelemetry = {
         timestamp: new Date().toISOString(),
         userAgent: navigator.userAgent,
         url: window.location.href,
         sessionId: this.getSessionId(),
         errorId: this.state.errorId || `fallback_${Date.now()}`,
         severity: this.state.classification?.severity || 'critical',
        context: {
          ...this.props.context,
          retryCount: this.state.retryCount,
          errorBoundary: this.props.errorBoundaryName || 'EnhancedErrorBoundary'
        },
                 stackTrace: error.stack || '',
         componentStack: errorInfo.componentStack || '',
        errorBoundary: this.props.errorBoundaryName || 'EnhancedErrorBoundary'
      };

      // Send to monitoring service (replace with your actual monitoring endpoint)
      if (process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(telemetry)
        });
      }

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Error telemetry sent:', telemetry);
      }
    } catch (telemetryError) {
      console.error('Failed to send error telemetry:', telemetryError);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('pod-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('pod-session-id', sessionId);
    }
    return sessionId;
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState({ retryCount: this.state.retryCount + 1 });

    // Exponential backoff for retries
    const delay = this.retryDelay * Math.pow(2, this.state.retryCount);
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        classification: null
      });
    }, delay);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = async () => {
    const details = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      // You could show a toast notification here
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  private toggleTechnicalDetails = () => {
    this.setState({ showTechnicalDetails: !this.state.showTechnicalDetails });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { classification, retryCount, showTechnicalDetails } = this.state;
      const canRetry = this.props.allowRetry !== false && retryCount < this.maxRetries;
      const isRecoverable = classification?.category === 'recoverable';

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8"
          >
            {/* Error Icon and Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4"
              >
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              </motion.div>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-400">
                {classification?.userMessage || 'An unexpected error occurred. Our team has been notified.'}
              </p>

              {this.state.errorId && (
                <p className="text-sm text-gray-500 mt-2">
                  Error ID: <code className="bg-gray-700 px-2 py-1 rounded text-gray-300">{this.state.errorId}</code>
                </p>
              )}
            </div>

            {/* Recovery Suggestions */}
            {classification?.recoverySuggestions && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-blue-400 font-medium mb-2 flex items-center">
                  <InformationCircleIcon className="w-5 h-5 mr-2" />
                  Try these solutions:
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {classification.recoverySuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              {canRetry && isRecoverable && (
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  className="flex items-center"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Retry {retryCount > 0 && `(${retryCount}/${this.maxRetries})`}
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="flex items-center"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="flex items-center"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Technical Details */}
            <div className="border-t border-gray-700/50 pt-6">
              <button
                onClick={this.toggleTechnicalDetails}
                className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors mb-4"
              >
                <InformationCircleIcon className="w-4 h-4 mr-2" />
                {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
              </button>

              {showTechnicalDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Error Details:</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div><strong>Type:</strong> {classification?.type || 'unknown'}</div>
                      <div><strong>Severity:</strong> {classification?.severity || 'unknown'}</div>
                      <div><strong>Message:</strong> {this.state.error?.message}</div>
                      {this.state.error?.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={this.copyErrorDetails}
                    variant="ghost"
                    size="sm"
                    className="flex items-center text-xs"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                    Copy Error Details
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default export with sensible defaults
const ErrorBoundary: React.FC<Omit<Props, 'enableTelemetry' | 'allowRetry'> & {
  enableTelemetry?: boolean;
  allowRetry?: boolean;
}> = ({ enableTelemetry = true, allowRetry = true, ...props }) => {
  return (
    <EnhancedErrorBoundary
      enableTelemetry={enableTelemetry}
      allowRetry={allowRetry}
      {...props}
    />
  );
};

export default ErrorBoundary;