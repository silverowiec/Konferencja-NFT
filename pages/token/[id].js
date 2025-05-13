import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import TokenDetails from '../../components/common/TokenDetails';
import { fetchMetadata, convertIpfsToHttpUrl } from '../../lib/blockchain';

export default function TokenPage() {
  const router = useRouter();
  const { id, source } = router.query;
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    // Only fetch token data when we have an ID
    if (!id) return;

    const fetchTokenData = async () => {
      try {
        setLoading(true);
        
        // First check if we have metadata in session storage (from admin view)
        if (source === 'admin') {
          const storedMetadata = sessionStorage.getItem(`token_${id}_metadata`);
          if (storedMetadata) {
            const parsedMetadata = JSON.parse(storedMetadata);
            setTokenData(parsedMetadata);
            setRawData(parsedMetadata); // Store raw data for debug mode
            setLoading(false);
            
            // Check if debug mode is requested in URL
            if (router.query.debug === 'true') {
              setDebugMode(true);
            }
            return;
          }
        }
        
        // If no stored metadata, use sample data or fetch from blockchain
        // For now using sample data as fallback, but in production this would
        // fetch from blockchain or API
        const sampleMetadata = {
          id: Number.parseInt(id),
          name: `Example NFT #${id}`,
          description: "This is an example NFT token for educational purposes.",
          image: "ipfs://QmZEBym3XzZHsWPb6GB4E2BLZb9ps9pTWircQD9RxHRNcN",
          attributes: [
            {
              trait_type: "color",
              value: ["red", "blue", "green", "orange"][Number.parseInt(id) % 4]
            },
            {
              trait_type: "shape_type",
              value: ["circle", "square", "triangle", "hexagon"][Number.parseInt(id) % 4]
            },
            {
              trait_type: "size",
              value: ["small", "medium", "large", "extra large"][Number.parseInt(id) % 4]
            }
          ]
        };
        
        // In a real production app, you'd fetch the token URI from the contract here
        // const tokenURI = await getTokenURI(id);
        // const realMetadata = await fetchMetadata(tokenURI);
        // setTokenData(realMetadata);
        
        // For now, using sample data with slight delay for UI feedback
        setTimeout(() => {
          setTokenData(sampleMetadata);
          setRawData(sampleMetadata); // Store raw data for debug mode
          
          // Check if debug mode is requested in URL
          if (router.query.debug === 'true') {
            setDebugMode(true);
          }
          
          setLoading(false);
        }, 800);
        
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError('Failed to load token data');
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [id, source, router.query.debug]);

  return (
    <Layout title={`Token #${id} Details`}>
      <div className="token-page">
        <div className="header">
          <h1>Token Details</h1>
          <div className="header-buttons">
            {process.env.NODE_ENV !== 'production' && (
              <button 
                type="button"
                className={`debug-button ${debugMode ? 'active' : ''}`}
                onClick={() => setDebugMode(!debugMode)}
              >
                {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
              </button>
            )}
            <button 
              type="button"
              className="back-button"
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading token data...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button 
              type="button"
              className="retry-button"
              onClick={() => router.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <TokenDetails metadata={tokenData} />
            
            {/* Debug view showing raw metadata */}
            {debugMode && rawData && (
              <div className="debug-container">
                <h2>Raw Metadata</h2>
                <div className="debug-info">
                  {rawData.image && (
                    <div className="debug-item">
                      <strong>Raw Image URL:</strong> {rawData.image}
                      <br />
                      <strong>Converted URL:</strong> {convertIpfsToHttpUrl(rawData.image)}
                    </div>
                  )}
                  <pre>{JSON.stringify(rawData, null, 2)}</pre>
                </div>
              </div>
            )}
          </>
        )}
        
        <style jsx>{`
          .token-page {
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          
          h1 {
            margin: 0;
            font-size: 28px;
            color: #333;
          }
          
          .back-button {
            background-color: transparent;
            border: 1px solid #ddd;
            color: #333;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }
          
          .back-button:hover {
            background-color: #f5f5f5;
            border-color: #ccc;
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
          
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            background-color: #f9f9f9;
            border-radius: 12px;
          }
          
          .loading-spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #0070f3;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .error-container {
            text-align: center;
            padding: 40px;
            background-color: #fff0f0;
            border-radius: 12px;
            color: #d32f2f;
            border: 1px solid #ffcdd2;
          }
          
          .retry-button {
            background-color: #d32f2f;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            margin-top: 15px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s ease;
          }
          
          .retry-button:hover {
            background-color: #b71c1c;
          }
          
          .header-buttons {
            display: flex;
            gap: 10px;
          }
          
          .debug-button {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            color: #333;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }
          
          .debug-button:hover {
            background-color: #e0e0e0;
          }
          
          .debug-button.active {
            background-color: #e6f2ff;
            border-color: #99ccff;
            color: #0070f3;
          }
          
          .debug-container {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border: 1px dashed #ccc;
            border-radius: 8px;
          }
          
          .debug-container h2 {
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
            color: #555;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          
          .debug-info {
            font-family: monospace;
            font-size: 14px;
            background-color: #fff;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #eee;
            overflow-x: auto;
          }
          
          .debug-item {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dotted #ddd;
          }
        `}</style>
      </div>
    </Layout>
  );
}
