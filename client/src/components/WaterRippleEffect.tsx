import React, { useEffect, useRef } from 'react';

interface WaterRippleEffectProps {
  children: React.ReactNode;
}

export function WaterRippleEffect({ children }: WaterRippleEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return;
    
    let width = container.offsetWidth;
    let height = container.offsetHeight;
    
    // Set the canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Ripple settings
    const ripples: Array<{
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      opacity: number;
      colorHue: number;
    }> = [];
    
    // Mouse tracking
    let mouseX = -100;
    let mouseY = -100;
    
    // Track window resize
    const handleResize = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      
      // Add ripple on movement with a throttle
      if (Math.random() > 0.92) {
        createRipple(mouseX, mouseY);
      }
    };
    
    // Create a new ripple
    const createRipple = (x: number, y: number) => {
      const baseSize = Math.min(width, height) * 0.05;
      const variableSize = Math.min(width, height) * 0.15;
      const maxRadius = baseSize + Math.random() * variableSize;
      
      ripples.push({
        x,
        y,
        radius: 1,
        maxRadius,
        opacity: 0.7,
        colorHue: 180 + Math.random() * 60, // Blue to cyan range
      });
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update and draw ripples
      for (let i = 0; i < ripples.length; i++) {
        const ripple = ripples[i];
        ripple.radius += 1.5;
        ripple.opacity *= 0.985;
        
        // Remove ripples that have expanded too much or are too transparent
        if (ripple.radius > ripple.maxRadius || ripple.opacity < 0.01) {
          ripples.splice(i, 1);
          i--;
          continue;
        }
        
        // Draw ripple
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          ripple.x, ripple.y, 0,
          ripple.x, ripple.y, ripple.radius
        );
        gradient.addColorStop(0, `hsla(${ripple.colorHue}, 70%, 80%, 0)`);
        gradient.addColorStop(0.8, `hsla(${ripple.colorHue}, 70%, 60%, ${ripple.opacity * 0.5})`);
        gradient.addColorStop(1, `hsla(${ripple.colorHue}, 70%, 70%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);
    
    // Handle when mouse leaves the container
    const handleMouseLeave = () => {
      mouseX = -100;
      mouseY = -100;
    };
    container.addEventListener('mouseleave', handleMouseLeave);
    
    // Click effect - larger ripple
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Create multiple ripples for click effect
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          createRipple(
            x + (Math.random() * 20 - 10),
            y + (Math.random() * 20 - 10)
          );
        }, i * 80);
      }
    };
    container.addEventListener('click', handleClick);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
    };
  }, []);
  
  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ mixBlendMode: 'color-dodge' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}