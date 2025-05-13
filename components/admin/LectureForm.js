import { useState } from 'react';
import { generateQRCode } from '../../lib/qrcode';

export default function LectureForm({ onLectureCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);

  // Handle form submission using secure API endpoint
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setQrCodeData(null);
    
    try {
      // Validate inputs
      if (!name || !date || !time || !tokenURI) {
        throw new Error('All fields are required');
      }
      
      // Convert date and time to timestamp (seconds since epoch)
      const dateObj = new Date(`${date}T${time}`);
      const timestamp = Math.floor(dateObj.getTime() / 1000);
      
      // Call the secure API endpoint for lecture creation
      const response = await fetch('/api/lectures/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          timestamp,
          tokenURI
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create lecture');
      }
      
      // Generate QR code using the lecture hash
      if (data.lectureHash) {
        const qrCode = await generateQRCode(data.lectureHash, window.location.origin);
        setQrCodeData(qrCode);
      }
      
      setSuccess(`Lecture created successfully! Lecture ID: ${data.lectureId}`);
      
      // Reset form
      setName('');
      setDate('');
      setTime('');
      setTokenURI('');
      
      // Notify parent component
      if (onLectureCreated) {
        onLectureCreated(data.lectureId);
      }
    } catch (err) {
      console.error('Error creating lecture:', err);
      setError(err.message || 'Failed to create lecture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create New Lecture</h2>
      
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Lecture Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter lecture name"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="date">Minting Deadline (Date)</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="time">Minting Deadline (Time)</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tokenURI">Token URI (IPFS or HTTP URL)</label>
          <input
            type="text"
            id="tokenURI"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            placeholder="ipfs://... or https://..."
            disabled={loading}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Lecture'}
        </button>
      </form>
      
      {qrCodeData && (
        <div className="qr-code-container">
          <h3>Lecture QR Code</h3>
          <p>Share this QR code with attendees to allow them to claim their POAPs.</p>
          <div className="qr-code">
            <img src={qrCodeData.dataUrl} alt="Lecture QR Code" />
          </div>
          <div className="qr-info">
            <p>
              <strong>QR Code URL:</strong> <code>{qrCodeData.scanUrl}</code>
            </p>
            <p>Attendees can scan this QR code to claim their POAP for this lecture.</p>
          </div>
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.download = `lecture-qr-code.png`;
              link.href = qrCodeData.dataUrl;
              link.click();
            }}
            className="btn-secondary"
          >
            Download QR Code
          </button>
        </div>
      )}
      
      <style jsx>{`
        .qr-code-container {
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          text-align: center;
        }
        
        .qr-code {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
        
        .qr-code img {
          max-width: 200px;
          border: 1px solid #ddd;
          padding: 10px;
          background: white;
        }
        
        .qr-info {
          margin-bottom: 20px;
          font-size: 0.9em;
          color: #555;
        }
        
        .qr-info code {
          background: #f5f5f5;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}