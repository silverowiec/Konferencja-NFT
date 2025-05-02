import { useState, useEffect } from 'react';
import { getAllLectures } from '../../lib/blockchain';
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

  // Generate QR code for a lecture
  const handleGenerateQR = async (lectureId) => {
    try {
      // Base URL - in production this should be your domain
      const baseUrl = window.location.origin;
      const { dataUrl } = await generateQRCode(lectureId, baseUrl);
      
      setQrCodes(prevQrCodes => ({
        ...prevQrCodes,
        [lectureId]: dataUrl
      }));
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code');
    }
  };

  // Download QR code as image
  const handleDownloadQR = (lectureId, lectureName) => {
    const link = document.createElement('a');
    link.href = qrCodes[lectureId];
    link.download = `qr-lecture-${lectureId}-${lectureName.replace(/\s+/g, '-').toLowerCase()}.png`;
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
          <p>Date: {formatDate(lecture.timestamp)}</p>
          <p>Status: {lecture.active ? 'Active' : 'Inactive'}</p>
          <p>Token URI: {lecture.tokenURI}</p>
          
          <div style={{ marginTop: '15px' }}>
            <button onClick={() => handleGenerateQR(lecture.id)}>
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
                    className="btn-secondary"
                    style={{ marginTop: '10px' }}
                    onClick={() => handleDownloadQR(lecture.id, lecture.name)}
                  >
                    Download QR Code
                  </button>
                </p>
                <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                  Attendee link: {window.location.origin}/attend/{lecture.id}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}