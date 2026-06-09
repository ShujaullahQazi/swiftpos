import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './useToast';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // Check for existing token and user on mount
    const savedToken = localStorage.getItem('swiftpos_token');
    const savedUser = localStorage.getItem('swiftpos_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/login', { email, password });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('swiftpos_token', access_token);
      localStorage.setItem('swiftpos_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please verify credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      localStorage.removeItem('swiftpos_token');
      localStorage.removeItem('swiftpos_user');
      setToken(null);
      setUser(null);
      toast.success('Logged out successfully');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
