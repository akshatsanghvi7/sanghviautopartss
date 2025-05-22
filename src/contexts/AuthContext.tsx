
"use client";

import type { User } from '@/lib/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';

interface AuthContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useLocalStorage<User | null>('autocentral-user', null);
  const [isLoading, setIsLoading] = useState(true); // True until initial client-side check is confirmed
  const router = useRouter();

  useEffect(() => {
    // This effect runs once on the client after initial hydration.
    // useLocalStorage already initializes `user` state from localStorage.
    // The primary role of this effect now is to set isLoading to false.
    setIsLoading(false);
  }, []); // Empty dependency array ensures this runs once on mount (client-side)

  const login = useCallback(async (username: string) => {
    // LoginForm has its own loading state, so global isLoading isn't set here.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    const mockUser: User = { id: '1', username };
    setUser(mockUser); // Updates context's user state and localStorage
    router.push('/dashboard');
  }, [setUser, router]);

  const logout = useCallback(() => {
    setUser(null); // Update user state to null and clear localStorage via useLocalStorage
    // Defer navigation to allow React to process the state update for `user`
    // This helps ensure LoginPage sees user as null when it mounts.
    setTimeout(() => {
      router.push('/login');
    }, 0);
  }, [setUser, router]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
