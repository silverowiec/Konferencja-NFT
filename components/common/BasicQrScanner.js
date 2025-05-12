import React, { useRef, useEffect, useState } from 'react';

/**
 * Very basic QR code scanner that just shows the camera feed
 * Relies on parent component to handle the QR code scanning logic
 * 
 * @param {Object} props
 * @param {Function} props.onVideoReady - Callback when video element is ready
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.active - Whether scanner should be active
 */
const BasicQrScanner = ({ onVideoReady, onError, active = true }) => {
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle camera initialization
  useEffect(() => {
    if (!active || !videoRef.current) return;
    
    let stream = null;
    
    const initializeCamera = async () => {
      try {
        // Get camera access
        console.log('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        
        // Connect stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Camera access granted, stream attached to video element');
          
          // Notify when video can play
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            setCameraReady(true);
            if (onVideoReady) {
              onVideoReady(videoRef.current);
            }
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(`Camera access error: ${err.message || 'Unknown error'}`);
        if (onError) onError(`Failed to access camera: ${err.message || 'Unknown error'}`);
      }
    };
    
    initializeCamera();
    
    // Clean up on unmount
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        console.log('Camera tracks stopped and cleared');
      }
      setCameraReady(false);
    };
  }, [active, onVideoReady, onError]);
  
  // Simple message to guide users
  if (error) {
    return <div className="camera-error">{error}</div>;
  }
  
  return (
    <div className="simple-scanner">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cameraReady ? 'camera-ready' : 'camera-loading'}
      />
      {!cameraReady && (
        <div className="loading-overlay">
          <div className="loading-text">Initializing camera...</div>
        </div>
      )}
      <style jsx>{`
        .simple-scanner {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          position: relative;
          height: 300px;
          border-radius: 8px;
          overflow: hidden;
          background-color: #000;
        }
        
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .camera-loading {
          opacity: 0;
        }
        
        .camera-ready {
          opacity: 1;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f1f1f1;
          z-index: 10;
        }
        
        .loading-text {
          padding: 10px 16px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .camera-error {
          padding: 20px;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 8px;
          text-align: center;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
};

export default BasicQrScanner;
