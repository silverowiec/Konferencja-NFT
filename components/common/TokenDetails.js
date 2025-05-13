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

  // Format attributes for display
  const renderAttributes = () => {
    if (!metadata.attributes || metadata.attributes.length === 0) {
      return <p className="no-traits">No traits available for this token</p>;
    }
    
    // Filter out any invalid attributes
    const validAttributes = metadata.attributes.filter(
      attr => attr && attr.trait_type && attr.value !== undefined
    );
    
    if (validAttributes.length === 0) {
      return <p className="no-traits">No traits available</p>;
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
            {validAttributes.map((attr, index) => (
              // Using trait_type+value+index as key for better uniqueness
              <tr key={`${attr.trait_type}-${attr.value}-${index}`}>
                <td>{attr.trait_type}</td>
                <td>{String(attr.value)}</td>
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
            {!imageError ? (
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
                  size={180}
                />
              </div>
            )}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info">
                <small>Image URL: {metadata.image || 'Not provided'}</small>
              </div>
            )}
          </div>
        </div>
        
        <div className="token-info">
          <div className="token-header">
            <h2 className="token-name">{metadata.name || 'Unnamed NFT'}</h2>
            {/* {metadata.id && <span className="token-id">#{metadata.id}</span>} */}
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
        
        .traits-table-container {
          margin-top: 10px;
          margin-bottom: 15px;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 8px;
        }
        
        .traits-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .traits-table th {
          background-color: #f5f5f5;
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .traits-table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .traits-table tr:last-child td {
          border-bottom: none;
        }
        
        .no-traits {
          color: #888;
          font-style: italic;
          padding: 8px 0;
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
          
          .traits-table-container {
            max-height: 150px;
          }
          
          .token-traits h3 {
            font-size: 16px;
            margin-bottom: 10px;
            margin-top: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default TokenDetails;
