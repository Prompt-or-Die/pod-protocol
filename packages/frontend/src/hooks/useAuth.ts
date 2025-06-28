'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ApiClient } from '../lib/api-client';
import toast from 'react-hot-toast';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  error: string | null;
}

export const useAuth = () => {
  const { publicKey, signMessage, disconnect } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  });

  const apiClient = new ApiClient();

  // Check authentication status on mount and wallet changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!publicKey) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
        return;
      }

      if (apiClient.isAuthenticated()) {
        try {
          setAuthState(prev => ({ ...prev, isLoading: true }));
          const user = await apiClient.getCurrentUser();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: user.user,
            error: null,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: 'Authentication check failed',
          });
        }
      }
    };

    checkAuthStatus();
  }, [publicKey]);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast.error('Wallet not connected');
      return false;
    }

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get nonce from server
      const { nonce, message } = await apiClient.getNonce(publicKey.toString());

      // Sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      // Convert signature to base58
      const bs58 = await import('bs58');
      const signatureBase58 = bs58.default.encode(signature);

      // Login with signature
      const response = await apiClient.login(
        publicKey.toString(),
        signatureBase58,
        message
      );

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        error: null,
      });

      toast.success('Successfully authenticated!');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: errorMessage,
      });

      toast.error(errorMessage);
      return false;
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      await apiClient.logout();
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      // Disconnect wallet
      await disconnect();
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  }, [disconnect]);

  // Auto-login when wallet connects
  const handleAutoLogin = useCallback(async () => {
    if (publicKey && !authState.isAuthenticated && !authState.isLoading) {
      // Only auto-login if user was previously authenticated
      if (apiClient.isAuthenticated()) {
        // Try to refresh token and get user info
        try {
          const user = await apiClient.getCurrentUser();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: user.user,
            error: null,
          });
        } catch (error) {
          // Token expired or invalid, need to re-authenticate
          console.log('Auto-login failed, user needs to sign in again');
        }
      }
    }
  }, [publicKey, authState.isAuthenticated, authState.isLoading]);

  useEffect(() => {
    handleAutoLogin();
  }, [handleAutoLogin]);

  return {
    ...authState,
    login,
    logout,
    publicKey: publicKey?.toString() || null,
  };
};

export default useAuth;