import Layout from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getAllLectures } from '../lib/blockchain';
import Link from 'next/link';
import MetaMaskWallet from '../components/common/MetaMaskWallet';
import { ethers } from 'ethers';

function VerifyProofForm() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();
    setResult(null);
    setError(null);
    // Parse proof: SIGNATURE:(MESSAGE):ADDRESS
    const match = input.match(/^([0-9a-fA-Fx]+):\((.+)\):0x([0-9a-fA-F]{40})$/);
    if (!match) {
      setError('Invalid proof format.');
      return;
    }
    const signature = match[1];
    const message = match[2];
    const address = match[3];
    try {
      // ethers v6: verifyMessage is a top-level function, not under utils
      const recovered = ethers.verifyMessage(message, signature).substring(2).toLowerCase();
      setResult(address === recovered ? recovered : null);
    } catch (err) {
      console.error('Verification error:', err);
      setError(`Verification failed. Check the proof format and try again: ${err?.message || err}`);
    }
  };

  return (
    <form onSubmit={handleVerify} style={{ marginTop: 20 }}>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={3}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 15, marginBottom: 10 }}
        placeholder="Paste proof here: SIGNATURE:(MESSAGE):ADDRESS"
      />
      <button type="submit" className="btn-primary" style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}>Verify</button>
      {result && (
        <div style={{ marginTop: 15, color: 'green' }}>
          <b>Signature is valid!</b>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 15, color: 'red' }}>{error}</div>
      )}
    </form>
  );
}

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  // Only fetch lectures if user is logged in as admin
  useEffect(() => {
    if (isLoggedIn) {
      async function fetchLectures() {
        try {
          const fetchedLectures = await getAllLectures();
          // Sort by timestamp (newest first)
          fetchedLectures.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
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
        <h1 style={{ marginBottom: '20px' }}>Welcome to Session POAP App.</h1>
        
        {/* Tabs for different sections */}
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            My Tokens
          </button>
          <button 
            type="button"
            className={`tab ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            Verify
          </button>
        </div>

        {/* Tab content container */}
        <div className="tab-content">
          {/* Home tab content */}
          {activeTab === 'home' && !isLoggedIn && (
            <div className="card">
              <h2>Lecture Attendance Verification</h2>
              
              <div className="scan-qr-button">
                <Link href="/scan">
                  <button type="button" className="btn-primary"                 style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
                  >
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
              </div>
            </div>
          )}
          
          {/* Home tab content for admin users */}
          {activeTab === 'home' && isLoggedIn && (
            <div className="admin-card">
              <h2>Admin Dashboard</h2>
              
              {loading && <p>Loading lectures...</p>}
              {error && <p className="error">{error}</p>}
              
              {!loading && !error && lectures.length === 0 && (
                <p>No lectures found. Create your first lecture in the admin panel!</p>
              )}

              <div className="grid">
                {lectures.map((lecture) => (
                  <div key={lecture.id} className="lecture-card">
                    <h3>{lecture.name}</h3>
                    <p>Date: {formatDate(lecture.timestamp)}</p>
                    <p>Status: {lecture.active ? <p style={{color:'green'}}>Active</p> : <p style={{color:'red'}}>Inactive</p>}</p>
                    <p style={{ marginTop: '10px' }}>
                      <Link href={`/attend/${lecture.lectureHash}`}>View Lecture</Link>
                    </p>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <Link href="/admin">
                  <button type="button" className="btn-primary" 
                                  style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
>Go to Admin Dashboard</button>
                </Link>
              </div>
            </div>
          )}
          
          {/* Wallet tab content - MetaMask integration */}
          {activeTab === 'wallet' && (
            <MetaMaskWallet />
          )}
          {/* Verify tab content */}
          {activeTab === 'verify' && (
            <div className="card">
              <h2>Verify Token Ownership</h2>
              <p>Paste your proof below (format: <code>SIGNATURE:(MESSAGE):ADDRESS)</code></p>
              <VerifyProofForm />
            </div>
          )}
        </div>
        
        <style jsx>{`
          .card {
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            background-color: white;
            margin-bottom: 30px;
          }
          
          .admin-card {
            padding: 20px;
            border-radius: 10px;
            background-color: white;
            border: 1px solid #e5e7eb;
          }
          
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
          
          .btn-primary {
            background-color: #0070f3;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .btn-primary:hover {
            background-color: #0051a8;
          }
          
          .btn-secondary {
            background-color: #e5e7eb;
            color: #374151;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
          }
          
          .btn-secondary:hover {
            background-color: #d1d5db;
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
          
          .action-buttons {
            display: flex;
            gap: 15px;
            margin-top: 25px;
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .error {
            color: #ef4444;
            padding: 10px;
            background-color: #fee2e2;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-top: 20px;
          }
          
          .lecture-card {
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background-color: #f9fafb;
            transition: all 0.2s;
          }
          
          .lecture-card:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .lecture-card h3 {
            margin-top: 0;
            margin-bottom: 10px;
          }
          
          /* Tabs styling */
          .tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 20px;
          }
          
          .tab {
            background: none;
            border: none;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 16px;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }
     .tab:hover {
            color: #00838f;
          }
          
          .tab.active {
            color: #00838f;
            border-bottom: 2px solid #00838f;
            font-weight: bold;
          }
          
          
          .tab-content {
            padding: 10px 0;
          }
          
          @media (min-width: 768px) {
            .grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          
          @media (min-width: 1024px) {
            .grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}