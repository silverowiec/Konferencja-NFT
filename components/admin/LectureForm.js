import { useState } from 'react';
import { generateQRCode } from '../../lib/qrcode';

export default function LectureForm({ onLectureCreated }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
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
      if (!name || !startDate || !startTime || !deadlineDate || !deadlineTime || !tokenURI) {
        throw new Error('All fields are required');
      }
      
      // Convert start and deadline to timestamps (seconds since epoch)
      const startObj = new Date(`${startDate}T${startTime}`);
      const deadlineObj = new Date(`${deadlineDate}T${deadlineTime}`);
      const start = Math.floor(startObj.getTime() / 1000);
      const deadline = Math.floor(deadlineObj.getTime() / 1000);
      
      // Call the secure API endpoint for lecture creation
      const response = await fetch('/api/lectures/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          start,
          deadline,
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
      setStartDate('');
      setStartTime('');
      setDeadlineDate('');
      setDeadlineTime('');
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
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="deadlineDate">Deadline Date</label>
          <input
            type="date"
            id="deadlineDate"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="deadlineTime">Deadline Time</label>
          <input
            type="time"
            id="deadlineTime"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
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