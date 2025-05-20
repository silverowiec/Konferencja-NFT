// Proxy API for code verification to avoid CORS issues
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }
  try {
    const response = await fetch(process.env.VERIFY_TOKEN_CODE_URL+encodeURIComponent(code));
    const text = await response.text();
    res.status(200).json({ result: text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify code', details: error.message });
  }
}
