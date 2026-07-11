import React, { useRef } from 'react';
import Matter from 'matter-js';

interface UseDragNodeProps {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  zoom: number;
  panX: number;
  panY: number;
}

export function useDragNode({ engineRef, bodiesRef, zoom, panX, panY }: UseDragNodeProps) {
  const dragInfo = useRef<{
    nodeId: string;
    pointerId: number;
    startX: number;
    startY: number;
    startBodyX: number;
    startBodyY: number;
    lastTime: number;
    lastX: number;
    lastY: number;
    velocities: { x: number; y: number }[];
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    const engine = engineRef.current;
    const body = bodiesRef.current.get(nodeId);
    if (!body || !engine) return;

    // Only allow left click / main pointer button
    if (e.button !== 0) return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    // Stop existing movement, make static to prevent gravity pulling it away while holding
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);
    
    // Save state
    dragInfo.current = {
      nodeId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startBodyX: body.position.x,
      startBodyY: body.position.y,
      lastTime: performance.now(),
      lastX: body.position.x,
      lastY: body.position.y,
      velocities: [],
    };

    e.stopPropagation();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    const info = dragInfo.current;
    if (!info || !engine) return;

    const body = bodiesRef.current.get(info.nodeId);
    if (!body) return;

    // Calculate delta on screen
    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    // Convert screen delta to world delta (account for zoom)
    const worldDx = dx / zoom;
    const worldDy = dy / zoom;

    const newX = info.startBodyX + worldDx;
    const newY = info.startBodyY + worldDy;

    // Calculate velocity for inertia
    const currentTime = performance.now();
    const dt = Math.max(1, currentTime - info.lastTime); // Prevent divide by zero

    const instantVx = (newX - info.lastX) / (dt / 16.67); // Normalized to ~60 FPS frame time
    const instantVy = (newY - info.lastY) / (dt / 16.67);

    // Keep sliding window of velocities for smoothing
    info.velocities.push({ x: instantVx, y: instantVy });
    if (info.velocities.length > 5) {
      info.velocities.shift();
    }

    // Update body position
    Matter.Body.setPosition(body, { x: newX, y: newY });
    
    // Keep velocity active so it can push other objects while dragging
    Matter.Body.setVelocity(body, { x: instantVx * 0.5, y: instantVy * 0.5 });

    // Update time and last positions
    info.lastTime = currentTime;
    info.lastX = newX;
    info.lastY = newY;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    const info = dragInfo.current;
    if (!info || !engine) return;

    const body = bodiesRef.current.get(info.nodeId);
    if (body) {
      // Calculate average velocity from window
      const count = info.velocities.length;
      let avgVx = 0;
      let avgVy = 0;

      if (count > 0) {
        const sum = info.velocities.reduce((acc, curr) => {
          acc.x += curr.x;
          acc.y += curr.y;
          return acc;
        }, { x: 0, y: 0 });
        avgVx = sum.x / count;
        avgVy = sum.y / count;
      }

      // Apply drag release velocity (inertia)
      Matter.Body.setVelocity(body, {
        x: Math.min(Math.max(avgVx, -15), 15), // Clamp to prevent bullet speeds
        y: Math.min(Math.max(avgVy, -15), 15),
      });
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore capture release errors
    }

    dragInfo.current = null;
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDragging: (nodeId: string) => dragInfo.current?.nodeId === nodeId,
  };
}
