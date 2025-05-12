import { createLecture } from '../../../lib/blockchain';
import { checkAuthServer } from '../../../lib/auth';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated (must be admin)
    const isAuthenticated = await checkAuthServer(req, res);
    if (!isAuthenticated) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Get lecture data from request body
    const { name, timestamp, tokenURI } = req.body;

    // Validate inputs
    if (!name || !timestamp || !tokenURI) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters' 
      });
    }

    // Get admin private key from environment (secure server-side)
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      console.error('Admin private key not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    // Create lecture using blockchain library
    const lectureHash = await createLecture(
      adminPrivateKey,
      name,
      timestamp,
      tokenURI
    );

    // Get the lecture count to determine the ID (1-based for backwards compatibility)
    const { getLectureCount } = await import('../../../lib/blockchain');
    const count = await getLectureCount();
    const lectureId = count; // The new lecture is the latest one

    // Return success response with lecture ID and hash
    return res.status(200).json({
      success: true,
      message: 'Lecture created successfully',
      lectureId,
      lectureHash
    });

  } catch (error) {
    console.error('Error creating lecture:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create lecture',
      error: error.message
    });
  }
}