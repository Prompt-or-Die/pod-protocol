'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import Button from './Button';

export type TransactionState = 
  | 'preparing' 
  | 'signing' 
  | 'broadcasting' 
  | 'confirming' 
  | 'confirmed' 
  | 'failed';

interface TransactionStatusProps {
  signature?: string;
  state: TransactionState;
  onRetry?: () => void;
  onDismiss?: () => void;
  confirmations?: number;
  targetConfirmations?: number;
  estimatedTime?: number;
  error?: string;
  className?: string;
}

interface TransactionStep {
  id: TransactionState;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  estimatedTime: number; // seconds
}

const TRANSACTION_STEPS: TransactionStep[] = [
  {
    id: 'preparing',
    label: 'Preparing',
    description: 'Building transaction',
    icon: ClockIcon,
    estimatedTime: 2
  },
  {
    id: 'signing',
    label: 'Signing',
    description: 'Waiting for wallet signature',
    icon: ArrowPathIcon,
    estimatedTime: 5
  },
  {
    id: 'broadcasting',
    label: 'Broadcasting',
    description: 'Sending to network',
    icon: LinkIcon,
    estimatedTime: 3
  },
  {
    id: 'confirming',
    label: 'Confirming',
    description: 'Waiting for confirmation',
    icon: ClockIcon,
    estimatedTime: 15
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    description: 'Transaction successful',
    icon: CheckCircleIcon,
    estimatedTime: 0
  },
  {
    id: 'failed',
    label: 'Failed',
    description: 'Transaction failed',
    icon: XCircleIcon,
    estimatedTime: 0
  }
];

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  signature,
  state,
  onRetry,
  onDismiss,
  confirmations = 0,
  targetConfirmations = 32,
  estimatedTime,
  error,
  className
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state !== 'confirmed' && state !== 'failed') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  const currentStep = TRANSACTION_STEPS.find(step => step.id === state);
  const currentStepIndex = TRANSACTION_STEPS.findIndex(step => step.id === state);
  const isComplete = state === 'confirmed';
  const isFailed = state === 'failed';

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getExplorerUrl = (signature: string) => {
    const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';
    const baseUrl = cluster === 'mainnet-beta' 
      ? 'https://explorer.solana.com' 
      : `https://explorer.solana.com?cluster=${cluster}`;
    return `${baseUrl}/tx/${signature}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-gray-800/90 backdrop-blur-md border rounded-lg p-6 max-w-md mx-auto',
        isComplete && 'border-green-500/30',
        isFailed && 'border-red-500/30',
        !isComplete && !isFailed && 'border-gray-700/50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {currentStep && (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isComplete && 'bg-green-500/20',
              isFailed && 'bg-red-500/20',
              !isComplete && !isFailed && 'bg-purple-500/20'
            )}>
              <currentStep.icon className={cn(
                'h-5 w-5',
                isComplete && 'text-green-400',
                isFailed && 'text-red-400',
                !isComplete && !isFailed && 'text-purple-400'
              )} />
            </div>
          )}
          <div>
            <h3 className="font-bold text-white">
              {currentStep?.label || 'Transaction'}
            </h3>
            <p className="text-sm text-gray-400">
              {currentStep?.description}
            </p>
          </div>
        </div>
        
        {onDismiss && (isComplete || isFailed) && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            ×
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-6">
        {TRANSACTION_STEPS.slice(0, -1).map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                status === 'completed' && 'bg-green-500 text-white',
                status === 'current' && 'bg-purple-500 text-white',
                status === 'pending' && 'bg-gray-600 text-gray-400'
              )}>
                {status === 'completed' ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              
              <div className="flex-1">
                <div className={cn(
                  'text-sm font-medium',
                  status === 'completed' && 'text-green-400',
                  status === 'current' && 'text-white',
                  status === 'pending' && 'text-gray-400'
                )}>
                  {step.label}
                </div>
              </div>

              {status === 'current' && !isComplete && !isFailed && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4"
                >
                  <ArrowPathIcon className="h-4 w-4 text-purple-400" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Progress */}
      {state === 'confirming' && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Confirmations</span>
            <span className="text-white">{confirmations}/{targetConfirmations}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(confirmations / targetConfirmations) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Timing Info */}
      {!isComplete && !isFailed && (
        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
          <span>Elapsed: {formatTime(elapsedTime)}</span>
          {estimatedTime && (
            <span>~{formatTime(estimatedTime)} remaining</span>
          )}
        </div>
      )}

      {/* Error Message */}
      {isFailed && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-400">Transaction Failed</div>
              <div className="text-xs text-red-300 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {signature && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(getExplorerUrl(signature), '_blank')}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            View Explorer
          </Button>
        )}

        {isFailed && onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}

        {isComplete && (
          <div className="flex items-center text-green-400 text-sm">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Success!
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Transaction Status Toast for non-blocking notifications
export const TransactionToast: React.FC<TransactionStatusProps & {
  isVisible: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}> = ({ 
  isVisible, 
  position = 'top-right',
  ...props 
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
          className={cn(
            'fixed z-50 max-w-sm',
            positionClasses[position]
          )}
        >
          <TransactionStatus {...props} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionStatus;