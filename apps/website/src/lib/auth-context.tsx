'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAccessToken, setAccessToken, setRefreshToken } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  logoutAll: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existingToken = getAccessToken();
    if (existingToken) {
      setToken(existingToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await api.auth.login({ email, password });
    setIsLoading(false);

    if (res.success && res.data) {
      setToken(res.data.accessToken);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Invalid email or password.'
    };
  };

  const logout = async () => {
    setIsLoading(true);
    await api.auth.logout();
    setToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsLoading(false);
  };

  const logoutAll = async () => {
    setIsLoading(true);
    await api.auth.logoutAll();
    setToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        login,
        logout,
        logoutAll
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
