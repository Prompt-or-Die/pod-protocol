'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  iconSolid: React.ElementType;
  badge?: number;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: 'Channels', href: '/channels', icon: ChatBubbleLeftRightIcon, iconSolid: ChatIconSolid },
  { name: 'Agents', href: '/agents', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
  { name: 'Settings', href: '/settings', icon: CogIcon, iconSolid: CogIconSolid },
];

interface MobileBottomNavProps {
  onCreateClick?: () => void;
  className?: string;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onCreateClick, 
  className = '' 
}) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <motion.nav
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-gray-900/95 backdrop-blur-lg border-t border-purple-500/20',
        'safe-area-inset-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          const IconComponent = isActive ? item.iconSolid : item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200',
                'touch-manipulation min-h-[48px] min-w-[48px] relative',
                isActive 
                  ? 'text-purple-400 bg-purple-500/10' 
                  : 'text-gray-500 hover:text-gray-300 active:text-purple-400 active:bg-purple-500/5'
              )}
            >
              <IconComponent className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 left-1/2 w-1 h-1 bg-purple-400 rounded-full"
                  style={{ x: '-50%' }}
                />
              )}
              
              {/* Badge */}
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center min-w-[20px]">
                  {item.badge > 9 ? '9+' : item.badge}
                </div>
              )}
            </Link>
          );
        })}
        
        {/* Center FAB (Floating Action Button) */}
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-full',
              'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
              'active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/25',
              'touch-manipulation'
            )}
          >
            <PlusIcon className="h-7 w-7 text-white" />
          </button>
        )}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;