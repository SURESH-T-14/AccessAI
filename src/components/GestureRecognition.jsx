import React, { useState, useEffect, useRef } from 'react';
import './GestureRecognition.css';

const GestureRecognition = ({ onGestureDetected }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [landmarks, setLandmarks] = useState([]);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const displayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const processingRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);
  const GESTURE_COOLDOWN = 4500; // 4.5 seconds cooldown between gesture detections
  
  // Performance optimization configuration
  const FRAME_SKIP = 1; // Process every frame
  const FRAME_QUALITY = 0.6; // JPEG quality for faster transmission
  const FRAME_WIDTH = 480; // Reduced width for faster processing
  const FRAME_HEIGHT = 360; // Reduced height for faster processing

  const API_BASE = 'http://localhost:5000/api';

  // Start detection
  const handleStart = async () => {
    try {
      // Request camera access with optimized resolution
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 480 },
          height: { ideal: 360 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Safely play video with promise handling
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Video playing successfully');
            })
            .catch(error => {
              console.warn('⚠️ Video autoplay error:', error.message);
              // Try again after a short delay
              setTimeout(() => {
                videoRef.current?.play().catch(e => console.warn('Retry play failed:', e));
              }, 500);
            });
        }
      }

      const response = await fetch(`${API_BASE}/start-detection`, { method: 'POST' });
      const data = await response.json();
      setIsActive(true);
      setStatusMessage('✅ Camera active - detecting gestures');
    } catch (error) {
      setStatusMessage(`❌ Camera error: ${error.message}`);
      console.error(error);
    }
  };

  // Stop detection
  const handleStop = async () => {
    try {
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const response = await fetch(`${API_BASE}/stop-detection`, { method: 'POST' });
      const data = await response.json();
      setIsActive(false);
      setStatusMessage('⏸️ Detection stopped');
    } catch (error) {
      setStatusMessage('❌ Failed to stop detection');
      console.error(error);
    }
  };

  // Clear history
  const handleClear = async () => {
    try {
      await fetch(`${API_BASE}/clear-history`, { method: 'POST' });
      setHistory([]);
      setCurrentGesture(null);
      setStatusMessage('📋 History cleared');
    } catch (error) {
      setStatusMessage('❌ Failed to clear history');
    }
  };

  // Hand skeleton connections (MediaPipe hand landmarks)
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],      // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],      // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]             // Palm connections
  ];

  // Draw frame to display canvas with hand skeleton
  const drawFrameToDisplay = (landmarksToDraw = landmarks) => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas || !Array.isArray(landmarksToDraw) || landmarksToDraw.length === 0) return;
    
    const ctx = displayCanvas.getContext('2d');
    ctx.save();
    
    // Draw hand skeleton connections FIRST (so they appear behind points)
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 2;
    
    for (const [from, to] of HAND_CONNECTIONS) {
      if (from < landmarksToDraw.length && to < landmarksToDraw.length) {
        const ptFrom = landmarksToDraw[from];
        const ptTo = landmarksToDraw[to];
        
        if (ptFrom && ptTo) {
          const x1 = ptFrom.x * displayCanvas.width;
          const y1 = ptFrom.y * displayCanvas.height;
          const x2 = ptTo.x * displayCanvas.width;
          const y2 = ptTo.y * displayCanvas.height;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
    
    // Draw landmark points and numbers
    landmarksToDraw.forEach((pt, idx) => {
      if (!pt) return;
      
      const x = pt.x * displayCanvas.width;
      const y = pt.y * displayCanvas.height;
      
      // Draw circle for landmark
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(99, 102, 241, 0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Draw landmark number (smaller for performance)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(idx.toString(), x, y);
    });
    
    ctx.restore();
  };

  // Auto-start camera when component mounts
  useEffect(() => {
    handleStart();
    return () => {
      handleStop();
    };
  }, []);

  // Handle continuous frame capture when isActive
  useEffect(() => {
    if (!isActive) return;

    let lastFrameTime = Date.now();
    let animationId;
    
    const processFrame = async () => {
      const now = Date.now();
      const shouldSendFrame = (now - lastFrameTime) >= 250;  // Optimized 250ms interval for faster detection
      
      // Update cooldown display
      const timeSinceLastDetection = now - lastDetectionTimeRef.current;
      const cooldownRemaining = Math.max(0, GESTURE_COOLDOWN - timeSinceLastDetection);
      setCooldownRemaining(Math.ceil(cooldownRemaining / 1000)); // Convert to seconds
      
      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const displayCanvas = displayCanvasRef.current;
        
        if (!canvas || !video || !displayCanvas) {
          animationId = requestAnimationFrame(processFrame);
          return;
        }

        // Wait for video to have dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log('Waiting for video to load... videoWidth:', video.videoWidth, 'videoHeight:', video.videoHeight);
          const displayCtx = displayCanvas.getContext('2d');
          displayCtx.fillStyle = '#1a1a1a';
          displayCtx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
          displayCtx.fillStyle = '#888';
          displayCtx.font = '16px Arial';
          displayCtx.textAlign = 'center';
          displayCtx.textBaseline = 'middle';
          displayCtx.fillText('Loading camera...', displayCanvas.width / 2, displayCanvas.height / 2);
          animationId = requestAnimationFrame(processFrame);
          return;
        }

        // Setup canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;

        // Draw video to both canvases
        const ctx = canvas.getContext('2d');
        try {
          ctx.drawImage(video, 0, 0);
        } catch (drawError) {
          console.error('Failed to draw video to canvas:', drawError);
        }

        const displayCtx = displayCanvas.getContext('2d');
        try {
          displayCtx.drawImage(video, 0, 0);
        } catch (drawError) {
          console.error('Failed to draw to display canvas:', drawError);
        }
        
        // Draw hand skeleton and landmarks using optimized function
        drawFrameToDisplay(landmarks);
        
        // Add overlay info
        displayCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        displayCtx.font = 'bold 24px Arial';
        displayCtx.textAlign = 'left';
        displayCtx.fillText('Gesture: ' + (currentGesture || 'Detecting...'), 20, 40);
        displayCtx.font = '16px Arial';
        displayCtx.fillText('Confidence: ' + confidence + '%', 20, 70);

        // Send frame to API periodically with optimization
        if (shouldSendFrame && !processingRef.current) {
          processingRef.current = true;
          lastFrameTime = now;

          // Original JPEG quality for reliability
          const frameDataUri = canvas.toDataURL('image/jpeg', 0.7);
          const frameData = frameDataUri.split(',')[1] || frameDataUri;

          const response = await fetch(`${API_BASE}/process-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: frameData })
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'success') {
              if (data.gesture) {
                const now = Date.now();
                // Only update if cooldown period has passed
                if (now - lastDetectionTimeRef.current > GESTURE_COOLDOWN) {
                  setCurrentGesture(data.gesture);
                  setConfidence((data.confidence * 100).toFixed(1));
                  lastDetectionTimeRef.current = now; // Update last detection time
                  if (onGestureDetected) {
                    onGestureDetected(data.gesture);
                  }
                }
              }
              const newLandmarks = Array.isArray(data.landmarks) ? data.landmarks : [];
              setLandmarks(newLandmarks);
            }

            const historyResponse = await fetch(`${API_BASE}/gesture-history?limit=10`);
            const historyData = await historyResponse.json();
            setHistory(historyData.history || []);
          }

          processingRef.current = false;
        }
      } catch (error) {
        console.error('Frame processing error:', error);
        processingRef.current = false;
      }

      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isActive, landmarks, currentGesture, confidence, onGestureDetected]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      position: 'relative',
      padding: '1rem'
    }}>
      {/* Hidden video and processing canvas */}
      <video 
        ref={videoRef} 
        autoPlay={true}
        playsInline={true}
        muted={true}
        crossOrigin="anonymous"
        onLoadedMetadata={() => {
          console.log('Video loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        }}
        onPlay={() => {
          console.log('Video started playing');
        }}
        onError={(e) => {
          console.error('Video error:', e);
        }}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        zIndex: 5
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isActive ? '#10B981' : '#6B7280',
          boxShadow: isActive ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
          animation: isActive ? 'pulse 2s infinite' : 'none'
        }} />
        <span style={{
          fontSize: '0.85rem',
          color: '#E5E7EB',
          fontWeight: '600'
        }}>
          {isActive ? '🔴 LIVE' : '⚫ OFFLINE'}
        </span>
      </div>

      {/* Camera Feed Display - Always render canvas */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <canvas 
          ref={displayCanvasRef}
          width={640}
          height={480}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            objectFit: 'contain',
            background: '#000'
          }}
        />
        {/* Current gesture overlay */}
        {currentGesture && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(14, 120, 245, 0.95)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 5
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{currentGesture}</div>
            <div style={{ fontSize: '0.85rem', color: '#E5E7EB', marginTop: '0.25rem' }}>
              {confidence}% confident
            </div>
            {cooldownRemaining > 0 && (
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#FCD34D', 
                marginTop: '0.5rem',
                fontWeight: 'bold',
                animation: 'pulse 1s infinite'
              }}>
                Wait {cooldownRemaining}s for next gesture
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestureRecognition;
