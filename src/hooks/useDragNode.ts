import { useRef, useEffect } from 'react';
import Matter from 'matter-js';

interface UseDragNodeProps {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  zoom: number;
  panX: number;
  panY: number;
}

export function useDragNode({ engineRef, bodiesRef, domRefs, zoom, panX, panY }: UseDragNodeProps) {
  // Store zoom/pan in refs so the window-level event listeners always read current values
  // without needing to re-register
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  const dragInfo = useRef<{
    nodeId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startBodyX: number;
    startBodyY: number;
    lastTime: number;
    lastX: number;
    lastY: number;
    velocities: { x: number; y: number }[];
    hasCaptured: boolean;
    captureEl: HTMLElement | null;
  } | null>(null);

  // Register pointermove / pointerup on window so they always fire regardless of
  // which DOM element the cursor is over, preventing the "wrong card moves" bug.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const engine = engineRef.current;
      const info = dragInfo.current;
      if (!info || !engine || e.pointerId !== info.pointerId) return;

      const body = bodiesRef.current.get(info.nodeId);
      if (!body) return;

      const dx = e.clientX - info.startClientX;
      const dy = e.clientY - info.startClientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 4px threshold: prevents micro-drags from interfering with click/dblclick
      if (!info.hasCaptured && distance < 4) return;

      if (!info.hasCaptured) {
        // Capture the pointer on the exact element where pointerDown fired so
        // subsequent events route here even when cursor leaves that element
        if (info.captureEl) {
          try { info.captureEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        info.hasCaptured = true;

        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      }

      const currentZoom = zoomRef.current;
      const worldDx = dx / currentZoom;
      const worldDy = dy / currentZoom;

      const newX = info.startBodyX + worldDx;
      const newY = info.startBodyY + worldDy;

      // Velocity tracking for inertia on release
      const currentTime = performance.now();
      const dt = Math.max(1, currentTime - info.lastTime);
      const instantVx = (newX - info.lastX) / (dt / 16.67);
      const instantVy = (newY - info.lastY) / (dt / 16.67);

      info.velocities.push({ x: instantVx, y: instantVy });
      if (info.velocities.length > 5) info.velocities.shift();

      Matter.Body.setPosition(body, { x: newX, y: newY });
      // Low-weight velocity so body nudges other objects while dragging
      Matter.Body.setVelocity(body, { x: instantVx * 0.5, y: instantVy * 0.5 });

      info.lastTime = currentTime;
      info.lastX = newX;
      info.lastY = newY;
    };

    const onUp = (e: PointerEvent) => {
      const engine = engineRef.current;
      const info = dragInfo.current;
      if (!info || !engine || e.pointerId !== info.pointerId) return;

      const body = bodiesRef.current.get(info.nodeId);

      if (body && info.hasCaptured) {
        const count = info.velocities.length;
        let avgVx = 0, avgVy = 0;
        if (count > 0) {
          const sum = info.velocities.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
          avgVx = sum.x / count;
          avgVy = sum.y / count;
        }
        Matter.Body.setVelocity(body, {
          x: Math.min(Math.max(avgVx, -15), 15),
          y: Math.min(Math.max(avgVy, -15), 15),
        });
      }

      if (info.captureEl && info.hasCaptured) {
        try { info.captureEl.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      }

      dragInfo.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineRef, bodiesRef]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    const body = bodiesRef.current.get(nodeId);
    const engine = engineRef.current;
    if (!body || !engine) return;
    if (e.button !== 0) return;

    const captureEl = domRefs.current.get(nodeId) ?? null;

    dragInfo.current = {
      nodeId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBodyX: body.position.x,
      startBodyY: body.position.y,
      lastTime: performance.now(),
      lastX: body.position.x,
      lastY: body.position.y,
      velocities: [],
      hasCaptured: false,
      captureEl,
    };

    e.stopPropagation();
  };

  return {
    onPointerDown,
    isDragging: (nodeId: string) => !!dragInfo.current?.hasCaptured && dragInfo.current?.nodeId === nodeId,
  };
}
