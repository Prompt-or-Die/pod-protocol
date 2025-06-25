'use client';

import { ReactNode, useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import useStore from '../store/useStore';
import MatrixRain from '../ui/MatrixRain';
import AsyncErrorBoundary from '../AsyncErrorBoundary';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import { Sidebar, TopNav } from '../ui/Navigation';
import { EnhancedToaster } from '../ui/Toast';
import { cn } from '../../lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const EnhancedDashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useStore();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarCollapsed]);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <AsyncErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        {/* Matrix Rain Background */}
        <MatrixRain />
        
        {/* Toast Notifications */}
        <EnhancedToaster />
        
        {/* Mobile Overlay */}
        {mobileMenuOpen && isMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Layout Container */}
        <div className="relative z-10 flex h-screen">
          {/* Sidebar */}
          <div className={cn(
            'fixed inset-y-0 left-0 z-50 transition-all duration-300',
            // Mobile: full width when open, hidden when closed
            isMobile ? (
              mobileMenuOpen ? 'w-64' : '-translate-x-full w-64'
            ) : (
              // Desktop: responsive width based on collapsed state
              sidebarCollapsed ? 'w-16' : 'w-64'
            )
          )}>
            <Sidebar 
              collapsed={!isMobile && sidebarCollapsed} 
              onToggle={handleSidebarToggle}
            />
          </div>

          {/* Main Content */}
          <div className={cn(
            'flex-1 flex flex-col transition-all duration-300',
            isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-64')
          )}>
            {/* Top Navigation */}
            <TopNav onSidebarToggle={handleSidebarToggle} />

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              <ResponsiveContainer className="p-6">
                {children}
              </ResponsiveContainer>
            </main>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="fixed bottom-4 right-4 z-50">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !hover:from-purple-700 !hover:to-blue-700 !border-0 !rounded-lg !font-medium !transition-all !duration-200" />
        </div>
      </div>
    </AsyncErrorBoundary>
  );
};

export default EnhancedDashboardLayout;
