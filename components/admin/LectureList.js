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
        // Sort by startTimestamp (newest first)
        fetchedLectures.sort((a, b) => Number(b.startTimestamp) - Number(a.startTimestamp));
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
      <h2 style={{ color: '#00838f', fontWeight: 700, letterSpacing: '-1px', fontSize: '2rem', marginBottom: '24px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>Lecture List</h2>
      
      {loading && <p>Loading lectures...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && lectures.length === 0 && (
        <p>No lectures found. Create your first lecture!</p>
      )}

      {lectures.map((lecture) => (
        <div key={lecture.id} className="card" style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,131,143,0.07)', border: '1px solid #e0f7fa', marginBottom: '32px', padding: '28px 24px' }}>
          <h3 style={{ color: '#00838f', fontWeight: 700, fontSize: '1.3rem', marginBottom: '10px', fontFamily: 'Inter, Roboto, Open Sans, Arial, sans-serif' }}>{lecture.name}</h3>
          <p style={{ color: '#555', fontSize: '1rem', marginBottom: 4 }}>Lecture ID: <span style={{ fontFamily: 'monospace', color: '#00838f' }}>{lecture.id}</span></p>
          {lecture.hash && (
            <p style={{ marginBottom: 4 }}>
              <small style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#00838f' }}>Hash: {lecture.hash}</small>
            </p>
          )}
          <p style={{ color: '#555', marginBottom: 4 }}>Date Start: <span style={{ color: '#00838f' }}>{formatDate(lecture.startTimestamp)}</span></p>
          <p style={{ color: '#555', marginBottom: 4 }}>Date End: <span style={{ color: '#00838f' }}>{formatDate(lecture.timestamp)}</span></p>
          <p style={{ marginBottom: 4 }}>
            Status: {Number.parseInt(lecture.timestamp) > Math.floor(Date.now() / 1000) && Number.parseInt(lecture.startTimestamp) < Math.floor(Date.now() / 1000) ? (
              <span style={{ color: '#00838f', fontWeight: 600 }}>Active</span>
            ) : (
              <span style={{ color: '#b71c1c', fontWeight: 600 }}>Inactive</span>
            )}
          </p>
          <p style={{ color: '#555', marginBottom: 4 }}>Token URI: <span style={{ color: '#00838f', wordBreak: 'break-all' }}>{lecture.tokenURI}</span></p>
          <div style={{ marginTop: '18px' }}>
            <div className="button-row" style={{ display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{ background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
                onClick={() => handleGenerateQR(lecture.id, lecture.hash || lecture.lectureHash)}
                disabled={!lecture.hash && !lecture.lectureHash}
              >
                Generate QR Code
              </button>
              {lecture.tokenURI && !metadata[lecture.id] && !loadingMetadata[lecture.id] && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ background: '#fff', color: '#00838f', border: '1.5px solid #00838f', borderRadius: '8px', padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,131,143,0.08)' }}
                  onClick={() => handleFetchMetadata(lecture.id, lecture.tokenURI)}
                >
                  Reload Metadata
                </button>
              )}
            </div>
            {qrCodes[lecture.id] && (
              <div className="qr-code-container" style={{ marginTop: '10px', textAlign: 'center' }}>
                <img
                  src={qrCodes[lecture.id]}
                  alt={`QR code for ${lecture.name}`}
                  className="qr-code"
                  style={{ border: '1.5px solid #00838f', borderRadius: '8px', background: '#e0f7fa', padding: '8px', maxWidth: '180px' }}
                />
                <p>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ background: '#fff', color: '#00838f', border: '1.5px solid #00838f', borderRadius: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '0.95rem', marginTop: '10px', cursor: 'pointer' }}
                    onClick={() => handleDownloadQR(lecture.id, lecture.name, lecture.hash || lecture.lectureHash)}
                  >
                    Download QR Code
                  </button>
                </p>
              </div>
            )}
            {loadingMetadata[lecture.id] && (
              <div className="loading-metadata" style={{ color: '#00838f', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                <p>Loading metadata...</p>
              </div>
            )}
            {!loadingMetadata[lecture.id] && metadata[lecture.id] && (
              <div className="metadata-preview" style={{ marginTop: '15px', borderTop: '1px solid #e0f7fa', paddingTop: '15px', width: '100%' }}>
                <h4 style={{ color: '#00838f', fontWeight: 700, fontSize: '1.1rem', marginBottom: '10px' }}>Token Metadata</h4>
                <div className="metadata-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  <div className="metadata-image" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e0f7fa', borderRadius: '8px', padding: '10px', backgroundColor: '#f9f9f9' }}>
                    <ImageWithFallback
                      src={metadata[lecture.id].image}
                      alt={metadata[lecture.id].name || 'NFT image'}
                      lectureId={lecture.id}
                      name={metadata[lecture.id].name}
                    />
                  </div>
                  <div className="metadata-info" style={{ flex: 1, minWidth: '200px' }}>
                    <p><strong>Name:</strong> {metadata[lecture.id].name || 'Unnamed'}</p>
                    <p><strong>Description:</strong> {(metadata[lecture.id].description || 'No description')}</p>
                    {metadata[lecture.id].attributes && metadata[lecture.id].attributes.length > 0 && (
                      <>
                        <h5 style={{ color: '#00838f', marginBottom: '5px', marginTop: '15px' }}>Attributes</h5>
                        <div className="attributes-table-container" style={{ marginTop: '10px', marginBottom: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0f7fa', borderRadius: '8px' }}>
                          <table className="attributes-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr>
                                <th style={{ backgroundColor: '#e0f7fa', padding: '8px', textAlign: 'left', borderBottom: '1px solid #b2ebf2' }}>Trait</th>
                                <th style={{ backgroundColor: '#e0f7fa', padding: '8px', textAlign: 'left', borderBottom: '1px solid #b2ebf2' }}>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {metadata[lecture.id].attributes.map((attr) => (
                                <tr key={`${lecture.id}-${attr.trait_type}-${attr.value}`}>
                                  <td style={{ padding: '8px', borderBottom: '1px solid #e0f7fa' }}>{attr.trait_type}</td>
                                  <td style={{ padding: '8px', borderBottom: '1px solid #e0f7fa' }}>{attr.value}</td>
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
        </div>
      ))}
    </div>
  );
}