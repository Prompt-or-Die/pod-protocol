'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializePerformanceOptimizations } from '../../lib/performance';

interface PerformanceContextType {
  initialized: boolean;
}

const PerformanceContext = createContext<PerformanceContextType>({
  initialized: false,
});

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
}) => {
  useEffect(() => {
    // Initialize performance optimizations on the client side
    initializePerformanceOptimizations();
  }, []);

  const value: PerformanceContextType = {
    initialized: true,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export default PerformanceProvider;