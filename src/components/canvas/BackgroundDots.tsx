'use client';

import React, { useEffect, useRef } from 'react';

interface BackgroundDotsProps {
  zoom: number;
  panX: number;
  panY: number;
}

export function BackgroundDots({ zoom, panX, panY }: BackgroundDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Draw function
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with very dark background space color #0B0F19
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle central radial glow
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.max(width, height) * 0.8;
      const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      bgGlow.addColorStop(0, 'rgba(11, 25, 44, 0.4)'); // slightly lighter blue-gray center
      bgGlow.addColorStop(1, '#0B0F19');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw mouse radial glow
      if (mouseRef.current.x >= 0 && mouseRef.current.y >= 0) {
        const mouseGlow = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          200
        );
        mouseGlow.addColorStop(0, 'rgba(0, 229, 255, 0.04)'); // very subtle cian glow
        mouseGlow.addColorStop(1, 'rgba(11, 15, 25, 0)');
        ctx.fillStyle = mouseGlow;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 200, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Dot Grid
      const baseGap = 50; // space between dots
      const step = baseGap * zoom;

      // Calculate starting offsets based on camera panning & zoom
      let startX = (panX * zoom) % step;
      if (startX < 0) startX += step;
      let startY = (panY * zoom) % step;
      if (startY < 0) startY += step;

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const maxInfluenceDist = 180; // hover influence range

      ctx.fillStyle = 'rgba(240, 244, 255, 0.08)'; // default dot color

      for (let x = startX; x < width; x += step) {
        for (let y = startY; y < height; y += step) {
          // Calculate distance to mouse
          const dx = mouseX - x;
          const dy = mouseY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let dotRadius = 1 * Math.max(0.6, zoom);
          let opacity = 0.08;

          if (dist < maxInfluenceDist) {
            // Smooth bell curve influence
            const factor = 1 - dist / maxInfluenceDist;
            opacity = 0.08 + factor * 0.22;
            dotRadius += factor * 1.5;

            // Draw glowing dot
            ctx.fillStyle = `rgba(0, 229, 255, ${opacity})`;
          } else {
            ctx.fillStyle = `rgba(240, 244, 255, ${opacity})`;
          }

          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [zoom, panX, panY]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block"
      style={{ zIndex: 0 }}
    />
  );
}
