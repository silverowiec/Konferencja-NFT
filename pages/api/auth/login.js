// Secure login API endpoint
import { serialize } from 'cookie';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// The admin username from environment or default value
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// The admin password hash - MUST be set in environment variables
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Secret key for session token generation
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  // Only allow POST for login requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Check if ADMIN_PASSWORD_HASH is configured
    if (!ADMIN_PASSWORD_HASH) {
      console.error('ADMIN_PASSWORD_HASH environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication system not properly configured' 
      });
    }

    // Validate credentials - use constant time comparison to prevent timing attacks
    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(username), 
      Buffer.from(ADMIN_USERNAME)
    );
    // Compare password hash
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!(usernameMatch && passwordMatch)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Authentication successful - generate token
    const token = generateToken();
    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24 hour expiry

    // Set HTTP-only cookie with the token
    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: sessionExpiry,
      path: '/'
    }));

    // Store the token in a server-side storage (for demo, we'll use a memory store)
    // In production, you'd use Redis or another persistent store
    if (!global.sessions) global.sessions = new Map();
    global.sessions.set(token, {
      username: ADMIN_USERNAME,
      expires: sessionExpiry
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Authentication successful' 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Invalid password' 
    });
  }
}