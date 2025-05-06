import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, logoutUser, verifySession } from '../lib/auth';

// Create authentication context
const AuthContext = createContext({
  isLoggedIn: false,
  isLoading: true,
  login: () => {},
  logoutUser: () => {},
});

// Authentication provider component
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await verifySession();
        setIsLoggedIn(response.authenticated);
        if (response.authenticated) {
          setUsername(response.user);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const response = await loginUser(username, password);
      setIsLoggedIn(response.success);
      if (response.success) {
        setUsername(username);
      }
      return response;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setIsLoggedIn(false);
      setUsername('');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      isLoading,
      username, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);