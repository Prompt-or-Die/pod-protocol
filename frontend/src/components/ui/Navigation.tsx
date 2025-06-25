'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CogIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CommandLineIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import Logo from './Logo';
import Button from './Button';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
  submenu?: NavigationItem[];
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

const mainNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Channels', href: '/channels', icon: ChatBubbleLeftRightIcon },
  { name: 'Agents', href: '/agents', icon: UserGroupIcon },
  { name: 'Terminal', href: '/terminal', icon: CommandLineIcon },
];

const secondaryNavigation: NavigationItem[] = [
  { name: 'Documentation', href: '/docs', icon: DocumentTextIcon },
  { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle, className }) => {
  const router = useRouter();
  const pathname = router.pathname;
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleSubmenu = (itemName: string) => {
    setExpandedMenus(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const NavItem: React.FC<{ item: NavigationItem; isMain?: boolean }> = ({ item, isMain = false }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.name);
    const active = isActive(item.href);

    if (hasSubmenu) {
      return (
        <div>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group',
              active 
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={item.disabled}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={cn(
                'w-5 h-5 transition-colors',
                active ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'
              )} />
              {!collapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </div>
            {!collapsed && (
              <ChevronDownIcon 
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </button>

          {/* Submenu */}
          {!collapsed && isExpanded && item.submenu && (
            <div className="mt-2 ml-8 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                    isActive(subItem.href)
                      ? 'bg-purple-600/20 text-purple-300'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                  )}
                >
                  <subItem.icon className="w-4 h-4" />
                  <span>{subItem.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
          active 
            ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 border border-purple-500/30' 
            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white',
          item.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <item.icon className={cn(
          'w-5 h-5 transition-colors',
          active ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'
        )} />
        {!collapsed && (
          <>
            <span className="font-medium">{item.name}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-auto bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
        
        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {item.name}
            {item.badge && item.badge > 0 && (
              <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border-r border-purple-500/20',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Logo 
          variant={collapsed ? 'icon' : 'full'} 
          size="md"
          animated
          className={cn('transition-all duration-300', collapsed && 'justify-center')}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Main
            </p>
          )}
          {mainNavigation.map((item) => (
            <NavItem key={item.href} item={item} isMain />
          ))}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-800" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              General
            </p>
          )}
          {secondaryNavigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="text-xs text-gray-400 text-center">
            PoD Protocol v1.0.0
          </div>
        )}
      </div>
    </div>
  );
};

// Top Navigation Bar
interface TopNavProps {
  onSidebarToggle?: () => void;
  className?: string;
}

const TopNav: React.FC<TopNavProps> = ({ onSidebarToggle, className }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={cn(
      'flex items-center justify-between h-16 px-4 bg-gray-900/95 backdrop-blur-sm border-b border-purple-500/20',
      className
    )}>
      {/* Left Side */}
      <div className="flex items-center space-x-4">
        {onSidebarToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels, agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-gray-100 placeholder-gray-400 w-64"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative"
        >
          <BellIcon className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">U</span>
            </div>
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { Sidebar, TopNav, type NavigationItem };
export default Sidebar;
