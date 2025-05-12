import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import { getLecture, getLastTokenForOwner } from '../../lib/blockchain';

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
  const [contractAddress, setContractAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // Fetch lecture details when the component mounts and lectureId is available
  useEffect(() => {
    if (!lectureId) return;
    
    // Set contract address from environment variable
    const contractAddressValue = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
    setContractAddress(contractAddressValue);
    
    async function fetchLecture() {
      try {
        // Determine if the lectureId parameter is a hash (starts with 0x) or a numeric ID
        const isHash = typeof lectureId === 'string' && lectureId.startsWith('0x');
        
        // getLecture now handles both ID and hash based lookups
        const fetchedLecture = await getLecture(lectureId);
        
        if (!fetchedLecture) {
          throw new Error('Lecture not found');
        }
        
        // Check if the lecture deadline has passed
        const currentTime = Math.floor(Date.now() / 1000);
        if (fetchedLecture.timestamp < currentTime) {
          setError(`This lecture has expired (deadline: ${new Date(fetchedLecture.timestamp * 1000).toLocaleString()})`);
        }
        
        // Store the ID or hash that was used to find this lecture
        setLecture({
          id: fetchedLecture.id || 'Unknown',
          hash: isHash ? lectureId : fetchedLecture.hash,
          lectureParam: lectureId,  // Store the original parameter used
          ...fetchedLecture
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching lecture:', err);
        setError("Failed to load lecture details. Please check the QR code and try again.");
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
      
      // Check if user has already claimed this POAP using secure API
      if (lectureId) {
        try {
          const response = await fetch(`/api/lectures/check-claimed?lectureId=${lectureId}&address=${address}`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to check claim status');
          }
          
          setAlreadyClaimed(data.claimed);
          if (data.claimed) {
            setMintStatus('success');
            setMintMessage('You have already claimed this POAP!');
          }
        } catch (error) {
          console.error('Error checking claim status:', error);
          // Continue without setting claim status as a fallback
        }
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(`Failed to connect wallet: ${err.message || 'Unknown error'}`);
    }
  };
  
  // Function to mint POAP
  const mintPOAP = async () => {
    if (!lecture || !walletAddress) return;
    
    setMintStatus('loading');
    setMintMessage('Minting your POAP...');
    
    try {
      // Pass the original lecture parameter (ID or hash) that was used in the URL
      // The backend can handle both formats
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureId: lecture.lectureParam || lectureId,
          attendeeAddress: walletAddress,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to mint POAP');
      }
      
      // Store transaction hash for MetaMask import
      setTxHash(data.txHash);
      
      setMintStatus('success');
      setMintMessage('POAP minted successfully! Check your wallet to view your new POAP.');
      setAlreadyClaimed(true);
    } catch (err) {
      console.error('Error minting POAP:', err);
      setMintStatus('error');
      setMintMessage(`Failed to mint POAP: ${err.message || 'Unknown error'}`);
    }
  };

  // Function to import token to MetaMask
  const importTokenToMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Use numeric ID for MetaMask import if available, otherwise use lecture ID
      const tokenIdForMetaMask = await getLastTokenForOwner(walletAddress);
      
      console.log('Debug info:', {
        tokenIdForMetaMask,
        walletAddress,
        contractAddress
      });
      
      if (!tokenIdForMetaMask) {
        alert(`No tokens found for your address: ${walletAddress}`);
        return;
      }
      
      // Request to add the token to MetaMask
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: contractAddress, // Contract address
            tokenId: tokenIdForMetaMask.toString(), // Token ID must be a string
          },
        },
      });
      
      alert('Token successfully added to MetaMask!');
      
    } catch (error) {
      console.error('Error importing token to MetaMask:', error);
      alert(`Failed to import token to MetaMask: ${error.message || 'Unknown error'}`);
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : '';
  };

  return (
    <Layout title={"Attend Lecture - POAP Lecture App"}>
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
                <button type="button" onClick={connectWallet} style={{ marginTop: '10px' }}>
                  Connect Wallet
                </button>
              </div>
            )}
            
            {lecture.active && walletConnected && (
              <div style={{ marginTop: '20px' }}>
                <p>Connected Wallet: {walletAddress}</p>
                
                {alreadyClaimed ? (
                  // User has already claimed - show claimed message and import button
                  <>
                    <p className="success" style={{ marginTop: '10px' }}>
                      {mintStatus === 'success' 
                        ? mintMessage 
                        : 'You have already claimed this POAP!'}
                    </p>
                    {contractAddress && (
                      <div style={{ marginTop: '15px' }}>
                        <button 
                          onClick={importTokenToMetaMask}
                          type="button"
                          className="btn-secondary"
                        >
                          Import Token to MetaMask
                        </button>
                        <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                          Click to add this POAP to your MetaMask wallet for easy viewing
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // User hasn't claimed yet - show claim button or minting status
                  <>
                    {mintStatus === 'idle' && (
                      <div style={{ marginTop: '10px' }}>
                        <p>You can now claim your POAP for attending this lecture.</p>
                        <button 
                          type="button"
                          onClick={mintPOAP}
                          className="btn-success"
                          style={{ marginTop: '10px' }}
                        >
                          Claim POAP
                        </button>
                      </div>
                    )}
                    
                    {mintStatus === 'loading' && (
                      <div style={{ marginTop: '10px' }}>
                        <p>{mintMessage}</p>
                        <button 
                          type="button"
                          disabled
                          className="btn-success"
                          style={{ marginTop: '10px' }}
                        >
                          Minting...
                        </button>
                      </div>
                    )}
                    
                    {mintStatus === 'error' && (
                      <p className="error" style={{ marginTop: '10px' }}>
                        {mintMessage}
                      </p>
                    )}
                    
                    {mintStatus === 'success' && (
                      <>
                        <p className="success" style={{ marginTop: '10px' }}>
                          {mintMessage}
                        </p>
                        {contractAddress && (
                          <div style={{ marginTop: '15px' }}>
                            <button 
                              type="button"
                              onClick={importTokenToMetaMask} 
                              className="btn-secondary"
                            >
                              Import Token to MetaMask
                            </button>
                            <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                              Click to add this POAP to your MetaMask wallet for easy viewing
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}