import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import TokenDetails from '../../components/common/TokenDetails';

export default function TokenPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch token data when we have an ID
    if (!id) return;

    // This is an example function to fetch token metadata
    // In a real app, you would call your API or blockchain service
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        
        // This is sample data - in a real app, you would fetch this from an API
        // For demo purposes, we're using hardcoded sample data based on the ID
        const sampleMetadata = {
          id: parseInt(id),
          name: `Example NFT #${id}`,
          description: "This is an example NFT token for educational purposes.",
          image: "ipfs://QmZEBym3XzZHsWPb6GB4E2BLZb9ps9pTWircQD9RxHRNcN",
          attributes: [
            {
              trait_type: "color",
              value: ["red", "blue", "green", "orange"][id % 4]
            },
            {
              trait_type: "shape_type",
              value: ["circle", "square", "triangle", "hexagon"][id % 4]
            },
            {
              trait_type: "size",
              value: ["small", "medium", "large", "extra large"][id % 4]
            }
          ]
        };
        
        // Simulate API delay
        setTimeout(() => {
          setTokenData(sampleMetadata);
          setLoading(false);
        }, 800);
        
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError('Failed to load token data');
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [id]);

  return (
    <Layout title={`Token #${id} Details`}>
      <div className="token-page">
        <div className="header">
          <h1>Token Details</h1>
          <button 
            className="back-button"
            onClick={() => router.back()}
          >
            ← Back
          </button>
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
              className="retry-button"
              onClick={() => router.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <TokenDetails metadata={tokenData} />
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
        `}</style>
      </div>
    </Layout>
  );
}
