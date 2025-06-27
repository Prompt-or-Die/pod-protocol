'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  Zap, 
  Target, 
  Trophy
} from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'pod' | 'achievement' | 'dopamine';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DopamineToastProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

const DopamineToast: React.FC<DopamineToastProps> = ({ toasts, onRemove }) => {
  const getToastConfig = (type: ToastData['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          gradient: 'from-green-500 to-emerald-600',
          borderColor: 'border-green-500/50',
          shadowColor: 'shadow-green-500/25',
          emoji: '✅',
          particles: ['🎉', '✨', '🌟']
        };
      case 'error':
        return {
          icon: AlertCircle,
          gradient: 'from-red-500 to-rose-600',
          borderColor: 'border-red-500/50',
          shadowColor: 'shadow-red-500/25',
          emoji: '❌',
          particles: ['💥', '⚠️', '🔥']
        };
      case 'warning':
        return {
          icon: AlertCircle,
          gradient: 'from-yellow-500 to-orange-600',
          borderColor: 'border-yellow-500/50',
          shadowColor: 'shadow-yellow-500/25',
          emoji: '⚠️',
          particles: ['⚡', '🔔', '💡']
        };
      case 'info':
        return {
          icon: Info,
          gradient: 'from-blue-500 to-cyan-600',
          borderColor: 'border-blue-500/50',
          shadowColor: 'shadow-blue-500/25',
          emoji: 'ℹ️',
          particles: ['💫', '🔮', '✨']
        };
      case 'pod':
        return {
          icon: Target,
          gradient: 'from-purple-600 to-violet-700',
          borderColor: 'border-purple-500/50',
          shadowColor: 'shadow-purple-500/25',
          emoji: '🎯',
          particles: ['💀', '⚡', '🚀']
        };
      case 'achievement':
        return {
          icon: Trophy,
          gradient: 'from-yellow-400 to-orange-500',
          borderColor: 'border-yellow-400/50',
          shadowColor: 'shadow-yellow-400/25',
          emoji: '🏆',
          particles: ['🎊', '🌟', '💎']
        };
      case 'dopamine':
        return {
          icon: Zap,
          gradient: 'from-pink-500 to-purple-600',
          borderColor: 'border-pink-500/50',
          shadowColor: 'shadow-pink-500/25',
          emoji: '⚡',
          particles: ['💖', '✨', '🦄']
        };
      default:
        return {
          icon: Info,
          gradient: 'from-gray-500 to-gray-600',
          borderColor: 'border-gray-500/50',
          shadowColor: 'shadow-gray-500/25',
          emoji: 'ℹ️',
          particles: ['✨']
        };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = getToastConfig(toast.type);
          const IconComponent = config.icon;
          
          return (
            <ToastItem
              key={toast.id}
              toast={toast}
              config={config}
              IconComponent={IconComponent}
              onRemove={onRemove}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastData;
  config: Record<string, unknown>;
  IconComponent: React.ComponentType<{ className?: string }>;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, config, IconComponent, onRemove }) => {
  const [showParticles, setShowParticles] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          onRemove(toast.id);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    // Hide particles after 2 seconds
    const particleTimer = setTimeout(() => {
      setShowParticles(false);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(particleTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02, x: -5 }}
      className={`relative bg-gradient-to-r ${config.gradient} p-4 rounded-xl border ${config.borderColor} backdrop-blur-sm shadow-xl ${config.shadowColor} overflow-hidden`}
      style={{
        boxShadow: `0 10px 40px ${(config.shadowColor as string).replace('shadow-', 'rgba(').replace('/25', ', 0.25)')}`,
      }}
    >
      {/* Animated Background */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12"
      />

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-white/60"
        />
      </div>

      {/* Particles */}
      <AnimatePresence>
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 100 + '%',
                  y: '50%',
                  scale: 0,
                  opacity: 0
                }}
                animate={{
                  y: ['-20%', '-100%'],
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  x: `${Math.random() * 100}%`
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  ease: 'easeOut'
                }}
                className="absolute text-lg"
              >
                {(config.particles as string[])[Math.floor(Math.random() * (config.particles as string[]).length)]}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex items-start space-x-3">
        {/* Icon with pulse animation */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="flex-shrink-0"
        >
          <IconComponent className="w-6 h-6 text-white drop-shadow-lg" />
        </motion.div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-2 mb-1"
          >
            <h4 className="font-bold text-white text-sm drop-shadow">
              {toast.title}
            </h4>
            <span className="text-lg">{config.emoji as string}</span>
          </motion.div>
          
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/90 text-xs leading-relaxed drop-shadow-sm"
          >
            {toast.message}
          </motion.p>

          {/* Action Button */}
          {toast.action && (
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toast.action.onClick}
              className="mt-2 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm transition-all duration-200"
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Special effects for certain types */}
      {toast.type === 'pod' && (
        <motion.div
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-violet-700/20 rounded-xl"
        />
      )}

      {toast.type === 'achievement' && (
        <motion.div
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute top-2 right-2 text-yellow-300 text-xl"
        >
          ✨
        </motion.div>
      )}

      {toast.type === 'dopamine' && (
        <>
          <motion.div
            animate={{
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-purple-600/30 rounded-xl"
          />
          <div className="absolute top-1 right-1 text-pink-300 text-sm animate-bounce">
            💖
          </div>
        </>
      )}
    </motion.div>
  );
};

// Hook for managing dopamine toasts
export const useDopamineToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // Predefined dopamine-inducing toasts
  const podToast = (message: string) => {
    addToast({
      type: 'pod',
      title: '🎯 PROMPT OR DIE!',
      message,
      duration: 4000
    });
  };

  const achievementToast = (title: string, message: string) => {
    addToast({
      type: 'achievement',
      title: `🏆 ${title}`,
      message,
      duration: 6000
    });
  };

  const dopamineToast = (message: string) => {
    addToast({
      type: 'dopamine',
      title: '⚡ DOPAMINE HIT!',
      message,
      duration: 3000
    });
  };

  const successToast = (message: string) => {
    addToast({
      type: 'success',
      title: '✅ Success!',
      message,
      duration: 4000
    });
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    podToast,
    achievementToast,
    dopamineToast,
    successToast
  };
};

export default DopamineToast;