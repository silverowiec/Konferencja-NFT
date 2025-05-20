import React, { useState } from 'react';
import NftPlaceholder from './NftPlaceholder';

/**
 * TokenDetails component displays NFT metadata in a structured format
 * 
 * @param {Object} props
 * @param {Object} props.metadata - The NFT metadata object
 * @param {string} props.metadata.id - NFT ID
 * @param {string} props.metadata.name - NFT name
 * @param {string} props.metadata.description - NFT description
 * @param {string} props.metadata.image - NFT image URI
 * @param {Array} props.metadata.attributes - NFT attributes/traits
 */
const TokenDetails = ({ metadata }) => {
  const [imageError, setImageError] = useState(false);
  const [proof, setProof] = useState([]);
  const [account, setAccount] = useState(null);
  
  // Helper to get contract address from window or env
  const getContractAddress = () => {
    // Try to get from NEXT_PUBLIC_CONTRACT_ADDRESS or fallback to window.ethereum.selectedAddress
    if (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    // Optionally, you can hardcode or fetch from elsewhere
    return '';
  };

  // Generate proof using MetaMask signature
  const handleGenerateProof = async () => {
    if (!window.ethereum || !window.ethereum.request) {
      alert('MetaMask is not available.');
      return;
    }
    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      setAccount(account);
      const contractAddress = getContractAddress();
      const tokenId = metadata.id;
      const message = `I am owner of ${contractAddress} token ID ${tokenId}`;
      // Sign message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });
      setProof([metadata.id, signature, message]);
    } catch (err) {
      alert(`Failed to generate signature: ${err?.message ?? err}`);
    }
  };

  // Handle missing metadata gracefully
  if (!metadata) {
    return <div className="token-error">No token metadata available</div>;
  }

  // Process image URL - convert IPFS to HTTP if needed
  const getImageUrl = (imageUri) => {
    if (!imageUri || imageError) {
      // Return a default placeholder if no image or error
      return 'https://placehold.co/400x400?text=NFT';
    }
    
    // Convert IPFS URI to HTTP gateway URL
    if (imageUri.startsWith('ipfs://')) {
      const ipfsHash = imageUri.replace('ipfs://', '');
      // Using Pinata gateway (more reliable for NFT images)
      return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    }
    
    return imageUri;
  };
  const ImageWithFallback = ({ src, alt, lectureId, name }) => {
    const [error, setError] = useState(false);
    
    const handleError = () => {
      setError(true);
    };
    
    return (
      <>
        {!error ? (
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: '8px' }}
            onError={handleError}
          />
        ) : (
          <NftPlaceholder 
            size={160}
            text={name ? name.substring(0, 10) : `Token #${lectureId}`}
          />
        )}
      </>
    );
  };

  // Format attributes for display
  const renderAttributes = () => {
    if (!metadata.attributes || metadata.attributes.length === 0) {
      return <p className="no-traits">No traits available for this token</p>;
    }
    
    // Filter out any invalid attributes
    const validAttributes = metadata.attributes.filter(
      attr => attr?.trait_type && attr.value !== undefined
    );
    
    if (validAttributes.length === 0) {
      return <p className="no-traits">No traits available</p>;
    }
    
    return (
        validAttributes && (
            <>
              <h5>Attributes</h5>
              <div className="attributes-table-container">
                <table className="attributes-table">
                  <thead>
                    <tr>
                      <th>Trait</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validAttributes.map((attr) => (
                      <tr key={attr.value}>
                        <td>{attr.trait_type}</td>
                        <td>{attr.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          
    ));
  };
  
  return (
    metadata && (
        <>
        <div className="metadata-preview">
          <h4>Token Metadata</h4>
          <div className="metadata-content">
            <div className="metadata-image">
              <ImageWithFallback
                src={metadata.image}
                name={metadata.name}
              />
            </div>
            <div className="metadata-info">
              <p><strong>Name:</strong> {metadata.name || 'Unnamed'}</p>
              <p><strong>Description:</strong> {(metadata.description || 'No description').substring(0, 100)}...</p>
              
              {/* Display attributes table */}
              {metadata.attributes && metadata.attributes.length > 0 && (
                <>
                  <h5>Attributes</h5>
                  <div className="attributes-table-container">
                    <table className="attributes-table">
                      <thead>
                        <tr>
                          <th>Trait</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metadata.attributes.map((attr) => (
                          <tr key={`${attr.trait_type}-${attr.value}`}>
                            <td>{attr.trait_type}</td>
                            <td>{attr.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {proof[0] && metadata.id === proof[0] && !window.location.pathname.includes('/token') && (
                      <div>
                        <h2><b>Proof:</b></h2>
                        <div className="proof-container">
                          {proof[1].substring(0, 20)}... 
                          {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
                          <button 
                            className="copy-button" 
                            onClick={() => navigator.clipboard.writeText(`${proof[1]}:(${proof[2]}):${account}`)}
                          >
                            Copy to clipboard 📋
                          </button>
                        </div>
                      </div>
                    ) || (
                      <button                 style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}

                      type="button" className="btn-primary" onClick={handleGenerateProof}>
                        Generate Proof
                      </button>
                    )}
                  </div>
                </>
              )}
                
                
            </div>
          </div>
        </div>      
      <style jsx>{`
        .token-details {
          width: 100%;
          margin: 0 auto;
          padding: 0;
        }
        
        .token-card {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          
          @media (min-width: 768px) {
            flex-direction: row;
          }
        }
        
        .token-image-container {
          flex: 1;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
          min-height: 250px;
        }
        
        .token-image-wrapper {
          width: 100%;
          max-width: 300px;
          height: 200px;
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        
        .token-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background-color: #f1f1f1;
        }
        
        .placeholder-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f8f8;
          border-radius: 8px;
        }
        
        .debug-info {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: rgba(0,0,0,0.6);
          color: white;
          font-size: 10px;
          padding: 4px;
          text-align: center;
          display: none;
        }
        
        /* Only show debug info when hovering over the image container in development */
        .token-image-wrapper:hover .debug-info {
          display: block;
        }
        
        .token-info {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Fix for flexbox content overflow */
        }
        
        .token-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        
        .token-name {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #333;
        }
        
        .token-id {
          font-size: 16px;
          color: #666;
          background-color: #f1f1f1;
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .token-description {
          margin-bottom: 15px;
          line-height: 1.5;
          color: #555;
          font-size: 14px;
        }
        
        .token-traits h3 {
          margin-top: 15px;
          margin-bottom: 5px;
          font-size: 16px;
          color: #333;
        }
        
        .attributes-table-container {
          margin-top: 10px;
          margin-bottom: 15px;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 8px;
          background: #fff;
        }
        .attributes-table {
          width: 100%;
          border-collapse: collapse !important;
          font-size: 14px;
          background: #fff;
        }
        .attributes-table th,
        .attributes-table td {
          border: 1px solid #eee !important;
          padding: 8px !important;
          text-align: left !important;
          background: #fff !important;
        }
        .attributes-table th {
          background-color: #f5f5f5 !important;
          font-weight: 600;
          color: #374151;
        }
        .attributes-table tr:last-child td {
          border-bottom: none !important;
        }
        .attributes-table tr:hover td {
          background-color: #f9fafb !important;
        }
        .no-traits {
          color: #888;
          font-style: italic;
          padding: 10px 0 0 0;
        }
        @media (max-width: 500px) {
          .attributes-table {
            font-size: 13px;
          }
          .attributes-table th,
          .attributes-table td {
            padding: 7px 6px !important;
          }
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
        .proof-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .copy-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #0070f3;
        }
        .copy-button:hover {
          color: #0070f3;
        }
      `}</style>
    </>
    )
  );
};

export default TokenDetails;
