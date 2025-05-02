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
            <p>
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
            <div style={{ marginTop: '20px' }}>
              <Link href="/admin">
                <button>Admin Login</button>
              </Link>
            </div>
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
                <button>Go to Admin Dashboard</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}