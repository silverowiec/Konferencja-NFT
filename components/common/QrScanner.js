import { useEffect, useRef } from 'react';

/**
 * A simplified QR code scanner component using html5-qrcode
 * This version uses Html5QrcodeScanner with a simpler approach
 * 
 * @param {Object} props
 * @param {Function} props.onScan - Callback when QR is successfully scanned
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.active - Whether scanner should be active
 */
const QrScanner = ({ onScan, onError, active = true }) => {
  const scannerInstanceRef = useRef(null);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    // Reset initialization flag when component mounts
    hasInitializedRef.current = false;
    
    // Only initialize scanner when component is active
    if (!active) return;
    
    const initScanner = async () => {
      try {
        // Import the library dynamically
        const Html5QrcodeScanner = (await import('html5-qrcode')).Html5QrcodeScanner;
        
        // Make sure we're not initializing twice
        if (hasInitializedRef.current) {
          return;
        }
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        };
        
        // Create scanner instance
        const scanner = new Html5QrcodeScanner(
          'qr-reader', 
          config, 
          /* verbose= */ false
        );
        
        // Define success callback
        const onScanSuccess = (decodedText) => {
          console.log('QR Code detected:', decodedText);
          if (onScan) {
            onScan(decodedText)
          }
          
          // Don't stop scanning here - let the parent component decide
        };
        
        // Define error/failure callback
        const onScanFailure = (errorMessage) => {
          // Don't log "QR code not found" messages as they flood the console
          if (errorMessage && !errorMessage.includes && !errorMessage.includes("QR code not found")) {
            console.warn('QR scan error:', errorMessage);
          }
        };
        
        // Render the scanner
        scanner.render(onScanSuccess, onScanFailure);
        
        // Store the scanner instance for cleanup
        scannerInstanceRef.current = scanner;
        hasInitializedRef.current = true;
        
      } catch (err) {
        console.error('Error initializing QR scanner:', err);
        if (onError) onError(`Failed to initialize scanner: ${err.message || 'Unknown error'}`);
      }
    };
    
    // Initialize scanner
    initScanner();
    
    // Clean up on unmount
    return () => {
      if (scannerInstanceRef.current) {
        try {
          // Clear the scanner UI and stop camera
          scannerInstanceRef.current.clear();
          console.log('Scanner cleared successfully');
        } catch (err) {
          console.error('Error clearing scanner:', err);
        }
        scannerInstanceRef.current = null;
      }
      // Reset initialization flag - uncomment this if you want to re-initialize on component remount
      // hasInitializedRef.current = false;
    };
  }, [active, onScan, onError]);
  
  return (
    <div className="qr-scanner-wrapper">
      <div id="qr-reader" />
      <style jsx>{`
        .qr-scanner-wrapper {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }
        
        /* Override Html5QrcodeScanner styles for better UI */
        :global(#qr-reader) {
          border: none !important;
          padding: 0 !important;
          width: 100% !important;
        }
        
        :global(#qr-reader__scan_region) {
          padding: 0 !important;
        }
        
        :global(#qr-reader__dashboard) {
          padding: 10px !important;
        }
        
        :global(#qr-reader__dashboard_section_swaplink) {
          color: #0070f3 !important;
        }
      `}</style>
    </div>
  );
};

export default QrScanner;
