import { parse } from 'cookie';

/**
 * Get authentication token from cookie in request
 * @param {Object} req - Next.js request object
 * @returns {string|null} - Authentication token or null if not found
 */
export function getTokenFromCookie(req) {
  // Get the cookie header
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  
  // Return the auth token if it exists
  return cookies.auth_token || null;
}

/**
 * Client-side function to make a login request
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} - Response from API
 */
export async function loginUser(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Failed to login' };
  }
}

/**
 * Client-side function to make a logout request
 * @returns {Promise<Object>} - Response from API
 */
export async function logoutUser() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Failed to logout' };
  }
}

/**
 * Client-side function to verify session
 * @returns {Promise<Object>} - Authentication status
 */
export async function verifySession() {
  try {
    const response = await fetch('/api/auth/verify');
    return await response.json();
  } catch (error) {
    console.error('Verification error:', error);
    return { authenticated: false, message: 'Failed to verify authentication' };
  }
}

/**
 * Server-side middleware to check if a user is authenticated
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {boolean} - Whether the user is authenticated
 */
export async function checkAuthServer(req, res) {
  const token = getTokenFromCookie(req);
  
  if (!token || !global.sessions || !global.sessions.has(token)) {
    return false;
  }
  
  const session = global.sessions.get(token);
  const now = new Date();
  
  if (now > new Date(session.expires)) {
    global.sessions.delete(token);
    return false;
  }
  
  return true;
}