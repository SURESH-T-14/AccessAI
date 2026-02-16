import { useEffect, useRef } from 'react';

export const useSparklerTrail = () => {
  const canvasRef = useRef(null);
  const trailPointsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Create and append canvas to body
    const canvas = document.createElement('canvas');
    canvas.id = 'sparkler-trail-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.style.backgroundColor = 'transparent';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      // Clear canvas completely - no background fade
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tail effect - optimized for performance
      if (trailPointsRef.current.length > 1) {
        // Single streamlined tail for better performance
        for (let i = 0; i < trailPointsRef.current.length - 1; i++) {
          const point = trailPointsRef.current[i];
          const nextPoint = trailPointsRef.current[i + 1];
          
          // Calculate progress (older = more transparent)
          const progress = i / trailPointsRef.current.length;
          const opacity = progress * 0.85;
          
          // Darker red to gold gradient
          const hue = 15 + progress * 35;
          const saturation = 90 - progress * 10;
          
          // Draw main line with gradient
          ctx.strokeStyle = `hsla(${hue}, ${saturation}%, 45%, ${opacity})`;
          ctx.lineWidth = 0.8 + progress * 2.2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(nextPoint.x, nextPoint.y);
          ctx.stroke();
          
          // Add subtle glow effect only every 3rd point for performance
          if (i % 3 === 0 && opacity > 0.3) {
            ctx.strokeStyle = `hsla(${hue + 10}, ${saturation}%, 60%, ${opacity * 0.3})`;
            ctx.lineWidth = 1.5 + progress * 3;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.stroke();
          }
        }
      }

      // Update trail points - decay faster
      for (let i = 0; i < trailPointsRef.current.length; i++) {
        trailPointsRef.current[i].life -= 0.12; // Faster decay for quicker response
      }
      
      // Remove dead points
      trailPointsRef.current = trailPointsRef.current.filter(p => p.life > 0);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Mouse move listener - optimized for smooth tracking
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // Add point to trail with timestamp for smoother interpolation
      const now = Date.now();
      trailPointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        life: 1,
        timestamp: now
      });

      // Limit trail length for performance
      if (trailPointsRef.current.length > 40) {
        trailPointsRef.current.shift();
      }
    };

    // Use passive listener for better performance
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvas.parentNode) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  return null;
};

export default useSparklerTrail;

