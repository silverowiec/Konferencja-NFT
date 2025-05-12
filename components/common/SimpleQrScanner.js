import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import jsQR to avoid SSR issues
const jsQR = dynamic(() => import('jsqr'), { ssr: false });

/**
 * A simple QR code scanner component using the browser's native WebRTC APIs
 * This implementation avoids third-party libraries that cause issues in production builds
 * 
 * @param {Object} props
 * @param {Function} props.onScan - Callback when QR is successfully scanned
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.active - Whether scanner should be active
 */
const SimpleQrScanner = ({ onScan, onError, active = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  
  // Scan video frame for QR codes
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !jsQR || !scanning) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Make sure video is playing and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for scanning
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
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
    animationRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Handle camera initialization
  useEffect(() => {
    if (!active) return;
    
    let stream = null;
    const initializeCamera = async () => {
      if (!videoRef.current) return;
      
      try {
        // Get camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        
        // Connect stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraInitialized(true);
          setScanning(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(`Camera access error: ${err.message}`);
        if (onError) onError(`Failed to access camera: ${err.message}`);
      }
    };
    
    initializeCamera();
    
    // Clean up on unmount or when active changes
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      setScanning(false);
      setCameraInitialized(false);
    };
  }, [active, onError]);
  
  // Start scanning when camera is initialized
  useEffect(() => {
    if (cameraInitialized && scanning) {
      animationRef.current = requestAnimationFrame(scanVideoFrame);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraInitialized, scanning]);
  
  // Simple message to guide users
  if (error) {
    return <div className="camera-error">{error}</div>
  }
  
  if (!cameraInitialized) {
    return <div className="loading-camera">Initializing camera...</div>
  }

  return (
    <div className="simple-scanner">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={() => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style jsx>{`
        .simple-scanner {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          position: relative;
        }
        
        video {
          width: 100%;
          border-radius: 8px;
          max-height: 80vh;
          object-fit: cover;
          background-color: #000;
        }
        
        .camera-error {
          padding: 20px;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 8px;
          text-align: center;
          margin: 10px 0;
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
      `}</style>
    </div>
  );
};

export default SimpleQrScanner;
