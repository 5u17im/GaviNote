import { useEffect } from 'react';
import Matter from 'matter-js';
import { useGraviStore } from '../store/useGraviStore';
import type { NodeMeta } from '../types/node.types';

interface UsePresentationProps {
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  nodes: NodeMeta[];
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (
    x: number | ((prev: number) => number),
    y: number | ((prev: number) => number)
  ) => void;
}

// Zoom level used when framing a single node during the guided tour.
const FOCUS_ZOOM = 1.4;
const TWEEN_MS = 650;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Presentation / guided tour (Idea 3). When presenting, animates the camera to
 * frame the current node and wires arrow keys / Escape to navigate and exit.
 */
export function usePresentation({ bodiesRef, nodes, setZoom, setPan }: UsePresentationProps) {
  const isPresenting = useGraviStore((s) => s.isPresenting);
  const tourIndex = useGraviStore((s) => s.tourIndex);
  const nextStep = useGraviStore((s) => s.nextStep);
  const prevStep = useGraviStore((s) => s.prevStep);
  const stopPresentation = useGraviStore((s) => s.stopPresentation);

  // Animate the camera toward the current node whenever the tour advances.
  useEffect(() => {
    if (!isPresenting) return;
    const node = nodes[tourIndex];
    if (!node) return;

    const body = bodiesRef.current.get(node.id);
    const targetX = body ? body.position.x : node.initialX;
    const targetY = body ? body.position.y : node.initialY;
    const targetZoom = FOCUS_ZOOM;
    const targetPanX = -targetX * targetZoom;
    const targetPanY = -targetY * targetZoom;

    const start = useGraviStore.getState().physicsConfig;
    const from = { zoom: start.zoom, panX: start.panX, panY: start.panY };

    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / TWEEN_MS);
      const e = easeInOutCubic(p);
      setZoom(from.zoom + (targetZoom - from.zoom) * e);
      setPan(from.panX + (targetPanX - from.panX) * e, from.panY + (targetPanY - from.panY) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isPresenting, tourIndex, nodes, bodiesRef, setZoom, setPan]);

  // Keyboard navigation while presenting.
  useEffect(() => {
    if (!isPresenting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isTyping) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'Escape') {
        stopPresentation();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPresenting, nextStep, prevStep, stopPresentation]);
}
