import React, { createContext, useState, useContext, useEffect } from 'react';
import { isAuthenticated, setAuthToken, logout } from '../lib/auth';

// Create authentication context
const AuthContext = createContext({
  isLoggedIn: false,
  login: () => {},
  logoutUser: () => {},
});

// Authentication provider component
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Check authentication status on component mount
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);
  
  // Login function
  const login = (authenticated) => {
    setAuthToken(authenticated);
    setIsLoggedIn(authenticated);
  };
  
  // Logout function
  const logoutUser = () => {
    logout();
    setIsLoggedIn(false);
  };
  
  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);