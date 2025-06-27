'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
      }}
      className={`
        relative group
        bg-gradient-to-br from-gray-900/50 to-gray-800/30
        backdrop-blur-sm
        border border-purple-500/20
        rounded-xl
        p-6
        transition-all duration-300
        hover:border-purple-400/40
        hover:bg-gradient-to-br hover:from-purple-900/20 hover:to-gray-800/40
        ${className}
      `}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-4 text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
          {icon}
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-100 transition-colors duration-300">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
          {description}
        </p>
      </div>
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
};

export default FeatureCard;