'use client';

import React from 'react';
import { NodeMeta, NodeCategory } from '../../types/node.types';
import { NodeCard } from '../nodes/NodeCard';

interface NodeOverlayProps {
  nodes: NodeMeta[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, title: string, content: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  onChangeCategory: (id: string, category: NodeCategory) => void;
  onDragStart: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  onDragMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
  domRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

export function NodeOverlay({
  nodes,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onChangeCategory,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  domRefs,
}: NodeOverlayProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
      {nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          isSelected={selectedId === node.id}
          onSelect={() => onSelect(node.id)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onChangeCategory={onChangeCategory}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onContextMenu={(x, y) => onContextMenu(node.id, x, y)}
          domRef={(el) => {
            if (el) {
              domRefs.current.set(node.id, el);
            } else {
              domRefs.current.delete(node.id);
            }
          }}
        />
      ))}
    </div>
  );
}
