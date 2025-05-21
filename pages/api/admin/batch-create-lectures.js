import { createLecture } from '../../../lib/blockchain';
import { checkAuthServer } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check admin authentication
    const isAuthenticated = await checkAuthServer(req, res);
    if (!isAuthenticated) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { lectures } = req.body;
    if (!Array.isArray(lectures) || lectures.length === 0) {
      return res.status(400).json({ success: false, message: 'No lectures provided' });
    }

    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Sequentially create lectures, collect results
    const results = [];
    for (let i = 0; i < lectures.length; i++) {
      const l = lectures[i];
      try {
        // Debug: log the incoming lecture object
        console.log('DEBUG: Incoming lecture object at index', i, JSON.stringify(l, null, 2));
        // Accept image as tokenURI fallback if tokenURI is missing
        const tokenURI = l.tokenURI || l.image;
        if (!l.name || !tokenURI || !Array.isArray(l.attributes)) {
          throw new Error('Missing required fields (name, tokenURI/image, attributes)');
        }
        // Helper to get attribute value
        const getAttr = (trait) => l.attributes.find(a => a.trait_type === trait)?.value;
        // Parse start and deadline from attributes
        const dateStart = getAttr('date_start_plan');
        const timeStart = getAttr('time_start_plan');
        const dateEnd = getAttr('date_end_plan');
        const timeEnd = getAttr('time_end_plan');
        if (!dateStart || !timeStart || !dateEnd || !timeEnd) {
          throw new Error('Missing date/time attributes');
        }
        // Compose ISO strings and parse to timestamps
        // Accept both YYYY-MM-DD and DD.MM.YYYY formats
        function parseDate(dateStr) {
          if (/\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
            // Convert DD.MM.YYYY to YYYY-MM-DD
            const [d, m, y] = dateStr.split('.');
            return `${y}-${m}-${d}`;
          }
          return dateStr;
        }
        const startObj = new Date(`${parseDate(dateStart)}T${timeStart}`);
        const deadlineObj = new Date(`${parseDate(dateEnd)}T${timeEnd}`);
        const start = Math.floor(startObj.getTime() / 1000);
        const deadline = Math.floor(deadlineObj.getTime() / 1000);
        if (Number.isNaN(start) || Number.isNaN(deadline)) {
          throw new Error('Invalid start or deadline timestamp');
        }
        // Log for debugging
        console.log(`Creating lecture ${i + 1}:`, { name: l.name, start, deadline, tokenURI });
        // Actually create the lecture on blockchain
        const lectureHash = await createLecture(adminPrivateKey, l.name, start, deadline, tokenURI);
        results.push({ success: true, index: i, lectureHash });
      } catch (err) {
        console.error(`Error creating lecture at index ${i}:`, err);
        results.push({ success: false, index: i, error: err.message });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Batch create lectures error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
