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
    try {
      // Cookie is sent automatically — if valid, we get the profile
      const userData = await authApi.getProfile();
      setUser(userData);
      setIsGuestMode(false);
    } catch (error) {
      // Not authenticated — that's fine
    }
    setIsLoading(false);
  }

  async function login(email, password) {
    const data = await authApi.login(email, password);
    // Server sets httpOnly cookies — user data is in the response body
    setUser(data.user);
    setIsGuestMode(false);
    return data.user;
  }

  async function register(formData) {
    const data = await authApi.register(formData);
    // Registration sends OTP — no tokens/cookies yet
    return data;
  }

  async function verifyOTP(email, otp) {
    const data = await authApi.verifyOTP(email, otp);
    // Server sets httpOnly cookies — user data is in the response body
    if (data.user) {
      setUser(data.user);
      setIsGuestMode(false);
    }
    return data;
  }

  async function resendOTP(email) {
    const data = await authApi.resendOTP(email);
    return data;
  }

  async function refreshUser() {
    try {
      const userData = await authApi.getProfile();
      setUser(userData);
    } catch (error) {
      // Ignore refresh errors
    }
  }

  async function logout() {
    try {
      // Server reads refresh token from cookie and clears cookies
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
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
    isAdmin: user?.is_staff ?? false,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    refreshUser,
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
