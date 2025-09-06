import { useState, useEffect, useCallback } from 'react';

export interface User {
  user_id: string;
  email: string;
  name: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  getUserId: () => string | null;
}

const STORAGE_KEY = 'praxis_user';

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('User loaded from storage:', userData);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User) => {
    try {
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      console.log('User logged in and stored:', userData);
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('User logged out');
  }, []);

  const getUserId = useCallback((): string | null => {
    return user?.user_id || null;
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    getUserId,
  };
};
