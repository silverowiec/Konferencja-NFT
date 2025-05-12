import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getAllLectures } from '../lib/blockchain';
import Link from 'next/link';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only fetch lectures if user is logged in as admin
  useEffect(() => {
    if (isLoggedIn) {
      async function fetchLectures() {
        try {
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
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  return (
    <Layout title="POAP Lecture App - Home">
      <div>
        <h1 style={{ marginBottom: '20px' }}>Welcome to POAP Lecture App</h1>
        
        {/* For regular users */}
        {!isLoggedIn && (
          <div className="card">
            <h2>Lecture Attendance Verification</h2>
            
            <div className="scan-qr-button">
              <Link href="/scan">
                <button type="button" className="btn-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: '10px' }}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  Scan QR Code
                </button>
              </Link>
            </div>
            
            <p style={{ marginTop: '20px' }}>
              This application allows you to claim a Proof of Attendance Protocol (POAP) 
              NFT for lectures you've attended.
            </p>
            <p style={{ marginTop: '15px' }}>
              To claim your POAP:
            </p>
            <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>Scan the QR code provided by your lecturer</li>
              <li>Connect your Ethereum wallet when prompted</li>
              <li>Claim your POAP token as proof of your attendance</li>
            </ol>
            <p style={{ marginTop: '15px' }}>
              Note: You can only access lectures through QR codes provided to you.
            </p>
            
            <div className="action-buttons">
              <Link href="/token/1">
                <button type="button" className="btn-view-example">
                  View Example Token
                </button>
              </Link>
              
              <Link href="/admin">
                <button type="button" className="btn-secondary">Admin Login</button>
              </Link>
            </div>
            
            <style jsx>{`
              .action-buttons {
                display: flex;
                gap: 15px;
                margin-top: 25px;
                flex-wrap: wrap;
                justify-content: center;
              }
              
              .btn-view-example {
                background-color: #673ab7;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.2s ease;
              }
              
              .btn-view-example:hover {
                background-color: #5e35b1;
              }
            `}</style>

            <style jsx>{`
              .scan-qr-button {
                margin: 30px 0;
                text-align: center;
              }
              
              .scan-qr-button button {
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #0070f3;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 18px;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(0, 112, 243, 0.4);
                transition: all 0.2s ease;
              }
              
              .scan-qr-button button:hover {
                background-color: #0051a8;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 112, 243, 0.5);
              }
            `}</style>
          </div>
        )}
        
        {/* For admin users */}
        {isLoggedIn && (
          <>
            <h2 style={{ marginBottom: '20px' }}>Upcoming and Recent Lectures</h2>
            
            {loading && <p>Loading lectures...</p>}
            {error && <p className="error">{error}</p>}
            
            {!loading && !error && lectures.length === 0 && (
              <p>No lectures found. Create your first lecture in the admin panel!</p>
            )}

            <div className="grid">
              {lectures.map((lecture) => (
                <div key={lecture.id} className="card">
                  <h2>{lecture.name}</h2>
                  <p>Date: {formatDate(lecture.timestamp)}</p>
                  <p>Status: {lecture.active ? 'Active' : 'Inactive'}</p>
                  <p style={{ marginTop: '10px' }}>
                    <Link href={`/attend/${lecture.id}`}>View Lecture</Link>
                  </p>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <Link href="/admin">
                <button type="button" className="btn-primary">Go to Admin Dashboard</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}