import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the scanner component
const Scanner = dynamic(() => import('react-qr-scanner'), {
  ssr: false, // Disable server-side rendering
});

/**
 * Alternative QR code scanner component using react-qr-scanner
 * 
 * @param {Object} props
 * @param {Function} props.onScan - Callback when QR is successfully scanned
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.active - Whether scanner should be active
 */
const QrScannerAlt = ({ onScan, onError, active = true }) => {
  const [showCamera, setShowCamera] = useState(false);
  
  useEffect(() => {
    // Only show camera if component is active and client-side
    if (typeof window !== 'undefined' && active) {
      setShowCamera(true);
    } else {
      setShowCamera(false);
    }
    
    return () => {
      setShowCamera(false);
    };
  }, [active]);
  
  // Handle scan result
  const handleScan = (data) => {
    if (data && onScan) {
      onScan(data.text);
    }
  };
  
  // Handle errors
  const handleError = (err) => {
    if (onError) {
      onError(`Scanner error: ${err?.message || 'Unknown error'}`);
    }
  };
  
  if (!showCamera) {
    return <div className="loading-camera">Initializing camera...</div>;
  }
  
  return (
    <div className="scanner-wrapper">
      {active && (
        <Scanner
          delay={300}
          constraints={{
            audio: false,
            video: { facingMode: 'environment' }
          }}
          onError={handleError}
          onScan={handleScan}
          style={{ width: '100%' }}
        />
      )}
      <style jsx>{`
        .scanner-wrapper {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 8px;
          background-color: #f8f9fa;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .loading-camera {
          padding: 40px;
          text-align: center;
          font-style: italic;
          color: #666;
          background-color: #f1f1f1;
          margin: 20px 0;
          border-radius: 10px;
        }
        
        :global(video) {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default QrScannerAlt;
