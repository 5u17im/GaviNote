import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { useGraviStore } from '../store/useGraviStore';

interface UseStarDragProps {
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  zoom: number;
  panX: number;
  panY: number;
  collapsedClusters: { key: string; nodeIds: string[] }[];
}

const DRAG_THRESHOLD = 4;

interface StarDragInfo {
  key: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPositions: Map<string, { x: number; y: number }>;
  hasCaptured: boolean;
  /** True when the constellation was collapsed at pointer-down (drag = move). */
  draggable: boolean;
}

/**
 * Lets the user move a collapsed constellation by dragging its "star". Because
 * the members are frozen while collapsed (with a frozen member list), we translate
 * every member body by the same world-space delta so their relative formation is
 * preserved — even if some members were deleted after collapsing. A plain tap
 * (below the drag threshold) collapses/expands the constellation instead.
 *
 * The mutation of member bodies here is intentionally the *only* write path for
 * the frozen cluster — the physics engine stays untouched otherwise.
 */
export function useStarDrag({
  bodiesRef,
  zoom,
  panX,
  panY,
  collapsedClusters,
}: UseStarDragProps) {
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const collapsedClustersRef = useRef(collapsedClusters);

  useEffect(() => {
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;
    collapsedClustersRef.current = collapsedClusters;
  }, [zoom, panX, panY, collapsedClusters]);

  const infoRef = useRef<StarDragInfo | null>(null);

  const onStarPointerDown = (key: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const cluster = collapsedClustersRef.current.find((c) => c.key === key);
    if (!cluster) return;

    const draggable = true;

    const startPositions = new Map<string, { x: number; y: number }>();
    for (const id of cluster.nodeIds) {
      const body = bodiesRef.current.get(id);
      if (body) startPositions.set(id, { x: body.position.x, y: body.position.y });
    }

    infoRef.current = {
      key,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPositions,
      hasCaptured: false,
      draggable,
    };

    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const info = infoRef.current;
      if (!info || e.pointerId !== info.pointerId) return;

      const dx = e.clientX - info.startClientX;
      const dy = e.clientY - info.startClientY;

      // Dragging only makes sense while collapsed. A tap on the expanded chip
      // collapses it on pointer-up, so don't treat small movement as a drag.
      if (!info.draggable) return;
      if (!info.hasCaptured && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

      if (!info.hasCaptured) {
        info.hasCaptured = true;
        // Freeze members so they move as a rigid group and don't drift apart.
        for (const [id] of info.startPositions) {
          const body = bodiesRef.current.get(id);
          if (body && !body.isStatic) {
            Matter.Body.setStatic(body, true);
          }
        }
      }

      const worldDx = dx / zoomRef.current;
      const worldDy = dy / zoomRef.current;

      for (const [id, start] of info.startPositions) {
        const body = bodiesRef.current.get(id);
        if (body) Matter.Body.setPosition(body, { x: start.x + worldDx, y: start.y + worldDy });
      }
    };

    const onUp = (e: PointerEvent) => {
      const info = infoRef.current;
      if (!info || e.pointerId !== info.pointerId) return;
      infoRef.current = null;

      // Plain tap is handled by the layer's onClick (so the C key and the chip
      // click stay in sync). Here we only act when a real drag happened.
      if (!info.hasCaptured) {
        return;
      }

      // Drag end → unfreeze (respecting individual pins) and persist final positions.
      const updates: { id: string; x: number; y: number }[] = [];
      for (const [id, start] of info.startPositions) {
        const body = bodiesRef.current.get(id);
        if (!body) continue;
        const dx = (e.clientX - info.startClientX) / zoomRef.current;
        const dy = (e.clientY - info.startClientY) / zoomRef.current;
        const finalX = start.x + dx;
        const finalY = start.y + dy;
        Matter.Body.setPosition(body, { x: finalX, y: finalY });

        const node = useGraviStore.getState().nodes.find((n) => n.id === id);
        if (node?.isPinned) {
          Matter.Body.setStatic(body, true);
        } else {
          Matter.Body.setStatic(body, false);
        }
        updates.push({ id, x: finalX, y: finalY });
      }
      useGraviStore.getState().updateNodesPositions(updates);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [bodiesRef]);

  return { onStarPointerDown };
}
