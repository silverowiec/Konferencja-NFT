import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/common/Layout';
import { getLectureIdFromHash } from '../../lib/blockchain';
import dynamic from 'next/dynamic';

// Dynamically import the HTML5QrcodeScanner to avoid SSR issues
const Html5QrcodeScanner = dynamic(() => import('html5-qrcode').then(mod => mod.Html5QrcodeScanner), {
  ssr: false,
});

export default function ScanQrCode() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const scannerDivId = 'qr-code-scanner';

  // Handle hash changes (e.g., when QR code contains hash)
  useEffect(() => {
    const handleHashChange = async () => {
      try {
        // Get hash from URL (remove # symbol)
        const hash = window.location.hash.substring(1);
        
        if (hash && hash.length > 0) {
          await handleQrCode(`0x${hash}`); // Add 0x prefix back
        }
      } catch (err) {
        console.error('Error processing URL hash:', err);
        setError('Failed to process the QR code from URL');
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Check if hash exists on first load
    if (window.location.hash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Initialize scanner once component mounts and is in browser
  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window !== 'undefined') {
      setScannerReady(true);
    }
    
    // Clean up the scanner when component unmounts
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error('Error clearing scanner:', e);
        }
      }
    };
  }, []);

  // Initialize the actual QR scanner after the component confirms scannerReady
  useEffect(() => {
    if (scannerReady && !scannerRef.current) {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerDivId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          /* verbose= */ false
        );
        
        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      } catch (e) {
        console.error('Error initializing scanner:', e);
        setError('Failed to initialize camera. Please ensure you have granted camera permissions.');
      }
    }
  }, [scannerReady]);

  // Success callback when QR code is scanned
  const onScanSuccess = async (decodedText) => {
    try {
      // Stop the scanner after a successful scan
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      setScanResult(decodedText);
      
      // Process the scan result - expected format: /scan#{hash}
      const hashMatch = decodedText.match(/\/scan#([0-9a-fA-F]+)$/);
      if (hashMatch && hashMatch[1]) {
        const hash = `0x${hashMatch[1]}`;
        await handleQrCode(hash);
      } else {
        setError('Invalid QR code format. Please scan a valid lecture QR code.');
      }
    } catch (err) {
      console.error('Error handling scan result:', err);
      setError('Failed to process QR code');
    }
  };
  
  // Error callback for scanner
  const onScanFailure = (error) => {
    // Don't set errors for timeouts or temporary failures
    if (error?.includes('scan timeout')) return;
    console.warn('QR scan error:', error);
  };

  // Process the lecture hash from a QR code
  const handleQrCode = async (hash) => {
    if (!hash) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Get lecture ID from hash
      const lectureId = await getLectureIdFromHash(hash);
      
      if (!lectureId) {
        setError('Invalid lecture QR code. This lecture does not exist.');
        setLoading(false);
        return;
      }
      
      // Redirect to the attend page with the lecture ID
      router.push(`/attend/${lectureId}`);
    } catch (err) {
      console.error('Error processing lecture hash:', err);
      setError('Failed to retrieve lecture information.');
      setLoading(false);
    }
  };

  return (
    <Layout title="Scan QR Code - POAP Lecture App">
      <div className="container">
        <h1>Scan Lecture QR Code</h1>
        
        {error && (
          <div className="error-container">
            <p className="error">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-secondary"
              style={{ marginTop: '10px' }}
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <p>Loading lecture information...</p>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="scanner-container">
            <p className="instructions">
              Point your camera at a lecture QR code to claim your POAP.
              <br />
              Make sure you grant camera permissions when prompted.
            </p>
            
            <div id={scannerDivId} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
          </div>
        )}
        
        <style jsx>{`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
          }
          
          .scanner-container {
            width: 100%;
            max-width: 500px;
            margin: 0 auto;
            text-align: center;
          }
          
          .instructions {
            margin-bottom: 20px;
            color: #555;
          }
          
          .error-container {
            text-align: center;
            margin: 20px 0;
          }
          
          .loading-container {
            text-align: center;
            margin: 20px 0;
          }
          
          .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin: 20px auto;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Layout>
  );
}