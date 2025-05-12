import { useState, useEffect } from 'react';
import TokenDetailsModal from './TokenDetailsModal';
import { getSampleTokenMetadata } from '../../lib/sampleTokens';

const TokenDisplay = ({ tokens, loading, testMode = false }) => {
  const [tokenMetadata, setTokenMetadata] = useState({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [retryCount, setRetryCount] = useState({});
  const [fetchErrors, setFetchErrors] = useState({});
  
  // Fetch metadata for tokens
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;
    
    const fetchMetadata = async () => {
      setLoadingMetadata(true);
      
      }
      
      setTokenMetadata(metadata);
      setFetchErrors(errors);
      setLoadingMetadata(false);
    };
    
    fetchMetadata();
  }, [tokens, testMode]);
  
  // Handle viewing token details
  const handleViewTokenDetails = (tokenId) => {
    setSelectedToken(tokenId);
  };
  
  // Handle closing modal
  const handleCloseModal = () => {
    setSelectedToken(null);
  };
  
  // Handle retry fetch for a specific token
  const handleRetryFetch = async (tokenId) => {
    try {
      setRetryCount(prev => ({
        ...prev,
        [tokenId]: (prev[tokenId] || 0) + 1
      }));
      
      setFetchErrors(prev => ({
        ...prev,
        [tokenId]: null
      }));
      
      const response = await fetch(`/api/token/${tokenId}?bypass_cache=true`);
      if (response.ok) {
        const data = await response.json();
        setTokenMetadata(prev => ({
          ...prev,
          [tokenId]: data
        }));
      } else {
        throw new Error(`Error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error retrying fetch for token ${tokenId}:`, error);
      setFetchErrors(prev => ({
        ...prev,
        [tokenId]: error.message || 'Failed to fetch metadata'
      }));
    }
  };

  if (loading) {
    return (
      <div className="token-loading">
        <p>Loading your tokens...</p>
        <div className="loading-spinner" />
      </div>
    );
  }
  
  if (!tokens || tokens.length === 0) {
    return (
      <div className="no-tokens">
        <p>You don't have any POAP tokens yet.</p>
        <p>Attend a lecture and claim your first POAP!</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="token-grid">
        {tokens.map((tokenId) => {
          const metadata = tokenMetadata[tokenId] || {};
          const hasError = !!fetchErrors[tokenId];
          
          return (
            <button 
              key={tokenId} 
              className={`token-card ${hasError ? 'token-error' : ''}`}
              onClick={() => handleViewTokenDetails(tokenId)}
              type="button"
              aria-label={`View details of token ${tokenId}`}
            >
              <div className="token-image">
                {loadingMetadata ? (
                  <div className="token-loading-image">
                    <div className="loading-spinner-small" />
                  </div>
                ) : metadata.image ? (
                  <img
                    src={metadata.image}
                    alt={metadata.name || `Token #${tokenId}`}
                    className="token-img"
                  />
                ) : (
                  <div className="token-placeholder">
                    <span>#{tokenId}</span>
                  </div>
                )}
              </div>
              
              <div className="token-details">
                <h3>{metadata.name || `Token #${tokenId}`}</h3>
                <p className="token-description">
                  {metadata.description || 'Proof of Attendance Protocol Token'}
                </p>
                <div className="token-id">ID: {tokenId}</div>
                
                {hasError && (
                  <div className="token-error-message">
                    <p>{fetchErrors[tokenId]}</p>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryFetch(tokenId);
                      }}
                      className="retry-button"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              <div className="view-details-badge">
                <span>View Details</span>
              </div>
            </button>
          );
        })}
      
        <style jsx>{`
          .token-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          
          .token-card {
            display: block;
            width: 100%;
            text-align: left;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
            position: relative;
            padding: 0;
          }
          
          .token-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
          }
          
          .token-card:focus {
            outline: 2px solid #0070f3;
            box-shadow: 0 0 0 4px rgba(0, 112, 243, 0.25);
          }
          
          .token-image {
            position: relative;
            padding-top: 100%; /* 1:1 Aspect Ratio */
            background-color: #f5f5f5;
          }
          
          .token-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .token-placeholder {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #e0e0e0;
            font-size: 24px;
            font-weight: bold;
            color: #757575;
          }
          
          .token-details {
            padding: 15px;
          }
          
          .token-details h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
          }
          
          .token-description {
            color: #666;
            font-size: 14px;
            margin: 0 0 10px 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .token-id {
            font-size: 12px;
            color: #888;
          }
          
          .token-loading,
          .no-tokens {
            text-align: center;
            padding: 30px;
            background-color: #f9f9f9;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .loading-spinner {
            margin: 20px auto;
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          .loading-spinner-small {
            margin: 0 auto;
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          .token-loading-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .token-error {
            border-color: #ff5252;
          }
          
          .token-error-message {
            margin-top: 10px;
            padding: 8px;
            background-color: #ffebee;
            border-radius: 4px;
            font-size: 12px;
            color: #d32f2f;
          }
          
          .retry-button {
            background-color: #ff5252;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            margin-top: 5px;
            transition: background-color 0.2s ease;
          }
          
          .retry-button:hover {
            background-color: #d32f2f;
          }
          
          .view-details-badge {
            position: absolute;
            bottom: 0;
            right: 0;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            font-size: 12px;
            padding: 4px 8px;
            border-top-left-radius: 6px;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .token-card:hover .view-details-badge {
            opacity: 1;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Mobile responsiveness */
          @media (max-width: 600px) {
            .token-grid {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
              gap: 12px;
            }
            
            .token-details h3 {
              font-size: 16px;
            }
            
            .token-description {
              font-size: 12px;
            }
          }
        `}</style>
      </div>
      
      {/* Token Details Modal */}
      {selectedToken && (
        <TokenDetailsModal 
          token={selectedToken}
          metadata={tokenMetadata[selectedToken]}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default TokenDisplay;
