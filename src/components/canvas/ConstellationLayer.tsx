'use client';

import React from 'react';

export interface ConstellationEntry {
  id: number;
  key: string;
  nodeIds: string[];
  color: string;
  collapsed: boolean;
}

interface ConstellationLayerProps {
  entries: ConstellationEntry[];
  haloRefs: React.MutableRefObject<Map<number, SVGEllipseElement>>;
  starRefs: React.MutableRefObject<Map<number, SVGGElement>>;
  collapsedClusters: { key: string; nodeIds: string[] }[];
  onToggleCollapse: (key: string, nodeIds: string[]) => void;
  onStarPointerDown: (key: string, e: React.PointerEvent) => void;
}

/**
 * Renders one soft, blurred halo per constellation (connected component) in
 * world space, plus a clickable control:
 *   - expanded  → a small "collapse" chip floating above the cluster.
 *   - collapsed → a glowing "star" at the centroid representing the whole group.
 *
 * All geometry (halo ellipse + control position) is updated every frame by the
 * RAF loop in usePhysicsSync. Collapsing is purely visual — the physics bodies
 * keep simulating underneath. Entries combine the live constellations with any
 * collapsed clusters (whose membership is frozen, so deleting a member doesn't
 * make the cluster vanish).
 */
export function ConstellationLayer({
  entries,
  haloRefs,
  starRefs,
  collapsedClusters,
  onToggleCollapse,
  onStarPointerDown,
}: ConstellationLayerProps) {
  const collapsedKeys = new Set(collapsedClusters.map((c) => c.key));

  const registerHalo = (id: number) => (el: SVGEllipseElement | null) => {
    if (el) haloRefs.current.set(id, el);
    else haloRefs.current.delete(id);
  };

  const registerStar = (id: number) => (el: SVGGElement | null) => {
    if (el) starRefs.current.set(id, el);
    else starRefs.current.delete(id);
  };

  return (
    <svg
      width={6000}
      height={6000}
      className="absolute overflow-visible"
      style={{ zIndex: 1, left: 0, top: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter id="constellation-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
      </defs>

      {entries.map((c) => {
        const isCollapsed = collapsedKeys.has(c.key);
        const count = c.nodeIds.length;
        return (
          <g key={c.id}>
            <ellipse
              ref={registerHalo(c.id)}
              cx={0}
              cy={0}
              rx={0}
              ry={0}
              fill={c.color}
              opacity={0.09}
              filter="url(#constellation-blur)"
            />

            <g
              ref={registerStar(c.id)}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onPointerDown={(e) => onStarPointerDown(c.key, e)}
              onClick={(e) => {
                e.stopPropagation();
                // If it's still collapsed after the gesture, the user dragged the
                // star (pointer ended on another node and fired this click); don't
                // toggle it back open. Only expand on a genuine tap of a star, or
                // collapse a halo/chip that was expanded.
                if (!isCollapsed) {
                  onToggleCollapse(c.key, c.nodeIds);
                }
              }}
            >
              <title>
                {isCollapsed
                  ? `Expandir constelación (${count} notas)`
                  : `Colapsar constelación en estrella (${count} notas)`}
              </title>

              {isCollapsed ? (
                <>
                  <circle r={34} fill={c.color} opacity={0.18} />
                  <circle
                    r={22}
                    fill="#0D0F17"
                    stroke={c.color}
                    strokeWidth={2}
                    opacity={0.95}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={16}
                    fontWeight={700}
                    fill={c.color}
                    style={{ userSelect: 'none' }}
                  >
                    {count}
                  </text>
                </>
              ) : (
                <>
                  <circle
                    r={11}
                    fill="#0D0F17"
                    stroke={c.color}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={700}
                    fill={c.color}
                    style={{ userSelect: 'none' }}
                  >
                    {count}
                  </text>
                </>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
