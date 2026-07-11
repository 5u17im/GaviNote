import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { CATEGORY_PHYSICS } from '../physics/bodies';
import { calcBezierPath } from '../utils/bezier';
import type { NodeMeta, Connection } from '../types/node.types';

interface UsePhysicsSyncProps {
  engine: Matter.Engine | null;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  nodes: NodeMeta[];
  connections: Connection[];
}

export function usePhysicsSync({ engine, bodiesRef, domRefs, nodes, connections }: UsePhysicsSyncProps) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!engine) return;

    const syncPositions = () => {
      const bodies = bodiesRef.current;
      const doms = domRefs.current;

      // 1. Sync Node DOM coordinates
      for (const [id, body] of bodies.entries()) {
        const domElement = doms.get(id);
        if (domElement) {
          const nodeMeta = nodes.find((n) => n.id === id);
          if (nodeMeta) {
            const config = CATEGORY_PHYSICS[nodeMeta.category];
            const width = config?.width ?? 260;
            const height = config?.height ?? 120;

            const x = body.position.x - width / 2;
            const y = body.position.y - height / 2;

            domElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
          }
        }
      }

      // 2. Sync SVG connection lines
      connections.forEach((conn) => {
        const sourceBody = bodies.get(conn.sourceId);
        const targetBody = bodies.get(conn.targetId);

        if (sourceBody && targetBody) {
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
        }
      });

      rafRef.current = requestAnimationFrame(syncPositions);
    };

    rafRef.current = requestAnimationFrame(syncPositions);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [engine, nodes, connections, bodiesRef, domRefs]);
}
