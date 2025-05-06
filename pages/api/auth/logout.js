// Logout API endpoint
import { serialize } from 'cookie';
import { getTokenFromCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  // Only allow POST for logout requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const token = getTokenFromCookie(req);
    
    if (token && global.sessions) {
      // Remove from server-side session storage
      global.sessions.delete(token);
    }
    
    // Clear the auth cookie by setting it to expire
    res.setHeader('Set-Cookie', serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Set to epoch time to immediately expire
      path: '/'
    }));
    
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}