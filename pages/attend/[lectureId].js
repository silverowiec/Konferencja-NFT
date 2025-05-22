import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import TokenDetails from '../../components/common/TokenDetails';
import QrScanner from '../../components/common/QrScanner';
import { hasClaimed, getLectureByHash, fetchMetadata } from '../../lib/blockchain';
import { rpc } from 'viem/utils';

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
  
  // State for special code verification
  const [code, setCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const codeInputRef = useRef(null);
  
  // State for QR scanner modal
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScannerConstraints, setQrScannerConstraints] = useState({ facingMode: 'environment' });
  
  // State for showing manual NFT import instructions
  const [showImportInstructions, setShowImportInstructions] = useState(false);
  
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
        throw new Error('MetaMask is not installed or you use mobile browser instead of MetaMask browser');
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);
      setWalletConnected(true);
      await switchNetwork();
      
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
  
  // Helper to switch to Sepolia network in MetaMask
  async function switchNetwork() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: process.env.NEXT_PUBLIC_CHAIN_ID }], // Sepolia chainId
      });
    } catch (switchError) {
      // This error code indicates the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
              chainName: process.env.NEXT_PUBLIC_CHAIN_NAME,
              rpcUrls: [process.env.NEXT_PUBLIC_METAMASK_RPC_URL],
              blockExplorerUrls: [process.env.NEXT_PUBLIC_ETHERSCAN_URL],
            }],
          });
        } catch (addError) {
          // handle "add" error
          console.error('Failed to add Sepolia network:', addError);
        }
      } else {
        console.error('Failed to switch to Sepolia:', switchError);
      }
    }
  }
  
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
      metadata.id = alreadyClaimed;
      
      // Add lecture name to metadata if available
      if (lecture?.name) {
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
    setTxHash(''); // Reset txHash on new mint attempt
    
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
      console.log('Mint response:', data);
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
        throw new Error('MetaMask is not installed or you use mobile browser instead of MetaMask browser');
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
      
      
    } catch (error) {
    }
  };

  // Add code verification function
  const verifySpecialCode = async (inputCode) => {
    setVerifyingCode(true);
    setCodeError('');
    setCodeVerified(false);
    try {
      const res = await fetch(`/api/verify-code?code=${encodeURIComponent(inputCode)}`);
      const data = await res.json();
      const text = data.result || '';
      console.log('Code verification response:', text);
      if (text.startsWith('A1')) {
        setCodeVerified(true);
        setCodeError('');
      } else if (text.startsWith('A0')) {
        setCodeVerified(false);
        setCodeError('Attendee not registered on site by the Event Organizer');
      } else if (text.startsWith('B')) {
        setCodeVerified(false);
        setCodeError('Wrong code. Please try again.');
      } else {
        setCodeVerified(false);
        setCodeError('Unknown response from code verification.');
      }
    } catch (e) {
      setCodeVerified(false);
      setCodeError('Failed to verify code. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };
  
  // Add QR code scan handler (using browser prompt for simplicity, can be replaced with real QR scanner)
  const handleScanQr = () => {
    setShowQrScanner(true);
  };
  
  const handleQrScan = (scanned) => {
    setShowQrScanner(false);
    if (scanned) {
      if (scanned.length >= 6) {
        setCodeError(
          'You are probably scanning session code. Please scan the individual claim QR code provided by the conference organizer.'
        );
        setCode('');
        setCodeVerified(false);
        return;
      }
      setCode(scanned);
      verifySpecialCode(scanned);
    }
  };
  
  const handleQrError = (err) => {
    setShowQrScanner(false);
    setCodeError('QR scan failed. Try again or enter code manually.');
  };
  
  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return timestamp ? new Date(Number(timestamp) * 1000).toLocaleString() : '';
  };

  // Step progress bar logic
  const getCurrentStep = () => {
    if (!codeVerified) return 2; // Step 2: Scan POAP claim QR Code
    if (!walletConnected) return 3; // Step 3: Connect Wallet
    if (!alreadyClaimed && mintStatus !== 'success') return 4; // Step 4: Claim your token
    return 4; // Step 4: Claimed
  };
  // If you want to add session QR as step 1, you can adjust logic here
  const steps = [
    'Scan Session QR Code',
    'Scan POAP claim QR Code',
    'Connect Wallet',
    'Claim your token',
  ];
  const currentStep = getCurrentStep();

  return (
    <Layout title={"Attend Lecture - POAP Lecture App"}>
      <div>
        {/* Step Progress Bar */}
        <div className="step-progress-bar">
          {steps.map((label, idx) => (
            <div key={label} className="step-item">
              <div className={`step-circle${idx + 1 <= currentStep ? ' active' : ''}${idx + 1 === currentStep ? ' current' : ''}`}>{idx + 1}</div>
              <div className={`step-label${idx + 1 === currentStep ? ' current' : ''}`}>{label}</div>
              {/* No progress bar/line between dots */}
            </div>
          ))}
        </div>
        
        <h1 style={{ color: '#00838f', fontWeight: 700, fontSize: '2.1rem', letterSpacing: '-1px', marginBottom: '24px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>Attend Lecture & Claim POAP</h1>
        
        {loading && <p>Loading lecture details...</p>}
        {error && <p className="error">{error}</p>}
        
        {!loading && !error && !lecture && (
          <div className="card">
            <p>Lecture not found. Please check the QR code and try again.</p>
          </div>
        )}
        
        {lecture && (
          <div className="card" style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,131,143,0.07)', border: '1px solid #e0f7fa', marginBottom: '32px', padding: '28px 24px' }}>
            <h2 style={{ color: '#00838f', fontWeight: 700, fontSize: '1.4rem', marginBottom: '10px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>{lecture.name}</h2>
            <p style={{ color: '#555', marginBottom: 4 }}>Mintable from: <span style={{ color: '#00838f' }}>{formatDate(lecture.startTimestamp)}</span></p>
            <p style={{ color: '#555', marginBottom: 4 }}>Mintable until: <span style={{ color: '#00838f' }}>{formatDate(lecture.timestamp)}</span></p>
            <p style={{ marginBottom: 4 }}>
              Status: {lecture.active ? (
                <span style={{ color: '#00838f', fontWeight: 600 }}>Active</span>
              ) : (
                <span style={{ color: '#b71c1c', fontWeight: 600 }}>
                  {lecture.startTimestamp && Number(lecture.startTimestamp) > Math.floor(Date.now() / 1000)
                    ? `This lecture is not yet active. It will be active on ${formatDate(lecture.startTimestamp)}.`
                    : `This lecture is no longer active. It was active until ${formatDate(lecture.timestamp)}.`}
                </span>
              )}
            </p>
            
            {lecture.active && (
              <div style={{ marginTop: '20px' }}>
                {/* Special code verification UI always shown first */}
                {!codeVerified && (
                  <div className="card" style={{marginBottom:'20px',background:'#fffbe6',border:'1px solid #ffe58f'}}>
                    <h3>Enter or Scan TOKC Code</h3>
                    <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                      <input
                        ref={codeInputRef}
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !verifyingCode && code) {
                            e.preventDefault();
                            verifySpecialCode(code);
                          }
                        }}
                        placeholder="Enter code from badge or QR"
                        disabled={verifyingCode}
                        style={{fontSize:'1.1em',padding:'6px'}}
                      />
                      <button type="button" onClick={() => verifySpecialCode(code)} disabled={verifyingCode || !code}>
                        {verifyingCode ? 'Verifying...' : 'Verify Code'}
                      </button>
                      <button type="button" onClick={handleScanQr} disabled={verifyingCode} style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}>
                        Scan QR
                      </button>
                    </div>
                    {showQrScanner && (
                      <div className="qr-modal" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{background:'#fff',padding:'24px',borderRadius:'10px',boxShadow:'0 2px 16px #0008',maxWidth:'95vw'}}>
                          <h3>Scan QR Code</h3>
                          <QrScanner onScan={handleQrScan} onError={handleQrError} active={showQrScanner} constraints={qrScannerConstraints} />
                          <button type="button" style={{marginTop:'16px'}} onClick={()=>setShowQrScanner(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {codeError && <p className="error" style={{color:'red',marginTop:'8px'}}>{codeError}</p>}
                    {codeVerified && <p style={{color:'green',marginTop:'8px'}}>Code verified! Please connect your wallet to claim your POAP.</p>}
                  </div>
                )}
                {/* Show wallet connect only after code is verified */}
                {codeVerified && !walletConnected && (
                  <div style={{ marginTop: '20px' }}>
                    <p>Connect your Ethereum wallet to claim your POAP for attending this lecture.</p>
                    <button type="button" onClick={connectWallet} style={{ marginTop: '10px', backgroundColor: '#00838f', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}>
                      Connect Wallet
                    </button>
                  </div>
                )}
                {/* Show claim POAP only after both code and wallet are verified/connected */}
                {codeVerified && walletConnected && (
                  <div style={{ marginTop: '20px' }}>
                    <p>Connected Wallet: {walletAddress}</p>
                    {/* Always show txHash if present, after a mint */}
                    {txHash && (
                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={
                            process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL
                              ? `${process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL}${txHash}`
                              : `https://etherscan.io/tx/${txHash}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-transaction-link"
                        >
                          🔍 View Transaction on Explorer
                        </a>
                        <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                          Transaction Hash: <code style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{txHash}</code>
                        </p>
                      </div>
                    )}
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
                              onClick={() => {
                                importTokenToMetaMask();
                                setShowImportInstructions(true);
                              }}
                              type="button"
                              className="btn-secondary"
                              style={{ backgroundColor: '#e0f7fa', color: '#00695c', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}
                            >
                              Import Token to MetaMask
                            </button>
                            <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                              Click to add this POAP to your MetaMask wallet for easy viewing
                            </p>
                            {showImportInstructions && (
                              <div style={{
                                background: '#fffbe6',
                                border: '1px solid #ffe58f',
                                borderRadius: '8px',
                                padding: '14px 18px',
                                marginTop: '14px',
                                color: '#7c6f00',
                                fontSize: '0.98rem',
                                lineHeight: 1.6,
                                maxWidth: 420
                              }}>
                                <b>Manual NFT Import Instructions:</b>
                                <ol style={{ margin: '10px 0 0 18px', padding: 0 }}>
                                  <li>On your MetaMask, switch to <b>Polygon</b> network</li>
                                  <li>Click on <b>NFTs</b> tab</li>
                                  <li>Click <b>IMPORT NFTs</b></li>
                                  <li>Paste the contract address: <b><span style={{wordBreak:'break-all',overflowWrap:'anywhere'}}>{contractAddress}</span></b></li>
                                  <li>Provide token id: <b>{alreadyClaimed?.toString?.() || ''}</b></li>
                                  <li>Click <b>Import</b></li>
                                </ol>
                              </div>
                            )}
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
                              style={{ marginTop: '10px', backgroundColor: '#00838f', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}
                              disabled={!codeVerified}
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
                              style={{ marginTop: '10px', backgroundColor: '#00838f', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}
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
                            {txHash && (
                              <div style={{ marginTop: '10px' }}>
                                <a
                                  href={
                                    process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL
                                      ? `${process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL}${txHash}`
                                      : `https://etherscan.io/tx/${txHash}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="view-transaction-link"
                                >
                                  View Transaction on Explorer
                                </a>
                                <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                  Transaction Hash: <code style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{txHash}</code>
                                </p>
                              </div>
                            )}
                            {contractAddress && (
                              <div style={{ marginTop: '15px' }}>
                                <button 
                                  type="button"
                                  onClick={importTokenToMetaMask} 
                                  className="btn-secondary"
                                  style={{ backgroundColor: '#e0f7fa', color: '#00695c', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}
                                >
                                  Import Token to MetaMask
                                </button>
                                <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                                  Click to add this POAP to your MetaMask wallet for easy viewing
                                </p>
                                {showImportInstructions && (
                                  <div style={{
                                    background: '#fffbe6',
                                    border: '1px solid #ffe58f',
                                    borderRadius: '8px',
                                    padding: '14px 18px',
                                    marginTop: '14px',
                                    color: '#7c6f00',
                                    fontSize: '0.98rem',
                                    lineHeight: 1.6,
                                    maxWidth: 420
                                  }}>
                                    <b>Manual NFT Import Instructions:</b>
                                    <ol style={{ margin: '10px 0 0 18px', padding: 0 }}>
                                      <li>On your MetaMask, switch to <b>Polygon</b> network</li>
                                      <li>Click on <b>NFTs</b> tab</li>
                                      <li>Click <b>IMPORT NFTs</b></li>
                                      <li>Paste the contract address: <b><span style={{wordBreak:'break-all',overflowWrap:'anywhere'}}>{contractAddress}</span></b></li>
                                      <li>Provide token id: <span style={{fontFamily:'monospace',fontSize:'0.97em'}}>{alreadyClaimed?.toString?.() || ''}</span></li>
                                      <li>Click <b>Import</b></li>
                                    </ol>
                                  </div>
                                )}
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
        )}
        
        <style jsx>{`
          .step-progress-bar {
            display: flex;
            align-items: center;
            margin-bottom: 32px;
            gap: 0;
            width: 100%;
            overflow-x: auto;
            justify-content: center;
          }
          .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1 1 0;
            min-width: 80px;
            justify-content: center;
          }
          .step-circle {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #e0f7fa;
            color: #00838f;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
            border: 2px solid #e0f7fa;
            transition: background 0.2s, color 0.2s, border 0.2s;
            z-index: 1;
            flex-shrink: 0;
            margin-bottom: 8px;
          }
          .step-circle.active {
            background: #00838f;
            color: #fff;
            border: 2px solid #00838f;
          }
          .step-circle.current {
            border: 3px solid #00838f;
          }
          .step-label {
            color: #aaa;
            font-weight: 400;
            font-size: 15px;
            transition: color 0.2s, font-weight 0.2s;
            text-align: center;
            white-space: normal;
            max-width: 100px;
          }
          .step-label.current {
            color: #00838f;
            font-weight: 700;
          }
          @media (max-width: 600px) {
            .step-progress-bar {
              flex-direction: row;
              align-items: flex-start;
              gap: 0;
              margin-bottom: 24px;
              justify-content: center;
            }
            .step-item {
              min-width: 60px;
            }
            .step-circle {
              width: 28px;
              height: 28px;
              font-size: 14px;
              margin-bottom: 6px;
            }
            .step-label {
              font-size: 13px;
              max-width: 70px;
            }
          }
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
