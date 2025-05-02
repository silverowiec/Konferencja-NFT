import { useState } from 'react';
import { createLecture } from '../../lib/blockchain';

export default function LectureForm({ onLectureCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate inputs
      if (!name || !date || !time || !tokenURI) {
        throw new Error('All fields are required');
      }
      
      // Convert date and time to timestamp (seconds since epoch)
      const dateObj = new Date(`${date}T${time}`);
      const timestamp = Math.floor(dateObj.getTime() / 1000);
      
      // Get admin private key from .env (in production this should be securely handled)
      const adminPrivateKey = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY;
      
      if (!adminPrivateKey) {
        throw new Error('Admin private key not configured');
      }
      
      // Create lecture via smart contract
      const lectureId = await createLecture(
        adminPrivateKey,
        name,
        timestamp,
        tokenURI
      );
      
      setSuccess(`Lecture created successfully! Lecture ID: ${lectureId}`);
      
      // Reset form
      setName('');
      setDate('');
      setTime('');
      setTokenURI('');
      
      // Notify parent component
      if (onLectureCreated) {
        onLectureCreated(lectureId);
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
          <label htmlFor="date">Date</label>
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
          <label htmlFor="time">Time</label>
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
    </div>
  );
}