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
  
  // Handle missing metadata gracefully
  if (!metadata) {
    return <div className="token-error">No token metadata available</div>;
  }

  // Process image URL - convert IPFS to HTTP if needed
  const getImageUrl = (imageUri) => {
    if (!imageUri || imageError) return null;
    
    // Convert IPFS URI to HTTP gateway URL
    if (imageUri.startsWith('ipfs://')) {
      const ipfsHash = imageUri.replace('ipfs://', '');
      // Using public IPFS gateway
      return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    return imageUri;
  };

  // Format attributes for display
  const renderAttributes = () => {
    if (!metadata.attributes || metadata.attributes.length === 0) {
      return <p className="no-traits">No traits available for this token</p>;
    }
    
    return (
      <div className="traits-table-container">
        <table className="traits-table">
          <thead>
            <tr>
              <th>Trait</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {metadata.attributes.map((attr) => (
              // Using trait_type+value as key is more reliable than index
              <tr key={`${attr.trait_type}-${attr.value}`}>
                <td>{attr.trait_type}</td>
                <td>{attr.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="token-details">
      <div className="token-card">
        <div className="token-image-container">
          {/* Using relative size to maintain aspect ratio */}
          <div className="token-image-wrapper">
            {getImageUrl(metadata.image) && !imageError ? (
              <img 
                src={getImageUrl(metadata.image)} 
                alt={metadata.name || 'NFT'}
                className="token-image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="placeholder-container">
                <NftPlaceholder 
                  text={metadata.name ? metadata.name.substring(0, 10) : 'NFT'} 
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="token-info">
          <div className="token-header">
            <h2 className="token-name">{metadata.name || 'Unnamed NFT'}</h2>
            {metadata.id && <span className="token-id">#{metadata.id}</span>}
          </div>
          
          <div className="token-description">
            <p>{metadata.description || 'No description available'}</p>
          </div>
          
          <div className="token-traits">
            <h3>Traits</h3>
            {renderAttributes()}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .token-details {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .token-card {
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          background-color: #ffffff;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          
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
        }
        
        .token-image-wrapper {
          width: 100%;
          position: relative;
          padding-bottom: 100%; /* 1:1 Aspect Ratio */
          overflow: hidden;
          border-radius: 8px;
        }
        
        .token-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background-color: #f1f1f1;
        }
        
        .placeholder-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f8f8;
        }
        
        .token-info {
          flex: 1;
          padding: 25px;
          display: flex;
          flex-direction: column;
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
          margin-bottom: 20px;
          line-height: 1.6;
          color: #555;
        }
        
        .token-traits h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          color: #333;
        }
        
        .traits-table-container {
          max-height: 200px;
          overflow-y: auto;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .traits-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .traits-table th {
          background-color: #f1f1f1;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }
        
        .traits-table td {
          padding: 12px;
          border-top: 1px solid #eee;
          color: #555;
        }
        
        .traits-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .no-traits {
          color: #888;
          font-style: italic;
          padding: 10px 0;
        }
        
        .token-error {
          padding: 30px;
          text-align: center;
          background-color: #fff0f0;
          border-radius: 8px;
          color: #e53935;
          font-weight: 500;
          border: 1px dashed #ffcdd2;
        }
        
        @media (max-width: 767px) {
          .token-image-container {
            padding-bottom: 0;
          }
          
          .token-image-wrapper {
            padding-bottom: 75%; /* Smaller aspect ratio on mobile */
          }
        }
      `}</style>
    </div>
  );
};

export default TokenDetails;
