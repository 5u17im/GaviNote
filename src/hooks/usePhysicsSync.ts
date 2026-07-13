import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { CATEGORY_PHYSICS } from '../physics/bodies';
import { calcBezierPath } from '../utils/bezier';
import type { NodeMeta, Connection } from '../types/node.types';

interface UsePhysicsSyncProps {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  nodes: NodeMeta[];
  connections: Connection[];
  zoom: number;
  panX: number;
  panY: number;
}

const BASE_COLORS = {
  neutra: '#64748B',
  apoyo: '#059669',
  conflicto: '#DC2626',
};

const TENSE_COLOR = '#FF3E3E'; // Bright neon red

// Simple hex color interpolator
function interpolateColor(color1: string, color2: string, factor: number) {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function usePhysicsSync({ 
  engineRef, 
  bodiesRef, 
  domRefs, 
  nodes, 
  connections,
  zoom,
  panX,
  panY
}: UsePhysicsSyncProps) {
  // Keep stable refs so the RAF loop always has fresh data without restarting
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);

  useEffect(() => {
    nodesRef.current = nodes;
    connectionsRef.current = connections;
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
  }, [nodes, connections, zoom, panX, panY]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let rafId: number | null = null;

    const syncPositions = () => {
      try {
        const bodies = bodiesRef.current;
        const doms = domRefs.current;
        const currentNodes = nodesRef.current;
        const currentConnections = connectionsRef.current;

        // 1. Sync Node DOM positions — read live body positions every frame
        for (const [id, body] of bodies.entries()) {
          const domElement = doms.get(id);
          if (!domElement) continue;
          const nodeMeta = currentNodes.find((n) => n.id === id);
          if (!nodeMeta) continue;

          // Self-healing: if body is static but node is not pinned (and not dragging), restore it to dynamic
          const isPinned = nodeMeta.isPinned || false;
          const isDragging = (body as unknown as { isDragging?: boolean }).isDragging || false;
          if (body.isStatic && !isPinned && !isDragging) {
            Matter.Body.setStatic(body, false);
          }

          // Use nodeMeta dimensions if available, fallback to category defaults
          const config = CATEGORY_PHYSICS[nodeMeta.category];
          const width = nodeMeta.width ?? config?.width ?? 260;
          const height = nodeMeta.height ?? config?.height ?? 120;
          const x = body.position.x - width / 2;
          const y = body.position.y - height / 2;

          if (nodeMeta.isDeleting) {
            // Calculate vortex world position dynamically
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const currentZoom = zoomRef.current;
            const currentPanX = panXRef.current;
            const currentPanY = panYRef.current;

            const vortexWorldX = (window.innerWidth - 56 - cx - currentPanX) / currentZoom;
            const vortexWorldY = (window.innerHeight - 56 - cy - currentPanY) / currentZoom;

            const dx = vortexWorldX - body.position.x;
            const dy = vortexWorldY - body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const pullAngle = Math.atan2(dy, dx);

            // Normalize t from 1.0 (at 350px distance) to 0.0 (at center)
            const t = Math.min(1.0, distance / 350);

            // Spaghettification stretching: long on pull axis (X), narrow on perpendicular (Y)
            const scaleX = (1.0 + (1.0 - t) * 2.5) * t;
            const scaleY = (0.05 + t * 0.65) * t;

            // Tangential skew angle to simulate spiral shear stress (curved path bending)
            const skewVal = (1.0 - t) * 35;

            // 3D twist: spin the card around its longitudinal axis as it sinks
            const rotateXVal = (1.0 - t) * 360;

            domElement.style.transform = `perspective(800px) translate3d(${x}px, ${y}px, 0) rotate(${pullAngle}rad) rotateX(${rotateXVal}deg) skewX(${skewVal}deg) scale(${scaleX}, ${scaleY})`;
            domElement.style.opacity = `${Math.min(1.0, distance / 120)}`; // Fade out close to singularity
          } else {
            domElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
            domElement.style.opacity = '1';
          }
        }

        // 2. Sync SVG connection paths — same frame, same body positions
        currentConnections.forEach((conn) => {
          const pathEl = document.getElementById(`path-${conn.id}`);
          const thickEl = document.getElementById(`thick-${conn.id}`);

          const nodeA = currentNodes.find((n) => n.id === conn.sourceId);
          const nodeB = currentNodes.find((n) => n.id === conn.targetId);

          // Hide connection line if either node is deleting
          if (nodeA?.isDeleting || nodeB?.isDeleting) {
            if (pathEl) pathEl.removeAttribute('d');
            if (thickEl) thickEl.removeAttribute('d');
            return;
          }

          const sourceBody = bodies.get(conn.sourceId);
          const targetBody = bodies.get(conn.targetId);
          if (!sourceBody || !targetBody) return;

          const path = calcBezierPath(
            sourceBody.position.x,
            sourceBody.position.y,
            targetBody.position.x,
            targetBody.position.y
          );

          const dx = targetBody.position.x - sourceBody.position.x;
          const dy = targetBody.position.y - sourceBody.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Elastic tension calculations (rest length of spring is 260px)
          const ratio = distance / 260;
          const tension = Math.min(1.0, Math.max(0.0, (ratio - 1.0) / 1.5));

          const baseColor = BASE_COLORS[conn.type] || BASE_COLORS.neutra;
          const currentColor = tension > 0 ? interpolateColor(baseColor, TENSE_COLOR, tension) : baseColor;

          const baseWidth = conn.type === 'apoyo' ? 3 : 2;
          const currentWidth = Math.max(0.8, baseWidth - tension * 1.2);
          
          if (pathEl) {
            pathEl.setAttribute('d', path);
            pathEl.setAttribute('stroke', currentColor);
            pathEl.setAttribute('stroke-width', currentWidth.toString());
          }
          if (thickEl) {
            thickEl.setAttribute('d', path);
          }
        });
      } catch (err) {
        console.error("Error in syncPositions RAF loop:", err);
      }

      rafId = requestAnimationFrame(syncPositions);
    };

    rafId = requestAnimationFrame(syncPositions);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [engineRef, bodiesRef, domRefs]);


}
