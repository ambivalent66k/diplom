import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Failed to parse user data:', err);
        clearAuth();
      }
    }
    
    setLoading(false);
  }, []);
  
  const clearAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    setIsAuthenticated(false);
    setError('');
  };
  
  const login = async (credentials) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authAPI.login(credentials);
      
      if (response.token) {
        const userData = {
          id: response.user_id,
          username: response.username,
          email: response.email,
        };
        
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        throw new Error('Неверные учетные данные');
      }
    } catch (err) {
      const errorMessage = err.message || 'Ошибка входа';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  const register = async (userData) => {
    setLoading(true);
    setError('');
    
    try {
      // Validate passwords match
      if (userData.password !== userData.password_confirm) {
        throw new Error('Пароли не совпадают');
      }
      
      const response = await authAPI.register(userData);
      
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        throw new Error('Ошибка регистрации');
      }
    } catch (err) {
      const errorMessage = err.message || 'Ошибка регистрации';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    setLoading(true);
    
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };
  
  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(''),
  };
};