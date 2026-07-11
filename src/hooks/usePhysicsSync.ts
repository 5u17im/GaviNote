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
}

export function usePhysicsSync({ engineRef, bodiesRef, domRefs, nodes, connections }: UsePhysicsSyncProps) {
  // Keep stable refs so the RAF loop always has fresh data without restarting
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  nodesRef.current = nodes;
  connectionsRef.current = connections;

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let rafId: number | null = null;

    const syncPositions = () => {
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
        const config = CATEGORY_PHYSICS[nodeMeta.category];
        const width = config?.width ?? 260;
        const height = config?.height ?? 120;
        const x = body.position.x - width / 2;
        const y = body.position.y - height / 2;
        domElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
      }

      // 2. Sync SVG connection paths — same frame, same body positions
      currentConnections.forEach((conn) => {
        const sourceBody = bodies.get(conn.sourceId);
        const targetBody = bodies.get(conn.targetId);
        if (!sourceBody || !targetBody) return;

        const path = calcBezierPath(
          sourceBody.position.x,
          sourceBody.position.y,
          targetBody.position.x,
          targetBody.position.y
        );

        const pathEl = document.getElementById(`path-${conn.id}`);
        const thickEl = document.getElementById(`thick-${conn.id}`);
        if (pathEl) pathEl.setAttribute('d', path);
        if (thickEl) thickEl.setAttribute('d', path);
      });

      rafId = requestAnimationFrame(syncPositions);
    };

    rafId = requestAnimationFrame(syncPositions);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // Only restart if bodiesRef/domRefs/engineRef identity changes (i.e., never in practice)
  }, [engineRef, bodiesRef, domRefs]);
}
