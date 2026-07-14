import { useRef, useEffect } from 'react';
import Matter from 'matter-js';
import { useGraviStore } from '../store/useGraviStore';
import { logError } from '../utils/logger';
import type { NodeBody } from '../physics/bodies';

interface UseDragNodeProps {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  constraintsRef: React.MutableRefObject<Map<string, Matter.Constraint>>;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  zoom: number;
  panX: number;
  panY: number;
}

export function useDragNode({ engineRef, bodiesRef, constraintsRef, domRefs, zoom, panX, panY }: UseDragNodeProps) {
  // Store zoom/pan in refs so the window-level event listeners always read current values
  // without needing to re-register
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);

  useEffect(() => {
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
  }, [zoom, panX, panY]);

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
      try {
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

          // Temporarily make the body static during drag to disable gravity/forces
          Matter.Body.setStatic(body, true);
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(body, 0);
          (body as NodeBody).isDragging = true;

          // Temporarily remove constraints connected to this body from the Matter.js world
          const world = engine.world;
          constraintsRef.current.forEach((constraint) => {
            if (constraint.bodyA === body || constraint.bodyB === body) {
              Matter.Composite.remove(world, constraint);
            }
          });
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

        info.lastTime = currentTime;
        info.lastX = newX;
        info.lastY = newY;
      } catch (err) {
        logError("Error in drag onMove handler:", err);
      }
    };

    const onUp = (e: PointerEvent) => {
      try {
        const engine = engineRef.current;
        const info = dragInfo.current;
        if (!info || !engine || e.pointerId !== info.pointerId) return;

        const body = bodiesRef.current.get(info.nodeId);

        if (body) {
          delete (body as NodeBody).isDragging;
        }

        if (body && info.hasCaptured) {
          // Restore dynamic status unless the node is pinned
          const nodes = useGraviStore.getState().nodes;
          const nodeMeta = nodes.find(n => n.id === info.nodeId);
          const isPinned = nodeMeta?.isPinned || false;

          if (!isPinned) {
            Matter.Body.setStatic(body, false);
            
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

          // Persist final position to the Zustand store so it saves to localStorage
          useGraviStore.getState().updateNode(info.nodeId, {
            initialX: body.position.x,
            initialY: body.position.y,
          });

          // Restore constraints connected to this body in the Matter.js world
          const world = engine.world;
          constraintsRef.current.forEach((constraint) => {
            if (constraint.bodyA === body || constraint.bodyB === body) {
              const bodyA = constraint.bodyA;
              const bodyB = constraint.bodyB;
              if (bodyA && bodyB) {
                const nodeA = nodes.find(n => n.id === bodyA.label);
                const nodeB = nodes.find(n => n.id === bodyB.label);
                const isAnyPinned = nodeA?.isPinned || nodeB?.isPinned || false;

                if (isAnyPinned) {
                  // Dynamically set spring length to the new dragged distance to allow branches to stay at new positions
                  const dx = bodyA.position.x - bodyB.position.x;
                  const dy = bodyA.position.y - bodyB.position.y;
                  const currentDist = Math.sqrt(dx * dx + dy * dy);
                  constraint.length = Math.max(80, currentDist);
                } else {
                  // Reset to standard spring length for dynamic nodes
                  constraint.length = 260;
                }

                // Wake up both bodies to ensure no collision loss
                Matter.Sleeping.set(bodyA, false);
                Matter.Sleeping.set(bodyB, false);
              }

              if (!Matter.Composite.allConstraints(world).includes(constraint)) {
                Matter.Composite.add(world, constraint);
              }
            }
          });
        }

        if (info.captureEl && info.hasCaptured) {
          try { info.captureEl.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        }
      } catch (err) {
        logError("Error in drag onUp handler:", err);
      } finally {
        dragInfo.current = null;
      }
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
