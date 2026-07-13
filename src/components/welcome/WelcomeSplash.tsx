'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  alpha: number;
  angle: number;
  speed: number;
  delay: number;
}

const GALAXY_COLORS = [
  'rgba(0, 255, 135, ',  // Neon Mint
  'rgba(0, 229, 255, ',  // Neon Cyan
  'rgba(189, 0, 255, ',  // Neon Purple
  'rgba(255, 215, 0, ',  // Cosmic Gold
];

export function WelcomeSplash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Create an offscreen canvas to sample text pixels
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    
    if (octx) {
      octx.fillStyle = '#000000';
      octx.fillRect(0, 0, width, height);

      // Setup title text styling
      octx.fillStyle = '#ffffff';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      
      // Responsive font size
      const fontSize = Math.min(width * 0.08, 90);
      octx.font = `900 ${fontSize}px var(--font-sans, Inter, sans-serif)`;
      octx.fillText('GRAVI-NOTE', width / 2, height / 2 - 20);

      // Setup subtitle text styling
      const subSize = Math.min(width * 0.015, 15);
      octx.font = `600 ${subSize}px var(--font-sans, Inter, sans-serif)`;
      octx.fillStyle = '#cccccc';
      octx.fillText('SISTEMA DE IDEACIÓN EN GRAVEDAD CERO', width / 2, height / 2 + 50);

      // Sample pixels
      const imgData = octx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Sample pixels on a grid (step determines density/performance)
      const step = width < 768 ? 4 : 3;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          // If the pixel is not black, spawn a particle
          if (r > 30 || g > 30 || b > 30) {
            // Spawn far away in random spiral/radial coordinate
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(width, height) * (0.5 + Math.random() * 0.5);
            
            const colorPrefix = GALAXY_COLORS[Math.floor(Math.random() * GALAXY_COLORS.length)];
            
            particles.push({
              x: width / 2 + Math.cos(angle) * radius,
              y: height / 2 + Math.sin(angle) * radius,
              vx: 0,
              vy: 0,
              targetX: x,
              targetY: y,
              size: Math.random() * 2.2 + 0.8,
              color: colorPrefix,
              alpha: Math.random() * 0.5 + 0.5,
              angle: Math.random() * Math.PI * 2,
              speed: Math.random() * 0.08 + 0.02,
              delay: Math.random() * 60, // staggered entrance
            });
          }
        }
      }
    }

    const startTime = performance.now();
    let isDissolving = false;

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      // Clear with slight trailing opacity to create cosmic glow motion blur
      ctx.fillStyle = 'rgba(11, 15, 25, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Additive blending for neon galaxy glowing stars
      ctx.globalCompositeOperation = 'screen';

      if (elapsed > 3.5 && !isDissolving) {
        isDissolving = true;
      }

      particles.forEach((p) => {
        if (p.delay > 0) {
          p.delay -= 1;
          return;
        }

        if (!isDissolving) {
          // Phase 1: Assemble and orbit text
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          // Star orbit oscillation around the target letter shape
          p.angle += p.speed;
          const ox = Math.cos(p.angle) * 2;
          const oy = Math.sin(p.angle) * 2;

          // Strong gravitational pull to assemble text (ease in)
          const ease = Math.min(1.0, elapsed / 1.5);
          const pull = 0.08 * ease;

          p.vx += (dx * pull - p.vx) * 0.1;
          p.vy += (dy * pull - p.vy) * 0.1;
          
          p.x += p.vx + ox * (1 - ease * 0.8);
          p.y += p.vy + oy * (1 - ease * 0.8);
        } else {
          // Phase 2: Dissolve spiraling into the black hole center
          const cx = width / 2;
          const cy = height / 2;
          const dx = cx - p.x;
          const dy = cy - p.y;
          // Tangential spiral suction forces
          const angle = Math.atan2(dy, dx);
          const spiralAngle = angle + 0.35; // offset creates spiral inward curl
          
          // Suction acceleration
          const suctionStrength = 0.09 * (elapsed - 3.5);
          p.vx += Math.cos(spiralAngle) * suctionStrength;
          p.vy += Math.sin(spiralAngle) * suctionStrength;

          p.x += p.vx;
          p.y += p.vy;

          // Shrink and fade out as they reach the singularity
          p.size = Math.max(0.1, p.size * 0.96);
          p.alpha = Math.max(0, p.alpha * 0.95);
        }

        // Draw glowing particle
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Timers to handle visibility and unmounting
    const fadeTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 4500); // Start fade at 4.5 seconds

    const removeTimeout = setTimeout(() => {
      setIsRendered(false);
    }, 5500); // Fully unmount at 5.5 seconds

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-[#0B0F19] transition-opacity duration-1000 select-none pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
