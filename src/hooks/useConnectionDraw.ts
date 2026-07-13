import React, { useState, useRef } from 'react';
import { NodeMeta } from '../types/node.types';

interface UseConnectionDrawProps {
  nodes: NodeMeta[];
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  addConnection: (sourceId: string, targetId: string) => string | null;
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

export interface ConnectionDrawState {
  sourceId: string;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
}

export function useConnectionDraw({
  nodes,
  domRefs,
  addConnection,
  screenToWorld,
}: UseConnectionDrawProps) {
  const [drawingState, setDrawingState] = useState<ConnectionDrawState | null>(null);
  const dragInfo = useRef<{ pointerId: number; sourceId: string; captureEl: HTMLElement } | null>(null);

  const startConnection = (e: React.PointerEvent<Element>, sourceId: string, sourceBodyPos: { x: number; y: number }) => {
    // Only trigger if Shift is pressed
    if (!e.shiftKey) return false;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    // Initial position in world coords is source node's center (already in world coordinates from body position)
    setDrawingState({
      sourceId,
      sourceX: sourceBodyPos.x,
      sourceY: sourceBodyPos.y,
      currentX: sourceBodyPos.x,
      currentY: sourceBodyPos.y,
    });

    dragInfo.current = {
      pointerId: e.pointerId,
      sourceId,
      captureEl: target as HTMLElement,
    };

    e.stopPropagation();
    return true;
  };

  const moveConnection = (e: React.PointerEvent<Element>) => {
    if (!dragInfo.current) return;

    // Convert current mouse pointer to world coordinates
    const { x, y } = screenToWorld(e.clientX, e.clientY);

    setDrawingState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentX: x,
        currentY: y,
      };
    });
  };

  const endConnection = (e: React.PointerEvent<Element>) => {
    const info = dragInfo.current;
    if (!info) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Find if released over another nodeCard DOM element
    let targetNodeId: string | null = null;

    for (const node of nodes) {
      if (node.id === info.sourceId) continue;
      const el = domRefs.current.get(node.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          targetNodeId = node.id;
          break;
        }
      }
    }

    if (targetNodeId) {
      addConnection(info.sourceId, targetNodeId);
    }

    if (info.captureEl) {
      try {
        info.captureEl.releasePointerCapture(info.pointerId);
      } catch {
        // Ignore capture release errors
      }
    }

    dragInfo.current = null;
    setDrawingState(null);
  };

  return {
    startConnection,
    moveConnection,
    endConnection,
    drawingState,
    isDrawing: !!drawingState,
  };
}
