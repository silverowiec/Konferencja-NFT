import { getLecture, hasClaimed, mintPOAP } from '../../../lib/blockchain';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { lectureId, attendeeAddress } = req.body;

    // Validate inputs
    if (!lectureId || !attendeeAddress) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(attendeeAddress)) {
      return res.status(400).json({ message: 'Invalid Ethereum address' });
    }

    // Simple API protection
    // In a production app, you would use a more secure approach like JWT
    const referer = req.headers.referer || '';
    const hostname = req.headers.host || '';
    
    // Only allow requests from our own domain or localhost during development
    const isValidOrigin = referer.includes(hostname) || 
                          referer.includes('localhost') ||
                          referer.includes('127.0.0.1');
                          
    if (!isValidOrigin) {
      console.warn('Suspicious API call from:', referer);
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Get lecture details
    const lecture = await getLecture(lectureId);

    // Check if lecture exists and is active
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (lecture.timestamp < currentTime) {
      return res.status(400).json({ message: 'Lecture deadline has passed' });
    }

    // Check if attendee has already claimed
    const claimed = await hasClaimed(lectureId, attendeeAddress);
    if (claimed > 0) {
      return res.status(400).json({ message: 'POAP already claimed for this lecture' });
    }

    // Get admin private key from environment
    const adminPrivateKey = process.env.PRIVATE_KEY_SGH;
    if (!adminPrivateKey) {
      console.error('Admin private key not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Mint POAP on behalf of the attendee
    const tx = await mintPOAP(adminPrivateKey, lectureId, attendeeAddress);

    // Return success response with transaction hash
    res.status(200).json({
      message: 'POAP minted successfully',
      txHash: tx.hash,
      lectureId,
      attendeeAddress
    });
  } catch (error) {
    console.error('Error minting POAP:', error);
    res.status(500).json({
      message: 'Failed to mint POAP',
      error: error.message
    });
  }
}