import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import { getLecture, hasClaimed } from '../../lib/blockchain';

export default function AttendLecture() {
  const router = useRouter();
  const { lectureId } = router.query;
  
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [mintStatus, setMintStatus] = useState('idle'); // idle, loading, success, error
  const [mintMessage, setMintMessage] = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  
  // Fetch lecture details when the component mounts and lectureId is available
  useEffect(() => {
    if (!lectureId) return;
    
    async function fetchLecture() {
      try {
        const fetchedLecture = await getLecture(lectureId);
        setLecture({
          id: lectureId,
          ...fetchedLecture
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching lecture:', err);
        setError('Failed to load lecture details. Please check the QR code and try again.');
        setLoading(false);
      }
    }
    
    fetchLecture();
  }, [lectureId]);
  
  // Function to connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);
      setWalletConnected(true);
      
      // Check if user has already claimed this POAP
      if (lectureId) {
        const claimed = await hasClaimed(lectureId, address);
        setAlreadyClaimed(claimed);
        if (claimed) {
          setMintStatus('success');
          setMintMessage('You have already claimed this POAP!');
        }
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet: ' + (err.message || 'Unknown error'));
    }
  };
  
  // Function to mint POAP
  const mintPOAP = async () => {
    if (!lectureId || !walletAddress) return;
    
    setMintStatus('loading');
    setMintMessage('Minting your POAP...');
    
    try {
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureId,
          attendeeAddress: walletAddress,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to mint POAP');
      }
      
      setMintStatus('success');
      setMintMessage('POAP minted successfully! Check your wallet to view your new POAP.');
      setAlreadyClaimed(true);
    } catch (err) {
      console.error('Error minting POAP:', err);
      setMintStatus('error');
      setMintMessage('Failed to mint POAP: ' + (err.message || 'Unknown error'));
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : '';
  };

  return (
    <Layout title={`Attend Lecture - POAP Lecture App`}>
      <div>
        <h1>Attend Lecture & Claim POAP</h1>
        
        {loading && <p>Loading lecture details...</p>}
        {error && <p className="error">{error}</p>}
        
        {!loading && !error && !lecture && (
          <div className="card">
            <p>Lecture not found. Please check the QR code and try again.</p>
          </div>
        )}
        
        {lecture && (
          <div className="card">
            <h2>{lecture.name}</h2>
            <p>Date: {formatDate(lecture.timestamp)}</p>
            <p>Status: {lecture.active ? 'Active' : 'Inactive'}</p>
            
            {!lecture.active && (
              <p className="error">
                This lecture is no longer active. POAPs cannot be claimed.
              </p>
            )}
            
            {lecture.active && !walletConnected && (
              <div style={{ marginTop: '20px' }}>
                <p>Connect your Ethereum wallet to claim your POAP for attending this lecture.</p>
                <button onClick={connectWallet} style={{ marginTop: '10px' }}>
                  Connect Wallet
                </button>
              </div>
            )}
            
            {lecture.active && walletConnected && (
              <div style={{ marginTop: '20px' }}>
                <p>Connected Wallet: {walletAddress}</p>
                
                {alreadyClaimed ? (
                  <p className="success" style={{ marginTop: '10px' }}>
                    You have already claimed this POAP!
                  </p>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    <p>You can now claim your POAP for attending this lecture.</p>
                    <button 
                      onClick={mintPOAP} 
                      disabled={mintStatus === 'loading'}
                      className="btn-success"
                      style={{ marginTop: '10px' }}
                    >
                      {mintStatus === 'loading' ? 'Minting...' : 'Claim POAP'}
                    </button>
                  </div>
                )}
                
                {mintStatus === 'success' && (
                  <p className="success" style={{ marginTop: '10px' }}>
                    {mintMessage}
                  </p>
                )}
                
                {mintStatus === 'error' && (
                  <p className="error" style={{ marginTop: '10px' }}>
                    {mintMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}