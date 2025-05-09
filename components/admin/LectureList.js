import { useState, useEffect } from 'react';
import { getAllLectures, getLectureHashFromId } from '../../lib/blockchain';
import { generateQRCode } from '../../lib/qrcode';

export default function LectureList({ refresh }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodes, setQrCodes] = useState({});

  // Fetch lectures when component mounts or refresh prop changes
  useEffect(() => {
    async function fetchLectures() {
      try {
        setLoading(true);
        const fetchedLectures = await getAllLectures();
        // Sort by timestamp (newest first)
        fetchedLectures.sort((a, b) => b.timestamp - a.timestamp);
        setLectures(fetchedLectures);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching lectures:', err);
        setError('Failed to load lectures. Please try again later.');
        setLoading(false);
      }
    }

    fetchLectures();
  }, [refresh]);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Generate QR code for a lecture using its hash
  const handleGenerateQR = async (lectureId, lectureHash) => {
    try {
      if (!lectureHash) {
        throw new Error('Lecture hash is required for QR code generation');
      }
      
      // Base URL - in production this should be your domain
      const baseUrl = window.location.origin;
      const { dataUrl } = await generateQRCode(lectureHash, baseUrl);
      
      // Still index by lecture ID for the UI, but use hash for QR generation
      setQrCodes(prevQrCodes => ({
        ...prevQrCodes,
        [lectureId]: dataUrl
      }));
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code: ' + err.message);
    }
  };

  // Download QR code as image
  const handleDownloadQR = (lectureId, lectureName, lectureHash) => {
    const link = document.createElement('a');
    link.href = qrCodes[lectureId];
    // Include a truncated hash in the filename for better identification
    const shortHash = lectureHash ? 
      `${lectureHash.slice(0, 6)}${lectureHash.slice(-4)}` : 
      lectureId;
    link.download = `qr-lecture-${shortHash}-${lectureName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h2>Lecture List</h2>
      
      {loading && <p>Loading lectures...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && lectures.length === 0 && (
        <p>No lectures found. Create your first lecture!</p>
      )}

      {lectures.map((lecture) => (
        <div key={lecture.id} className="card">
          <h3>{lecture.name}</h3>
          <p>Lecture ID: {lecture.id}</p>
          {lecture.hash && (
            <p>
              <small>Hash: {lecture.hash.slice(0, 10)}...{lecture.hash.slice(-8)}</small>
            </p>
          )}
          <p>Date: {formatDate(lecture.timestamp)}</p>
          <p>Status: {Number.parseInt(lecture.timestamp) > Math.floor(Date.now() / 1000) ? 'Active' : 'Inactive'}</p>
          <p>Token URI: {lecture.tokenURI}</p>
          
          <div style={{ marginTop: '15px' }}>
            <button 
              type="button" 
              onClick={() => handleGenerateQR(lecture.id, lecture.hash || lecture.lectureHash)}
              disabled={!lecture.hash && !lecture.lectureHash}
            >
              Generate QR Code
            </button>
            
            {qrCodes[lecture.id] && (
              <div className="qr-code-container">
                <img 
                  src={qrCodes[lecture.id]} 
                  alt={`QR code for ${lecture.name}`}
                  className="qr-code"
                />
                <p>
                  <button 
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: '10px' }}
                    onClick={() => handleDownloadQR(lecture.id, lecture.name, lecture.hash || lecture.lectureHash)}
                  >
                    Download QR Code
                  </button>
                </p>
                <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                  Attendee link: {window.location.origin}/attend/{lecture.hash || lecture.lectureHash || lecture.id}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}