'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export function DisintegrationEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    // Make the particles canvas very large (infinite canvas bounds)
    // We can position it at -3000, -3000 and make it 6000x6000 to cover the whole arena
    canvas.width = 6000;
    canvas.height = 6000;

    const addExplosion = (x: number, y: number, color: string) => {
      // Matter.js coordinates are centered around (0,0)
      // The canvas origin (0,0) is at top-left. Since the canvas is positioned at left: -3000, top: -3000:
      // We translate world coordinates to canvas-space coordinates:
      const canvasX = x + 3000;
      const canvasY = y + 3000;

      // Spawn 15-25 particles
      const count = 15 + Math.floor(Math.random() * 10);
      const newParticles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        
        newParticles.push({
          x: canvasX,
          y: canvasY,
          // Explode outwards and float slightly upwards (negative vy)
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2, 
          radius: 2 + Math.random() * 4,
          color,
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.02, // fades out in ~1-2 seconds
        });
      }

      particlesRef.current.push(...newParticles);
    };

    // Listen to custom window events for explosions
    const handleExplosionEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; color: string }>;
      const { x, y, color } = customEvent.detail;
      addExplosion(x, y, color);
    };

    window.addEventListener('node-disintegrated', handleExplosionEvent);

    const updateAndDraw = () => {
      // Clear canvas (transparent background so it overlays)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      if (particles.length > 0) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          
          // Update physics
          p.x += p.vx;
          p.y += p.vy;
          // Apply air resistance
          p.vx *= 0.98;
          p.vy *= 0.98;
          // Apply fade
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          // Draw particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          
          // Add soft shadow glow
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          
          ctx.fill();
        }
        
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener('node-disintegrated', handleExplosionEvent);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none block"
      style={{
        zIndex: 8,
        left: '-3000px',
        top: '-3000px',
        width: '6000px',
        height: '6000px',
      }}
    />
  );
}

// Global utility helper to trigger disintegration explosion from anywhere
export function triggerDisintegration(x: number, y: number, color: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('node-disintegrated', {
        detail: { x, y, color },
      })
    );
  }
}
