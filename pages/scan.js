import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/common/Layout';
import dynamic from 'next/dynamic';

// Dynamically import QrScannerWrapper with no SSR to avoid hydration issues
const QrScanner = dynamic(
  () => import('../components/common/QrScannerWrapper'),
  { ssr: false, loading: () => <div className="loading-scanner">Loading camera...</div> }
);

export default function ScanQrCode() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [isClient, setIsClient] = useState(false);
  
  // Set client-side flag when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Handle successful QR code scan
  const handleScanSuccess = (decodedText) => {
    // Only process if we're still scanning (prevents duplicate processing)
    if (!scanning) return;
    
    // Stop scanning after a successful scan
    setScanning(false);
    setScanResult(decodedText);
    console.log('QR code scanned successfully:', decodedText);
    
    try {
      // Check if the text is a URL
      if (decodedText.startsWith('http')) {
        // Parse the URL to extract the lectureId/hash
        const url = new URL(decodedText);
        const pathParts = url.pathname.split('/');
        const lectureParam = pathParts[pathParts.length - 1]; // Get last part of the path
        
        if (lectureParam && url.pathname.includes('/attend/')) {
          // Navigate to the attend page with the lecture ID or hash
          console.log('Detected lecture ID or hash: (pushing)', decodedText);
          router.push(`/attend/${lectureParam}`);
        } else {
          setError('Invalid QR code format. Expected a lecture attendance URL.');
        }
      } else {
        // If it's not a URL but might be a direct hash/ID
        if (decodedText.startsWith('0x') || /^\d+$/.test(decodedText)) {
          console.log('Detected lecture ID or hash: (pushing)', decodedText);
          router.push(`/attend/${decodedText}`);
        } else {
          setError('Invalid QR code. Please scan a valid lecture attendance QR code.');
        }
      }
    } catch (err) {
      console.error('Error parsing QR code:', err);
      setError('Invalid QR code. Please scan a valid lecture attendance QR code.');
    }
  };
  
  // Handle scanning errors
  const handleScanError = (errorMessage) => {
    console.error('QR scanner error:', errorMessage);
    setError(errorMessage);
  };
  
  // Reset the scanner
  const resetScanner = () => {
    // First set scanning to false to unmount the component
    setScanning(false);
    setScanResult(null);
    setError(null);
    
    // Use a small timeout to ensure the component is unmounted before remounting
    setTimeout(() => {
      setScanning(true);
    }, 100);
  };
  
  if (!isClient) {
    return (
      <Layout>
        <div className="container">
          <h1>Scan Lecture QR Code</h1>
          <p>Loading camera...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container">
        <h1>Scan Lecture QR Code</h1>
        <p>Position the QR code within the camera view to attend a lecture.</p>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button type="button" onClick={resetScanner}>Try Again</button>
          </div>
        )}
        
        {scanResult && !error && (
          <div className="success-message">
            <p>QR Code scanned successfully!</p>
            <p>Redirecting to lecture page...</p>
          </div>
        )}
        
        {/* Show scanner only when actively scanning */}
        {scanning && !error && (
          <div className="scanner-container">
            <p className="camera-instruction">Please allow camera access when prompted</p>
            {/* Key prop forces re-rendering when scanner is reset */}
            <QrScanner 
              key={`scanner-${Date.now()}`}
              onScan={handleScanSuccess}
              onError={handleScanError}
              active={true}
            />
          </div>
        )}
        
        <style jsx>{`
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
          }
          
          h1 {
            margin-bottom: 20px;
          }
          
          .scanner-container {
            margin: 30px 0;
            border: 2px solid #ddd;
            border-radius: 10px;
            overflow: hidden;
            padding: 20px 0;
            background-color: #f8f9fa;
          }
          
          .camera-instruction {
            margin-bottom: 15px;
            color: #555;
            font-style: italic;
          }
          
          .error-message {
            background-color: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          
          .success-message {
            background-color: #e8f5e9;
            color: #2e7d32;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          
          .loading-scanner {
            padding: 40px;
            text-align: center;
            font-style: italic;
            color: #666;
            background-color: #f1f1f1;
            margin: 20px 0;
            border-radius: 10px;
          }
          
          button {
            background-color: #0070f3;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
          }
          
          button:hover {
            background-color: #0051a8;
          }
        `}</style>
      </div>
    </Layout>
  );
}

