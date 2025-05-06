import { hasClaimed } from '../../../lib/blockchain';

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get parameters from query string
    const { lectureId, address } = req.query;

    // Validate inputs
    if (!lectureId || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters' 
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Ethereum address' 
      });
    }

    // Check if address has claimed this lecture's POAP
    const claimed = await hasClaimed(lectureId, address);

    // Return result
    return res.status(200).json({
      success: true,
      claimed
    });
  } catch (error) {
    console.error('Error checking claim status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check claim status',
      error: error.message
    });
  }
}