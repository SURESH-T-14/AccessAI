import { useEffect, useRef } from 'react';

export const useCursorTrail = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const isMovingRef = useRef(false);
  const movingTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Create and append canvas to body
    const canvas = document.createElement('canvas');
    canvas.id = 'cursor-trail-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.style.mixBlendMode = 'multiply'; // Darker blend mode
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

    // Particle class - weather/cloud-like effect
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4; // Larger particles
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.life = 1;
        this.decay = Math.random() * 0.018 + 0.012;
        this.turbulence = Math.random() * 2 - 1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Add slight turbulence for smooth, wavy motion
        this.speedX += (Math.random() - 0.5) * 0.3;
        this.speedY += (Math.random() - 0.5) * 0.3;
        
        // Friction
        this.speedX *= 0.95;
        this.speedY *= 0.95;
        this.life -= this.decay;
      }

      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life * 0.5; // Darker opacity
        
        // Create gradient for soft cloud-like appearance
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, 'rgba(80, 100, 150, 0.7)'); // Dark blue center
        gradient.addColorStop(0.5, 'rgba(60, 80, 130, 0.5)'); // Darker blue
        gradient.addColorStop(1, 'rgba(40, 60, 110, 0.2)'); // Very dark edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    }

    // Animation loop
    const animate = () => {
      // Very subtle fade - keeps dark atmosphere
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const particle = particlesRef.current[i];
        particle.update();
        particle.draw(ctx);

        if (particle.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Draw smooth flowing line from cursor to trail
      if (isMovingRef.current && particlesRef.current.length > 0) {
        ctx.strokeStyle = `rgba(80, 100, 150, 0.3)`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw line through multiple particles for smooth effect
        ctx.beginPath();
        ctx.moveTo(mouseRef.current.x, mouseRef.current.y);
        
        for (let i = 0; i < Math.min(3, particlesRef.current.length); i++) {
          ctx.lineTo(particlesRef.current[i].x, particlesRef.current[i].y);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Mouse move listener
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // Check if mouse has actually moved significantly
      const distance = Math.sqrt(
        Math.pow(e.clientX - lastMouseRef.current.x, 2) +
        Math.pow(e.clientY - lastMouseRef.current.y, 2)
      );

      if (distance > 6) {
        // Create particles with slight randomness
        particlesRef.current.push(new Particle(e.clientX, e.clientY));
        
        // Occasionally add extra particles for density
        if (Math.random() > 0.7) {
          particlesRef.current.push(new Particle(e.clientX, e.clientY));
        }
        
        lastMouseRef.current.x = e.clientX;
        lastMouseRef.current.y = e.clientY;
        isMovingRef.current = true;

        // Clear existing timeout
        if (movingTimeoutRef.current) {
          clearTimeout(movingTimeoutRef.current);
        }

        // Set timeout to mark as static
        movingTimeoutRef.current = setTimeout(() => {
          isMovingRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (movingTimeoutRef.current) {
        clearTimeout(movingTimeoutRef.current);
      }
      if (canvas.parentNode) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  return null;
};

export default useCursorTrail;


