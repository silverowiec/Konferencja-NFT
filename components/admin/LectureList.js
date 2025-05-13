import { useState, useEffect } from 'react';
import { getAllLectures, getLectureHashFromId, fetchMetadata, convertIpfsToHttpUrl } from '../../lib/blockchain';
import { generateQRCode } from '../../lib/qrcode';
import Link from 'next/link';
import NftPlaceholder from '../common/NftPlaceholder';

// Sub-component to handle image loading with fallback
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

export default function LectureList({ refresh }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodes, setQrCodes] = useState({});
  const [metadata, setMetadata] = useState({});
  const [loadingMetadata, setLoadingMetadata] = useState({});

  // Fetch lectures when component mounts or refresh prop changes
  useEffect(() => {
    async function fetchLectures() {
      try {
        setLoading(true);
        const fetchedLectures = await getAllLectures();
        // Sort by timestamp (newest first)
        fetchedLectures.sort((a, b) => b.timestamp - a.timestamp);
        setLectures(fetchedLectures);
        setLoading(false);
        console.log('Fetched lectures:', fetchedLectures);
        
        // Define function to fetch metadata for a lecture inside useEffect to avoid dependency issues
        async function fetchMetadataForLecture(lectureId, tokenURI) {
          if (!tokenURI) return;
          
          // Mark this lecture as loading metadata
          setLoadingMetadata(prev => ({
            ...prev,
            [lectureId]: true
          }));
          
          try {
            // Fetch and process metadata
            const fetchedMetadata = await fetchMetadata(tokenURI);
            
            // Add the lecture ID to the metadata
            fetchedMetadata.id = lectureId;
            
            // Store the metadata indexed by lecture ID
            setMetadata(prev => ({
              ...prev,
              [lectureId]: fetchedMetadata
            }));
          } catch (err) {
            console.error(`Error fetching metadata for lecture ${lectureId}:`, err);
          } finally {
            // Mark this lecture as done loading metadata
            setLoadingMetadata(prev => ({
              ...prev,
              [lectureId]: false
            }));
          }
        }
        
        // Automatically fetch metadata for all lectures with a tokenURI
        for (const lecture of fetchedLectures) {
          if (lecture.tokenURI) {
            fetchMetadataForLecture(lecture.id, lecture.tokenURI);
          }
        }
      } catch (err) {
        console.error('Error fetching lectures:', err);
        setError('Failed to load lectures. Please try again later.');
        setLoading(false);
      }
    }

    fetchLectures();
  }, [refresh]);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Generate QR code for a lecture using its hash
  const handleGenerateQR = async (lectureId, lectureHash) => {
    try {
      if (!lectureHash) {
        throw new Error('Lecture hash is required for QR code generation');
      }
      
      // Base URL - in production this should be your domain
      const baseUrl = window.location.origin;
      const { dataUrl } = await generateQRCode(lectureHash, baseUrl);
      
      // Still index by lecture ID for the UI, but use hash for QR generation
      setQrCodes(prevQrCodes => ({
        ...prevQrCodes,
        [lectureId]: dataUrl
      }));
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert(`Failed to generate QR code: ${err.message}`);
    }
  };

  // Download QR code as image
  const handleDownloadQR = (lectureId, lectureName, lectureHash) => {
    const link = document.createElement('a');
    link.href = qrCodes[lectureId];
    // Include a truncated hash in the filename for better identification
    const shortHash = lectureHash ? 
      `${lectureHash.slice(0, 6)}${lectureHash.slice(-4)}` : 
      lectureId;
    link.download = `qr-lecture-${shortHash}-${lectureName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Fetch metadata for a lecture
  const handleFetchMetadata = async (lectureId, tokenURI) => {
    if (!tokenURI) {
      alert('This lecture does not have a valid token URI');
      return;
    }
    
    // Mark this lecture as loading metadata
    setLoadingMetadata(prev => ({
      ...prev,
      [lectureId]: true
    }));
    
    try {
      // Fetch and process metadata
      const fetchedMetadata = await fetchMetadata(tokenURI);
      
      // Add the lecture ID to the metadata
      fetchedMetadata.id = lectureId;
      
      // Store the metadata indexed by lecture ID
      setMetadata(prev => ({
        ...prev,
        [lectureId]: fetchedMetadata
      }));
    } catch (err) {
      console.error(`Error fetching metadata for lecture ${lectureId}:`, err);
      alert(`Failed to fetch metadata: ${err.message}`);
    } finally {
      // Mark this lecture as done loading metadata
      setLoadingMetadata(prev => ({
        ...prev,
        [lectureId]: false
      }));
    }
  };
  
  // View token details page with metadata
  const handleViewTokenDetails = (lectureId) => {
    if (metadata[lectureId]) {
      // Store metadata in sessionStorage to avoid URL size limitations
      sessionStorage.setItem(`token_${lectureId}_metadata`, JSON.stringify(metadata[lectureId]));
      // Open token details page in a new tab
      window.open(`/token/${lectureId}?source=admin`, '_blank');
    }
  };

  return (
    <div>
      <h2>Lecture List</h2>
      
      {loading && <p>Loading lectures...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && lectures.length === 0 && (
        <p>No lectures found. Create your first lecture!</p>
      )}

      {lectures.map((lecture) => (
        <div key={lecture.id} className="card">
          <h3>{lecture.name}</h3>
          <p>Lecture ID: {lecture.id}</p>
          {lecture.hash && (
            <p>
              <small>Hash: {lecture.hash.slice(0, 10)}...{lecture.hash.slice(-8)}</small>
            </p>
          )}
          <p>Date: {formatDate(lecture.timestamp)}</p>
          <p>Status: {Number.parseInt(lecture.timestamp) > Math.floor(Date.now() / 1000) ? 'Active' : 'Inactive'}</p>
          <p>Token URI: {lecture.tokenURI}</p>
          
          <div style={{ marginTop: '15px' }}>
            <div className="button-row">
              <button 
                type="button" 
                onClick={() => handleGenerateQR(lecture.id, lecture.hash || lecture.lectureHash)}
                disabled={!lecture.hash && !lecture.lectureHash}
              >
                Generate QR Code
              </button>
              
              {lecture.tokenURI && metadata[lecture.id] && (
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={() => handleViewTokenDetails(lecture.id)}
                >
                  View Full Token Details
                </button>
              )}
              
              {lecture.tokenURI && !metadata[lecture.id] && !loadingMetadata[lecture.id] && (
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleFetchMetadata(lecture.id, lecture.tokenURI)}
                >
                  Reload Metadata
                </button>
              )}
            </div>
            
            {qrCodes[lecture.id] && (
              <div className="qr-code-container">
                <img 
                  src={qrCodes[lecture.id]} 
                  alt={`QR code for ${lecture.name}`}
                  className="qr-code"
                />
                <p>
                  <button 
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: '10px' }}
                    onClick={() => handleDownloadQR(lecture.id, lecture.name, lecture.hash || lecture.lectureHash)}
                  >
                    Download QR Code
                  </button>
                </p>
              </div>
            )}
            
            {loadingMetadata[lecture.id] && (
              <div className="loading-metadata">
                <p>Loading metadata...</p>
              </div>
            )}
            
            {!loadingMetadata[lecture.id] && metadata[lecture.id] && (
              <div className="metadata-preview">
                <h4>Token Metadata</h4>
                <div className="metadata-content">
                  <div className="metadata-image">
                    <ImageWithFallback
                      src={metadata[lecture.id].image}
                      alt={metadata[lecture.id].name || 'NFT image'}
                      lectureId={lecture.id}
                      name={metadata[lecture.id].name}
                    />
                  </div>
                  <div className="metadata-info">
                    <p><strong>Name:</strong> {metadata[lecture.id].name || 'Unnamed'}</p>
                    <p><strong>Description:</strong> {(metadata[lecture.id].description || 'No description').substring(0, 100)}...</p>
                    
                    {/* Display attributes table */}
                    {metadata[lecture.id].attributes && metadata[lecture.id].attributes.length > 0 && (
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
                              {metadata[lecture.id].attributes.map((attr) => (
                                <tr key={`${lecture.id}-${attr.trait_type}-${attr.value}`}>
                                  <td>{attr.trait_type}</td>
                                  <td>{attr.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <style jsx>{`
            .button-row {
              display: flex;
              gap: 10px;
              margin-bottom: 15px;
              flex-wrap: wrap;
            }
            .metadata-preview {
              margin-top: 15px;
              border-top: 1px solid #eee;
              padding-top: 15px;
              width: 100%;
            }
            .metadata-content {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
            }
            .metadata-image {
              display: flex;
              justify-content: center;
              align-items: center;
              border: 1px solid #eee;
              border-radius: 8px;
              padding: 10px;
              background-color: #f9f9f9;
            }
            .metadata-info {
              flex: 1;
              min-width: 200px;
            }
            .attributes-table-container {
              margin-top: 10px;
              margin-bottom: 15px;
              max-height: 200px;
              overflow-y: auto;
              border: 1px solid #eee;
              border-radius: 8px;
            }
            .attributes-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            .attributes-table th {
              background-color: #f5f5f5;
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .attributes-table td {
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .attributes-table tr:last-child td {
              border-bottom: none;
            }
            .loading-metadata {
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
              color: #666;
              font-style: italic;
            }
            h5 {
              margin-bottom: 5px;
              margin-top: 15px;
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}