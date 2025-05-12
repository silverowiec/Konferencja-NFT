import React, { useRef, useEffect, useState } from 'react';
import BasicQrScanner from './BasicQrScanner';

/**
 * QR Scanner wrapper component that handles scanning logic
 * 
 * @param {Object} props
 * @param {Function} props.onScan - Callback when QR is successfully scanned
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.active - Whether scanner should be active
 */
const QrScannerWrapper = ({ onScan, onError, active = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [videoElement, setVideoElement] = useState(null);
  
  // Handle video ready event from BasicQrScanner
  const handleVideoReady = (videoEl) => {
    console.log('Video element is ready for scanning');
    setVideoElement(videoEl);
    setScanning(true);
  };
  
  // Handle scanning errors
  const handleError = (errorMessage) => {
    if (onError) {
      onError(errorMessage);
    }
  };
  
  // Scan video frame for QR codes
  useEffect(() => {
    if (!videoElement || !canvasRef.current || !scanning) {
      return;
    }
    
    let jsQR;
    
    // Load jsQR library
    const loadJsQr = async () => {
      try {
        // Import jsQR
        jsQR = (await import('jsqr')).default;
        console.log('jsQR library loaded successfully');
        startScanning();
      } catch (err) {
        console.error('Failed to load jsQR library:', err);
        handleError('Failed to load QR scanner library');
      }
    };
    
    // Start scanning frames
    const startScanning = () => {
      if (!jsQR) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const scanFrame = () => {
        if (!videoElement || !scanning) return;
        
        // Make sure video is playing and has dimensions
        if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        
        // Set canvas dimensions to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        try {
          // Draw current video frame to canvas
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          // Get image data for scanning
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Scan for QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data) {
            console.log('QR code detected:', code.data);
            
            // Call onScan callback with decoded data
            if (onScan) {
              onScan(code.data);
            }
            
            // Stop scanning after successful detection
            setScanning(false);
            return;
          }
        } catch (err) {
          console.error('Error scanning QR code:', err);
        }
        
        // Continue scanning
        animationRef.current = requestAnimationFrame(scanFrame);
      };
      
      animationRef.current = requestAnimationFrame(scanFrame);
    };
    
    loadJsQr();
    
    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [videoElement, scanning, onScan]);
  
  return (
    <div className="qr-scanner-wrapper">
      <BasicQrScanner
        onVideoReady={handleVideoReady}
        onError={handleError}
        active={active}
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width="640"
        height="480"
      />
      <div className="scanning-overlay">
        <div className="scanner-target"></div>
      </div>
      <style jsx>{`
        .qr-scanner-wrapper {
          position: relative;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .scanning-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .scanner-target {
          width: 200px;
          height: 200px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default QrScannerWrapper;
