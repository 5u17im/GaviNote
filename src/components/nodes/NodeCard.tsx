'use client';

import React, { useState } from 'react';
import { NodeMeta, NodeCategory } from '../../types/node.types';
import { CATEGORY_INFO } from './registry';
import { NodeEditor } from './NodeEditor';
import { NodeContextMenu } from './NodeContextMenu';

interface NodeCardProps {
  node: NodeMeta;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, title: string, content: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  onChangeCategory: (id: string, category: NodeCategory) => void;
  onDragStart: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  onDragMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
  domRef: (el: HTMLDivElement | null) => void;
}

export function NodeCard({
  node,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onChangeCategory,
  onDragStart,
  onDragMove,
  onDragEnd,
  domRef,
}: NodeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const info = CATEGORY_INFO[node.category] || CATEGORY_INFO.idea;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = (title: string, content: string, tags: string[]) => {
    onUpdate(node.id, title, content, tags);
    setIsEditing(false);
  };

  // Dimensions must match CATEGORY_PHYSICS width/height exactly
  const cardStyle: React.CSSProperties = {
    width: `${node.width}px`,
    height: `${node.height}px`,
    position: 'absolute',
    left: 0,
    top: 0,
    willChange: 'transform',
    border: `1px solid ${isSelected ? info.color : 'rgba(255, 255, 255, 0.08)'}`,
    boxShadow: isSelected 
      ? `0 0 20px ${info.glowColor}` 
      : '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    cursor: isEditing ? 'default' : 'grab',
  };

  return (
    <>
      <div
        ref={domRef}
        style={cardStyle}
        onPointerDown={(e) => {
          if (!isEditing) {
            onSelect();
            onDragStart(e, node.id);
          }
        }}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        className="glass-card flex flex-col p-4 rounded-xl select-none select-none z-10 hover:border-white/20 transition-colors"
      >
        {isEditing ? (
          <NodeEditor
            node={node}
            color={info.color}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex flex-col h-full justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{info.icon}</span>
                <span 
                  className="font-mono text-[9px] tracking-wider uppercase font-semibold"
                  style={{ color: info.color }}
                >
                  {info.label}
                </span>
              </div>
              <span className="text-[9px] text-white/30 font-mono">
                {new Date(node.createdAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-serif text-sm font-semibold text-white/95 mt-1.5 truncate">
              {node.title || 'Sin Título'}
            </h3>

            {/* Content preview */}
            <p className="font-sans text-xs text-white/70 line-clamp-2 mt-1 grow overflow-hidden leading-relaxed">
              {node.content || 'Sin contenido. Haz doble clic para editar.'}
            </p>

            {/* Tags footer */}
            {node.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap max-h-[20px] overflow-hidden">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: info.color,
                      backgroundColor: `${info.color}15`,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => onDelete(node.id)}
          onChangeCategory={(cat) => onChangeCategory(node.id, cat)}
        />
      )}
    </>
  );
}
