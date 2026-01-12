import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import useGuestStore from '../store/useGuestStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const { guestDog, hasUsedGuestMode } = useGuestStore();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const userData = await authApi.getProfile();
        setUser(userData);
        setIsGuestMode(false);
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setIsLoading(false);
  }

  async function login(username, password) {
    const data = await authApi.login(username, password);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const userData = await authApi.getProfile();
    setUser(userData);
    setIsGuestMode(false);
    return userData;
  }

  async function register(formData) {
    const data = await authApi.register(formData);
    if (data.tokens) {
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      setUser(data.user);
      setIsGuestMode(false);
    }
    return data;
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsGuestMode(false);
    }
  }

  // Enter guest mode - allows one free dog schedule
  function enterGuestMode() {
    setIsGuestMode(true);
  }

  // Exit guest mode
  function exitGuestMode() {
    setIsGuestMode(false);
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuestMode,
    guestDog,
    hasUsedGuestMode,
    login,
    register,
    logout,
    enterGuestMode,
    exitGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
