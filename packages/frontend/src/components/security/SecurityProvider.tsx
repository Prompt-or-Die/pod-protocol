'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializeSecurity, sanitizeInput, rateLimiter } from '../../lib/security';

interface SecurityContextType {
  sanitize: typeof sanitizeInput;
  rateLimit: typeof rateLimiter;
  initialized: boolean;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({
  children,
}) => {
  useEffect(() => {
    // Initialize security measures on the client side
    initializeSecurity();
  }, []);

  const value: SecurityContextType = {
    sanitize: sanitizeInput,
    rateLimit: rateLimiter,
    initialized: true,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityProvider;