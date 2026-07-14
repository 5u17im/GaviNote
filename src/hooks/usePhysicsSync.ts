import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { CATEGORY_PHYSICS, sanitizeBody, type NodeBody } from '../physics/bodies';
import { calcBezierPath } from '../utils/bezier';
import { logError } from '../utils/logger';
import type { NodeMeta, Connection } from '../types/node.types';
import type { Constellation } from '../utils/constellations';

export interface ConnectionPathRefs {
  path: SVGPathElement | null;
  thick: SVGPathElement | null;
}

interface UsePhysicsSyncProps {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  svgRefs: React.MutableRefObject<Map<string, ConnectionPathRefs>>;
  nodes: NodeMeta[];
  connections: Connection[];
  zoom: number;
  panX: number;
  panY: number;
  searchQuery: string;
  constellations: Constellation[];
  // Combined constellation list (expanded + frozen-collapsed) shared with the
  // render layer so halo/star ref ids line up exactly with the RAF sync loop.
  constellationEntries: { id: number; key: string; nodeIds: string[]; color: string; collapsed: boolean }[];
  haloRefs: React.MutableRefObject<Map<number, SVGEllipseElement>>;
  collapsedClusters: { key: string; nodeIds: string[] }[];
  starRefs: React.MutableRefObject<Map<number, SVGGElement>>;
}

// Extra px around the viewport before a card is culled — avoids pop-in when panning.
const CULL_MARGIN = 200;

// Padding added around a constellation's member bounding box for its halo.
const HALO_PADDING = 90;

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
  svgRefs,
  nodes, 
  connections,
  zoom,
  panX,
  panY,
  searchQuery,
  constellations,
  constellationEntries,
  haloRefs,
  collapsedClusters,
  starRefs
}: UsePhysicsSyncProps) {
  // Keep stable refs so the RAF loop always has fresh data without restarting
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  // null = no active search; otherwise the set of node ids matching the query.
  const matchIdsRef = useRef<Set<string> | null>(null);
  const constellationsRef = useRef<Constellation[]>(constellations);
  const constellationEntriesRef = useRef(constellationEntries);
  const collapsedClustersRef = useRef<{ key: string; nodeIds: string[] }[]>(collapsedClusters);
  // Set of node ids that belong to a currently collapsed cluster (frozen list).
  const collapsedNodeSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    nodesRef.current = nodes;
    connectionsRef.current = connections;
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
    constellationsRef.current = constellations;
    constellationEntriesRef.current = constellationEntries;
    collapsedClustersRef.current = collapsedClusters;

    // Flat set of node ids belonging to any currently collapsed cluster. Membership
    // is frozen at collapse time, so deleting a member doesn't drop the cluster or
    // make its halo orbit the vanishing body.
    const collapsedNodeSet = new Set<string>();
    for (const c of collapsedClusters) {
      for (const nid of c.nodeIds) collapsedNodeSet.add(nid);
    }
    collapsedNodeSetRef.current = collapsedNodeSet;

    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      matchIdsRef.current = null;
    } else {
      const set = new Set<string>();
      for (const n of nodes) {
        const haystack = `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase();
        if (haystack.includes(q)) set.add(n.id);
      }
      matchIdsRef.current = set;
    }
  }, [nodes, connections, zoom, panX, panY, searchQuery, constellations, constellationEntries, collapsedClusters]);

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

        // Build an O(1) lookup map once per frame instead of O(N) Array.find per body/connection
        const nodeMap = new Map<string, NodeMeta>();
        for (const node of currentNodes) nodeMap.set(node.id, node);

        // 0. Constellations — fit each halo around its live members, and, for
        // collapsed ones, position the "star" at the centroid. This runs first so
        // the node/connection passes below can hide members and re-route lines to
        // the star. The physics bodies are never touched — this is purely visual.
        const collapsedNodeIds = new Set<string>();
        // Shared centroid object per collapsed constellation — identity is reused
        // so a connection can detect "both endpoints in the same star".
        const centroidByNode = new Map<string, { x: number; y: number }>();

        // A collapsed cluster with a deleted member may no longer exist in the
        // recomputed `constellations`, so we iterate the combined list built in
        // PhysicsCanvas (expanded + frozen-collapsed). Each entry carries a stable
        // numeric id (used as the halo/star ref key) and its (possibly frozen)
        // member list. Includes nodes mid-deletion are excluded by computeConstellations,
        // so a cluster's halo never follows a body flying into the vortex.
        const entries = constellationEntriesRef.current;
        for (const c of entries) {
          const ell = haloRefs.current.get(c.id);
          const star = starRefs.current.get(c.id);
          const collapsed = c.collapsed;

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          let hasMember = false;
          for (const nid of c.nodeIds) {
            const b = bodies.get(nid);
            if (!b || !Number.isFinite(b.position.x) || !Number.isFinite(b.position.y)) continue;
            const nm = nodeMap.get(nid);
            const cfg = nm ? CATEGORY_PHYSICS[nm.category] : undefined;
            const w = nm?.width ?? cfg?.width ?? 260;
            const h = nm?.height ?? cfg?.height ?? 120;
            minX = Math.min(minX, b.position.x - w / 2);
            maxX = Math.max(maxX, b.position.x + w / 2);
            minY = Math.min(minY, b.position.y - h / 2);
            maxY = Math.max(maxY, b.position.y + h / 2);
            hasMember = true;
          }

          if (!hasMember) {
            if (ell && ell.style.display !== 'none') ell.style.display = 'none';
            if (star && star.style.display !== 'none') star.style.display = 'none';
            continue;
          }

          const cxHalo = (minX + maxX) / 2;
          const cyHalo = (minY + maxY) / 2;

          if (ell) {
            ell.style.display = '';
            ell.setAttribute('cx', cxHalo.toString());
            ell.setAttribute('cy', cyHalo.toString());
            ell.setAttribute('rx', ((maxX - minX) / 2 + HALO_PADDING).toString());
            ell.setAttribute('ry', ((maxY - minY) / 2 + HALO_PADDING).toString());
          }

          if (star) {
            star.style.display = '';
            // Collapsed → star sits at the centroid; expanded → chip floats above.
            const sx = cxHalo;
            const sy = collapsed ? cyHalo : minY - 30;
            star.setAttribute('transform', `translate(${sx}, ${sy})`);
          }

          if (collapsed) {
            const centroid = { x: cxHalo, y: cyHalo };
            for (const nid of c.nodeIds) {
              collapsedNodeIds.add(nid);
              centroidByNode.set(nid, centroid);
            }
          }
        }

        // 1. Sync Node DOM positions — read live body positions every frame
        for (const [id, body] of bodies.entries()) {
          const domElement = doms.get(id);
          if (!domElement) continue;
          const nodeMeta = nodeMap.get(id);
          if (!nodeMeta) continue;

          // Collapsed into a star: hide the member card entirely (body keeps
          // simulating, so expanding restores it exactly where physics left it).
          if (collapsedNodeIds.has(id)) {
            if (domElement.style.display !== 'none') domElement.style.display = 'none';
            continue;
          }

          // Last line of defense: repair any body whose state went non-finite so a
          // single corrupted frame can't permanently brick a node.
          sanitizeBody(body, nodeMeta.initialX, nodeMeta.initialY);

          // Self-healing: if body is static but node is not pinned (and not dragging), restore it to dynamic.
          // Skip members of a collapsed constellation — they are frozen on purpose until un-collapsed.
          const isPinned = nodeMeta.isPinned || false;
          const isDragging = (body as NodeBody).isDragging || false;
          const inCollapsed = collapsedNodeSetRef.current.has(id);
          if (body.isStatic && !isPinned && !isDragging && !inCollapsed) {
            Matter.Body.setStatic(body, false);
          }

          // Use nodeMeta dimensions if available, fallback to category defaults
          const config = CATEGORY_PHYSICS[nodeMeta.category];
          const width = nodeMeta.width ?? config?.width ?? 260;
          const height = nodeMeta.height ?? config?.height ?? 120;
          const x = body.position.x - width / 2;
          const y = body.position.y - height / 2;

          // Viewport culling: skip DOM work for cards far outside the visible area.
          // The expensive part is compositing many backdrop-blur layers, so hiding
          // off-screen cards is a big win on large maps. Deleting cards animate
          // toward the on-screen vortex, so they are never culled.
          if (!nodeMeta.isDeleting) {
            const cz = zoomRef.current;
            const screenX = window.innerWidth / 2 + panXRef.current + body.position.x * cz;
            const screenY = window.innerHeight / 2 + panYRef.current + body.position.y * cz;
            const halfW = (width / 2) * cz + CULL_MARGIN;
            const halfH = (height / 2) * cz + CULL_MARGIN;
            const onScreen =
              screenX + halfW > 0 &&
              screenX - halfW < window.innerWidth &&
              screenY + halfH > 0 &&
              screenY - halfH < window.innerHeight;
            if (!onScreen) {
              if (domElement.style.display !== 'none') domElement.style.display = 'none';
              continue;
            }
            if (domElement.style.display === 'none') domElement.style.display = '';
          }

          if (nodeMeta.isDeleting) {
            // Calculate vortex world position dynamically (matches the on-screen
            // vortex element, bottom-right, with the same 64px inset).
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const currentZoom = zoomRef.current;
            const currentPanX = panXRef.current;
            const currentPanY = panYRef.current;

            const vortexWorldX = (window.innerWidth - 64 - cx - currentPanX) / currentZoom;
            const vortexWorldY = (window.innerHeight - 64 - cy - currentPanY) / currentZoom;

            const dx = vortexWorldX - body.position.x;
            const dy = vortexWorldY - body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const pullAngle = Math.atan2(dy, dx);

            // Normalize t from 1.0 (far, full size) to ~0.0 (at the singularity).
            // ease-in so the spaghettification accelerates as it nears the center.
            const SPAGHETTI_RANGE = 420;
            const linear = Math.min(1.0, distance / SPAGHETTI_RANGE);
            const t = linear * linear;

            // Spaghettification: stretch dramatically along the pull axis (X) and
            // pinch to a thin strand perpendicular (Y) — like matter crossing the
            // event horizon. ease-in makes it snap into a noodle near the core.
            const scaleX = (1.0 + (1.0 - t) * 7.0) * (1.0 - t) + 0.06;
            const scaleY = (0.04 + t * 0.9) * (1.0 - t) + 0.02;

            // Tangential skew to simulate spiral shear stress (curved path bending)
            const skewVal = Math.pow(1.0 - t, 1.5) * 60;

            // 3D twist: spin the card around its longitudinal axis as it sinks
            const rotateXVal = (1.0 - t) * 720;

            // Anchor the transform at the card's center so the stretch points at
            // the vortex instead of drifting off-axis.
            const anchorX = x + width / 2;
            const anchorY = y + height / 2;
            domElement.style.transform = `perspective(800px) translate3d(${anchorX}px, ${anchorY}px, 0) rotate(${pullAngle}rad) rotateX(${rotateXVal}deg) skewX(${skewVal}deg) scale(${scaleX}, ${scaleY})`;
            domElement.style.opacity = `${Math.min(1.0, distance / 90)}`; // Fade out close to singularity
          } else {
            domElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
            // Search: dim cards that don't match the active query (null = no search).
            const matches = matchIdsRef.current;
            domElement.style.opacity = matches && !matches.has(id) ? '0.12' : '1';
          }
        }

        // 2. Sync SVG connection paths — same frame, same body positions
        currentConnections.forEach((conn) => {
          const refs = svgRefs.current.get(conn.id);
          const pathEl = refs?.path ?? null;
          const thickEl = refs?.thick ?? null;

          const nodeA = nodeMap.get(conn.sourceId);
          const nodeB = nodeMap.get(conn.targetId);

          // Hide connection line if either node is deleting
          if (nodeA?.isDeleting || nodeB?.isDeleting) {
            if (pathEl) pathEl.removeAttribute('d');
            if (thickEl) thickEl.removeAttribute('d');
            return;
          }

          const sourceBody = bodies.get(conn.sourceId);
          const targetBody = bodies.get(conn.targetId);
          if (!sourceBody || !targetBody) return;

          // Collapsed constellations: an internal edge (both ends in the same
          // star) is hidden; an external edge re-routes its collapsed end to the
          // star's centroid so it visibly connects to the star.
          const sc = centroidByNode.get(conn.sourceId);
          const tc = centroidByNode.get(conn.targetId);
          if (sc && tc && sc === tc) {
            if (pathEl) pathEl.removeAttribute('d');
            if (thickEl) thickEl.removeAttribute('d');
            return;
          }
          const sourceX = sc ? sc.x : sourceBody.position.x;
          const sourceY = sc ? sc.y : sourceBody.position.y;
          const targetX = tc ? tc.x : targetBody.position.x;
          const targetY = tc ? tc.y : targetBody.position.y;

          const path = calcBezierPath(sourceX, sourceY, targetX, targetY);

          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Elastic tension calculations (rest length of spring is 260px)
          const ratio = distance / 260;
          const tension = Math.min(1.0, Math.max(0.0, (ratio - 1.0) / 1.5));

          const baseColor = BASE_COLORS[conn.type] || BASE_COLORS.neutra;
          const currentColor = tension > 0 ? interpolateColor(baseColor, TENSE_COLOR, tension) : baseColor;

          const baseWidth = conn.type === 'apoyo' ? 3 : 2;
          const currentWidth = Math.max(0.8, baseWidth - tension * 1.2);
          
          // Search: dim connections unless both endpoints match the active query.
          const matches = matchIdsRef.current;
          const dimmed = matches ? !(matches.has(conn.sourceId) && matches.has(conn.targetId)) : false;

          if (pathEl) {
            pathEl.setAttribute('d', path);
            pathEl.setAttribute('stroke', currentColor);
            pathEl.setAttribute('stroke-width', currentWidth.toString());
            pathEl.style.opacity = dimmed ? '0.1' : '1';
          }
          if (thickEl) {
            thickEl.setAttribute('d', path);
          }
        });
      } catch (err) {
        logError("Error in syncPositions RAF loop:", err);
      }

      rafId = requestAnimationFrame(syncPositions);
    };

    rafId = requestAnimationFrame(syncPositions);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [engineRef, bodiesRef, domRefs, svgRefs, haloRefs, starRefs]);


}
