'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CubeTransparentIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CubeTransparentIcon as CubeTransparentIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';

type ActivePage = 'home' | 'agents' | 'channels' | 'analytics' | 'zk-compression' | 'discovery' | 'settings';

interface MobileNavigationProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  className?: string;
}

interface NavItem {
  id: ActivePage;
  name: string;
  icon: React.ComponentType<any>;
  iconSolid: React.ComponentType<any>;
  color: string;
  shortName: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'home',
    name: 'Dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    color: 'text-blue-400',
    shortName: 'Home'
  },
  {
    id: 'agents',
    name: 'AI Agents',
    icon: CpuChipIcon,
    iconSolid: CpuChipIconSolid,
    color: 'text-purple-400',
    shortName: 'Agents'
  },
  {
    id: 'channels',
    name: 'Channels',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid,
    color: 'text-cyan-400',
    shortName: 'Chat'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    color: 'text-green-400',
    shortName: 'Stats'
  },
  {
    id: 'discovery',
    name: 'Discovery',
    icon: MagnifyingGlassIcon,
    iconSolid: MagnifyingGlassIconSolid,
    color: 'text-yellow-400',
    shortName: 'Find'
  }
];

const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  activePage, 
  onPageChange, 
  className 
}) => {
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/50 lg:hidden',
      className
    )}>
      {/* Safe area padding for devices with home indicators */}
      <div className="pb-safe">
        <div className="grid grid-cols-5 px-2 py-2">
          {navigationItems.map((item) => {
            const isActive = activePage === item.id;
            const IconComponent = isActive ? item.iconSolid : item.icon;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-h-[48px] relative',
                  isActive 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-gray-300 active:scale-95'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavActiveBackground"
                    className="absolute inset-0 bg-gray-800/60 rounded-lg"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35
                    }}
                  />
                )}
                
                {/* Icon and label */}
                <div className="relative flex flex-col items-center space-y-1">
                  <div className="relative">
                    <IconComponent className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? item.color : 'text-current'
                    )} />
                    
                    {/* Active indicator dot */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                          item.color.replace('text-', 'bg-')
                        )}
                      />
                    )}
                  </div>
                  
                  <span className={cn(
                    'text-xs font-medium transition-colors leading-none',
                    isActive ? item.color : 'text-current'
                  )}>
                    {item.shortName}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Floating Action Button for quick actions
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ComponentType<any>;
  className?: string;
  color?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon: Icon,
  className,
  color = 'bg-purple-600 hover:bg-purple-700'
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center text-white transition-all lg:hidden',
        color,
        className
      )}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 35
      }}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  );
};

// Mobile swipe gesture handler
export const useMobileSwipeNavigation = (
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold: number = 50
) => {
  const [startX, setStartX] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX === null) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }

    setStartX(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
};

export default MobileNavigation;