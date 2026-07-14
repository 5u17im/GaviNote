import { useEffect } from 'react';
import Matter from 'matter-js';
import { commandBus } from '../utils/commandBus';
import { useGraviStore } from '../store/useGraviStore';
import { CATEGORY_INFO } from '../components/nodes/registry';
import { triggerDisintegration } from '../components/particles/DisintegrationEffect';
import type { NodeMeta } from '../types/node.types';

interface UseCanvasCommandsProps {
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  nodes: NodeMeta[];
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (
    x: number | ((prev: number) => number),
    y: number | ((prev: number) => number)
  ) => void;
}

/**
 * Registers the global canvas commands (Big Bang, Clear, Zoom-to-Fit) on the
 * typed command bus. Extracted out of PhysicsCanvas to keep that component lean.
 */
export function useCanvasCommands({ bodiesRef, nodes, setZoom, setPan }: UseCanvasCommandsProps) {
  // Big Bang: apply radial random velocities to every body
  useEffect(() => {
    return commandBus.on('bigBang', () => {
      for (const body of bodiesRef.current.values()) {
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 16,
          y: (Math.random() - 0.5) * 16,
        });
      }
    });
  }, [bodiesRef]);

  // Clear Canvas: burst particles on all nodes then clear the store
  useEffect(() => {
    return commandBus.on('clearCanvas', () => {
      bodiesRef.current.forEach((body, nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          const color = CATEGORY_INFO[node.category]?.color || '#00E5FF';
          triggerDisintegration(body.position.x, body.position.y, color);
        }
      });

      setTimeout(() => {
        useGraviStore.getState().clearCanvas();
      }, 400);
    });
  }, [bodiesRef, nodes]);

  // Zoom to Fit: compute bounding box of all bodies and frame it
  useEffect(() => {
    return commandBus.on('zoomFit', () => {
      const bodies = Array.from(bodiesRef.current.values());
      if (bodies.length === 0) {
        setZoom(1.0);
        setPan(0, 0);
        return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const body of bodies) {
        minX = Math.min(minX, body.position.x);
        maxX = Math.max(maxX, body.position.x);
        minY = Math.min(minY, body.position.y);
        maxY = Math.max(maxY, body.position.y);
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const boxWidth = Math.max(100, maxX - minX + 300);
      const boxHeight = Math.max(100, maxY - minY + 200);

      const zoomX = (window.innerWidth - 120) / boxWidth;
      const zoomY = (window.innerHeight - 120) / boxHeight;

      const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.3), 1.25);

      setZoom(newZoom);
      setPan(-centerX * newZoom, -centerY * newZoom);
    });
  }, [bodiesRef, setZoom, setPan]);
}
