// Session verification API endpoint
import { getTokenFromCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  // Only allow GET for verification requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const token = getTokenFromCookie(req);
    
    // Check if the token exists and is valid
    if (!token || !global.sessions || !global.sessions.has(token)) {
      return res.status(401).json({ 
        success: false, 
        authenticated: false,
        message: 'Not authenticated' 
      });
    }
    
    // Get session data
    const session = global.sessions.get(token);
    
    // Check if the session has expired
    const now = new Date();
    if (now > new Date(session.expires)) {
      // Session expired, clean up
      global.sessions.delete(token);
      return res.status(401).json({ 
        success: false, 
        authenticated: false,
        message: 'Session expired' 
      });
    }
    
    // Session is valid
    return res.status(200).json({ 
      success: true, 
      authenticated: true,
      user: session.username,
      message: 'Authenticated' 
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      success: false, 
      authenticated: false,
      message: 'Internal server error' 
    });
  }
}