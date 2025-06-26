'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { cn } from '../../lib/utils';

interface ModernDappCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'neon' | 'neural' | 'quantum' | 'minimal';
  interactive?: boolean;
  glow?: boolean;
  floating?: boolean;
  tilt?: boolean;
  gradient?: string;
  onClick?: () => void;
}

const cardVariants = {
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
  neon: 'bg-gray-900/90 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/25',
  neural: 'bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 border border-purple-500/30',
  quantum: 'bg-gradient-to-r from-indigo-900/30 via-purple-900/30 to-pink-900/30 border border-indigo-500/40',
  minimal: 'bg-gray-800/50 border border-gray-700/50'
};

export const ModernDappCard: React.FC<ModernDappCardProps> = ({
  children,
  className,
  variant = 'glass',
  interactive = true,
  glow = false,
  floating = false,
  tilt = true,
  gradient,
  onClick
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]));
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]));

  // Gesture handling for 3D effects
  const bind = useGesture(
    {
      onMove: ({ xy, offset }) => {
        if (!ref.current || !tilt) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((xy[0] - centerX) / rect.width);
        y.set((xy[1] - centerY) / rect.height);
      },
      onHover: ({ hovering }) => {
        setIsHovered(hovering || false);
        if (!hovering && tilt) {
          x.set(0);
          y.set(0);
        }
      }
    },
    { eventOptions: { passive: false } }
  );

  const cardClasses = cn(
    // Base styles
    'relative rounded-2xl p-6 transition-all duration-500 overflow-hidden group cursor-pointer',
    // Variant styles
    cardVariants[variant],
    // Interactive effects
    interactive && 'hover:scale-105 hover:shadow-2xl',
    // Floating animation
    floating && 'animate-float',
    // Glow effect
    glow && 'shadow-2xl shadow-purple-500/20',
    // Custom className
    className
  );

  return (
    <motion.div
      ref={ref}
      className={cardClasses}
      style={{
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
        transformStyle: 'preserve-3d'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: interactive ? 1.02 : 1 }}
      whileTap={{ scale: interactive ? 0.98 : 1 }}
      onClick={onClick}
      onPointerMove={bind().onPointerMove}
      onPointerEnter={bind().onPointerEnter}
      onPointerLeave={bind().onPointerLeave}
    >
      {/* Background gradient overlay */}
      {gradient && (
        <div 
          className="absolute inset-0 opacity-30 rounded-2xl"
          style={{ background: gradient }}
        />
      )}

      {/* Neural network animation for neural variant */}
      {variant === 'neural' && (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/30 to-purple-400/0 animate-pulse-slow" />
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 animate-pulse-slow delay-1000" />
        </div>
      )}

      {/* Quantum particles for quantum variant */}
      {variant === 'quantum' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: Math.random() * 100 + '%' 
              }}
              animate={{
                x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                y: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
          ))}
        </div>
      )}

      {/* Neon glow effect */}
      {variant === 'neon' && isHovered && (
        <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl animate-pulse" />
      )}

      {/* Glass reflection effect */}
      {variant === 'glass' && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-2xl" />
      )}

      {/* Content */}
      <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>

      {/* Hover overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 rounded-2xl"
        animate={{
          background: isHovered 
            ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(168, 85, 247, 0) 0%, rgba(6, 182, 212, 0) 100%)'
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Interactive light beam effect */}
      {interactive && isHovered && (
        <motion.div
          className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute -top-2 -left-2 w-4 h-4 bg-white/30 rounded-full blur-sm"
            animate={{
              x: [0, 100, 200, 300],
              y: [0, 50, 100, 150],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

// Specialized card variants
export const GlassCard: React.FC<Omit<ModernDappCardProps, 'variant'>> = (props) => (
  <ModernDappCard {...props} variant="glass" />
);

export const NeonCard: React.FC<Omit<ModernDappCardProps, 'variant'>> = (props) => (
  <ModernDappCard {...props} variant="neon" />
);

export const NeuralCard: React.FC<Omit<ModernDappCardProps, 'variant'>> = (props) => (
  <ModernDappCard {...props} variant="neural" />
);

export const QuantumCard: React.FC<Omit<ModernDappCardProps, 'variant'>> = (props) => (
  <ModernDappCard {...props} variant="quantum" />
);

export default ModernDappCard; 