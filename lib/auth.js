// Simple authentication utility for admin panel
// In a real production app, you would use a more secure authentication system

// The hardcoded username and password
// In production, this should be stored securely (e.g., in a database)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'secure_password_123'; // Change this to a strong password

/**
 * Authenticate user with username and password
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
export function authenticate(username, password) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Set auth token in local storage
 * @param {boolean} isAuthenticated
 */
export function setAuthToken(isAuthenticated) {
  if (typeof window !== 'undefined') {
    if (isAuthenticated) {
      // In a real app, you would use a JWT or another secure token
      // For this simple example, we're just storing a boolean flag
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('auth_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('auth_timestamp');
    }
  }
}

/**
 * Check if the user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  if (typeof window !== 'undefined') {
    const authenticated = localStorage.getItem('admin_authenticated') === 'true';
    
    // Check if authentication has expired (24 hours)
    if (authenticated) {
      const timestamp = Number(localStorage.getItem('auth_timestamp') || '0');
      const now = Date.now();
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - timestamp > expiryTime) {
        // Authentication expired
        setAuthToken(false);
        return false;
      }
    }
    
    return authenticated;
  }
  return false;
}

/**
 * Log out the user
 */
export function logout() {
  setAuthToken(false);
}