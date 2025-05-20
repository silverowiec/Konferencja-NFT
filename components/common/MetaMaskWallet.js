import React, { useState, useEffect } from 'react';
import { getTokensOfOwner, fetchMetadata, getReadContract } from '../../lib/blockchain';
import TokenDetails from './TokenDetails';

// Check if we're running in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * MetaMask wallet integration component
 * Handles wallet connection and displays user's tokens
 */
const MetaMaskWallet = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [userTokens, setUserTokens] = useState([]);
  const [tokenMetadata, setTokenMetadata] = useState({});
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenURIs, setTokenURIs] = useState({});

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if MetaMask is installed - use typeof to prevent ReferenceError
        if (isBrowser && typeof window.ethereum !== 'undefined') {
          // Check if already connected
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }

          // Set up event listeners for account changes
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('disconnect', handleDisconnect);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();

    // Cleanup event listeners on component unmount
    return () => {
      if (isBrowser && typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Fetch user tokens when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      fetchUserTokens();
    } else {
      // Reset tokens when wallet disconnects
      setUserTokens([]);
      setTokenMetadata({});
    }
  }, [walletAddress]);

  // Handle account changes from MetaMask
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setWalletAddress('');
    } else {
      // Account changed
      setWalletAddress(accounts[0]);
    }
  };

  // Handle disconnect event
  const handleDisconnect = () => {
    setWalletAddress('');
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      if (!isBrowser || typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setConnectionError(error.message || 'Failed to connect to wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet (just for UI, MetaMask doesn't actually support programmatic disconnect)
  const disconnectWallet = () => {
    setWalletAddress('');
  };

  // Get token URI by ID
  const getTokenURI = async (tokenId) => {
    try {
      // Return from cache if available
      if (tokenURIs[tokenId]) return tokenURIs[tokenId];
      
      const contract = getReadContract();
      if (!contract) {
        console.error('Failed to get contract for reading token URI');
        return null;
      }
      
      const uri = await contract.tokenURI(tokenId);
      
      // Cache the URI
      setTokenURIs(prev => ({
        ...prev,
        [tokenId]: uri
      }));
      
      return uri;
    } catch (error) {
      console.error(`Error getting token URI for ID ${tokenId}:`, error);
      return null;
    }
  };

  // Fetch user's tokens
  const fetchUserTokens = async () => {
    if (!walletAddress) return;

    setLoadingTokens(true);
    try {
      // Get token IDs owned by this address
      const tokenIds = await getTokensOfOwner(walletAddress);
      
      if (!Array.isArray(tokenIds)) {
        console.error('Invalid token IDs returned:', tokenIds);
        setUserTokens([]);
        return;
      }
      
      setUserTokens(tokenIds);
      
      // Fetch metadata for each token - limit concurrency to avoid rate limits
      const fetchPromises = [];
      
      for (const tokenId of tokenIds) {
        const fetchSingleToken = async () => {
          try {
            // Get the token URI
            const tokenURI = await getTokenURI(tokenId);
            if (!tokenURI) {
              console.warn(`No URI found for token ${tokenId}`);
              return;
            }
            
            // Fetch metadata from the URI
            const metadata = await fetchMetadata(tokenURI);
            if (!metadata) {
              console.warn(`Failed to fetch metadata for token ${tokenId}`);
              return;
            }
            
            // Add token ID to metadata - ensure it's a string or number, not BigInt
            metadata.id = typeof tokenId === 'bigint' ? tokenId.toString() : tokenId;
            
            // Store metadata
            setTokenMetadata(prev => ({
              ...prev,
              [tokenId]: metadata
            }));
          } catch (err) {
            console.error(`Error fetching metadata for token ${tokenId}:`, err);
          }
        };
        
        fetchPromises.push(fetchSingleToken());
      }
      
      // Wait for all tokens to be processed
      await Promise.allSettled(fetchPromises);
      
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-container">
      {!walletAddress ? (
        <div className="connect-wallet">
          <h2>Connect Your Wallet</h2>
          <p>
            Connect your MetaMask wallet to view your POAP tokens.
          </p>
          
          <button 
            type="button"
            className="btn-connect-wallet"
            onClick={connectWallet}
            disabled={isConnecting}
            style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
          >
            {isConnecting ? (
              'Connecting...'
            ) : (
              <>
                <img 
                  src="https://uxwing.com/wp-content/themes/uxwing/download/banking-finance/wallet-icon.svg" 
                  alt="MetaMask fox" 
                  className="metamask-icon" 
                  width="22" 
                  height="22"
                />
                Connect MetaMask
              </>
            )}
          </button>
          
          {connectionError && (
            <div className="error-message">
              {connectionError}
            </div>
          )}
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="wallet-header">
            <h2>Wallet Connected</h2>
            <div className="wallet-address">
              <span>Address: {formatAddress(walletAddress)}</span>
              <button 
                type="button"
                className="btn-disconnect"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          </div>
          
          <div className="tokens-section">
            <h3>Your POAP Tokens</h3>
            
            {loadingTokens ? (
              <div className="loading-tokens">
                <p>Loading your tokens...</p>
              </div>
            ) : userTokens.length === 0 ? (
              <div className="no-tokens">
                <p>You don't have any POAP tokens yet.</p>
                <p>Attend lectures and claim POAPs to see them here!</p>
              </div>
            ) : (
              <div className="tokens-grid">
                {userTokens.map(tokenId => (
                  <div key={tokenId} className="token-item">
                    {tokenMetadata[tokenId] ? (
                      <TokenDetails metadata={tokenMetadata[tokenId]} />
                    ) : (
                      <div className="loading-token">
                        Loading token #{tokenId}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .wallet-container {
          margin: 30px 0;
          padding: 20px;
          background-color: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .connect-wallet {
          text-align: center;
          padding: 40px 20px;
        }
        
        .btn-connect-wallet {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 30px auto 0;
        }
        
        .metamask-icon {
          margin-right: 5px;
        }
        
        .btn-connect-wallet:hover {
          background-color: #2563eb;
        }
        
        .btn-connect-wallet:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #ef4444;
          margin-top: 20px;
          padding: 10px;
          background-color: #fee2e2;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .wallet-connected {
          width: 100%;
        }
        
        .wallet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .wallet-address {
          display: flex;
          align-items: center;
          gap: 15px;
          background-color: #f3f4f6;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: monospace;
        }
        
        .btn-disconnect {
          background-color: transparent;
          color: #dc2626;
          border: 1px solid #dc2626;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-disconnect:hover {
          background-color: #fee2e2;
        }
        
        .tokens-section h3 {
          margin-bottom: 20px;
          font-size: 20px;
        }
        
        .loading-tokens, .no-tokens {
          padding: 30px;
          text-align: center;
          background-color: #f9fafb;
          border-radius: 8px;
          color: #6b7280;
        }
        
        .tokens-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .loading-token {
          padding: 30px;
          text-align: center;
          background-color: #f3f4f6;
          border-radius: 8px;
          color: #6b7280;
        }
        
        @media (min-width: 768px) {
          .tokens-grid {
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default MetaMaskWallet;
