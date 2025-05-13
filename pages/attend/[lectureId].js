import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import TokenDetails from '../../components/common/TokenDetails';
import { getLecture, getLastTokenForOwner, hasClaimed, getLectureByHash, fetchMetadata, convertIpfsToHttpUrl } from '../../lib/blockchain';

export default function AttendLecture() {
  const router = useRouter();
  const { lectureId } = router.query;
  
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [mintStatus, setMintStatus] = useState('idle'); // idle, loading, success, error
  const [mintMessage, setMintMessage] = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // State for token metadata
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  
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
        const fetchedLecture = await getLectureByHash(lectureId);
        
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
        
        // If user has wallet connected and has already claimed the token, fetch metadata
        if (walletConnected && alreadyClaimed && fetchedLecture.tokenURI) {
          fetchTokenMetadata(fetchedLecture.tokenURI);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching lecture:', err);
        setError("Failed to load lecture details. Please check the QR code and try again.");
        setLoading(false);
      }
    }
    
    fetchLecture();
  }, [lectureId, walletConnected, alreadyClaimed]);
  
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
          
          setAlreadyClaimed(BigInt(data.claimed));
          if (data.claimed > 0n) {
            setMintStatus('success');
            setMintMessage('You have already claimed this POAP!');
            
            // Fetch token metadata if token is already claimed
            if (lecture && lecture.tokenURI) {
              fetchTokenMetadata(lecture.tokenURI);
            }
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
  
  // Function to fetch token metadata
  const fetchTokenMetadata = async (tokenURI) => {
    if (!tokenURI) return;
    
    setLoadingMetadata(true);
    console.log('Fetching metadata from URI:', tokenURI);
    
    try {
      // Fetch and process metadata using the utility function
      // This handles IPFS conversion automatically
      const metadata = await fetchMetadata(tokenURI);
      console.log('Fetched metadata:', metadata);
      console.log('Image URL after processing:', metadata.image);
      
      // Add lecture ID to the metadata for reference
      metadata.id = lectureId;
      
      // Add lecture name to metadata if available
      if (lecture && lecture.name) {
        metadata.lectureName = lecture.name;
      }

      // Add extra metadata about the claim for context
      metadata.claimedAt = new Date().toISOString();
      metadata.claimedBy = walletAddress;
      
      // Store the metadata
      setTokenMetadata(metadata);
    } catch (err) {
      console.error('Error fetching token metadata:', err);
      // Create minimal metadata with a placeholder image
      setTokenMetadata({
        id: lectureId,
        name: 'NFT Token',
        description: 'Token metadata could not be loaded',
        image: 'https://placehold.co/400x400?text=Error',
        attributes: []
      });
    } finally {
      setLoadingMetadata(false);
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
      setAlreadyClaimed(await hasClaimed(lecture.lectureParam || lectureId, walletAddress));
      
      // Fetch token metadata after successful mint
      if (lecture?.tokenURI) {
        console.log('Mint successful! Fetching token metadata from URI:', lecture.tokenURI);
        fetchTokenMetadata(lecture.tokenURI);
      } else {
        console.warn('No token URI available after successful mint');
      }
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
            
      if (!alreadyClaimed) {
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
            tokenId: alreadyClaimed.toString(), // Token ID must be a string
          },
        },
      });
      
      alert('Token successfully added to MetaMask!');
      
    } catch (error) {
      console.error('Error importing token to MetaMask:', error);
      console.error('Token ID:', alreadyClaimed);
      console.error('Contract Address:', contractAddress);
      console.error('Wallet Address:', walletAddress);
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
            <p>Mintable until: {formatDate(lecture.timestamp)}</p>
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
                    
                    {/* Show token metadata if available */}
                    {loadingMetadata && (
                      <div className="metadata-loading" style={{ marginTop: '20px' }}>
                        <p>Loading token metadata...</p>
                      </div>
                    )}
                    
                    {tokenMetadata && (
                      <div className="token-details-container">
                        <h3>Your Token Details</h3>
                        <TokenDetails metadata={tokenMetadata} />
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
                        
                        {/* Show token metadata for newly minted token if available */}
                        {loadingMetadata && (
                          <div className="metadata-loading" style={{ marginTop: '20px' }}>
                            <p>Loading token details...</p>
                          </div>
                        )}
                        
                        {tokenMetadata && (
                          <div className="token-details-container" style={{ marginTop: '30px' }}>
                            <h3>Your Token Details</h3>
                            <TokenDetails metadata={tokenMetadata} />
                            
                            {/* Add token actions for viewing on blockchain or in separate page */}
                            <div className="token-actions">
                              {tokenMetadata.id && (
                                <a 
                                  href={`/token/${tokenMetadata.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="view-token-link"
                                >
                                  View Full Token Page
                                </a>
                              )}
                              {txHash && contractAddress && (
                                <a 
                                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="view-transaction-link view-metadata-link"
                                >
                                  View Transaction on Etherscan
                                </a>
                              )}
                            </div>
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
        
        <style jsx>{`
          .token-details-container {
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
            width: 100%;
          }
          
          .token-details-container h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 22px;
            color: #333;
          }
          
          .metadata-loading {
            font-style: italic;
            color: #777;
            padding: 10px 0;
          }
          
          .token-actions {
            display: flex;
            gap: 15px;
            margin-top: 20px;
            flex-wrap: wrap;
          }
          
          .view-token-link,
          .view-metadata-link {
            display: inline-flex;
            align-items: center;
            padding: 10px 16px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 6px;
            color: #333;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }
          
          .view-token-link {
            background-color: #e8f4fd;
            border-color: #a4d4ff;
            color: #0070f3;
            font-weight: 500;
          }
          
          .view-token-link:hover {
            background-color: #d1e8fb;
            box-shadow: 0 2px 5px rgba(0, 112, 243, 0.1);
          }
          
          .view-metadata-link:hover {
            background-color: #f0f0f0;
            border-color: #ccc;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
          }
          
          .view-transaction-link {
            background-color: #f5f9f7;
            border-color: #d0e9e2;
            color: #278a6f;
          }
          
          .view-transaction-link:hover {
            background-color: #e5f4ef;
            border-color: #b8decd;
            color: #1e6f59;
          }
          
          /* Ensure proper spacing inside the card */
          :global(.token-details .token-card) {
            margin-top: 10px;
          }
          
          /* Fix traits table appearance */
          :global(.traits-table-container) {
            border: 1px solid #eee !important;
            margin-top: 10px !important;
          }
          
          :global(.traits-table th) {
            background-color: #f5f5f5 !important;
            padding: 8px !important;
          }
          
          :global(.traits-table td) {
            padding: 8px !important;
          }
          
          /* Remove extra padding in mobile view */
          @media (max-width: 767px) {
            :global(.token-details) {
              padding: 0;
            }
            
            .token-actions {
              flex-direction: column;
              gap: 10px;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}
