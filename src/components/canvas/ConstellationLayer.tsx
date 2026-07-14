'use client';

import React from 'react';
import type { Constellation } from '../../utils/constellations';

interface ConstellationLayerProps {
  constellations: Constellation[];
  haloRefs: React.MutableRefObject<Map<number, SVGEllipseElement>>;
}

/**
 * Renders one soft, blurred halo per constellation (connected component) in
 * world space. The ellipse geometry is updated every frame by the RAF loop in
 * usePhysicsSync so the halo tracks its members as they drift around.
 */
export function ConstellationLayer({ constellations, haloRefs }: ConstellationLayerProps) {
  const register = (id: number) => (el: SVGEllipseElement | null) => {
    if (el) {
      haloRefs.current.set(id, el);
    } else {
      haloRefs.current.delete(id);
    }
  };

  return (
    <svg
      width={6000}
      height={6000}
      className="absolute pointer-events-none overflow-visible"
      style={{ zIndex: 1, left: 0, top: 0 }}
    >
      <defs>
        <filter id="constellation-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
      </defs>
      {constellations.map((c) => (
        <ellipse
          key={c.id}
          ref={register(c.id)}
          cx={0}
          cy={0}
          rx={0}
          ry={0}
          fill={c.color}
          opacity={0.09}
          filter="url(#constellation-blur)"
        />
      ))}
    </svg>
  );
}
