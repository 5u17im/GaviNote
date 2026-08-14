'use client';

import React, { useState, useEffect } from 'react';
import { NodeMeta } from '../../types/node.types';
import { CATEGORY_INFO } from './registry';
import { NodeEditor } from './NodeEditor';
import { MarkdownContent } from './MarkdownContent';
import { calculateOptimalDimensions } from '../../utils/dimensions';
import { commandBus } from '../../utils/commandBus';
import { Maximize2 } from 'lucide-react';

interface NodeCardProps {
  node: NodeMeta;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, title: string, content: string, tags: string[], width: number, height: number) => void;
  onDragStart: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  onContextMenu: (x: number, y: number) => void;
  domRef: (el: HTMLDivElement | null) => void;
  onOpenFocus?: (id: string) => void;
  onWikilinkClick?: (targetTitle: string) => void;
}

export function NodeCard({
  node,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onContextMenu,
  domRef,
  onOpenFocus,
  onWikilinkClick,
}: NodeCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const info = CATEGORY_INFO[node.category] || CATEGORY_INFO.idea;

  // Decoupled edit command listener sent from the hoisted screen-space ContextMenu
  useEffect(() => {
    return commandBus.on('editNode', (id) => {
      if (id === node.id) setIsEditing(true);
    });
  }, [node.id]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e.clientX, e.clientY);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenFocus) {
      onOpenFocus(node.id);
    } else {
      setIsEditing(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    // Enter / Space enters edit mode for the focused node
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleSave = (title: string, content: string, tags: string[]) => {
    const { width, height } = calculateOptimalDimensions(title, content, tags);
    onUpdate(node.id, title, content, tags, width, height);
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
    <div
      ref={domRef}
      style={cardStyle}
      tabIndex={isEditing ? -1 : 0}
      role="button"
      aria-label={`Nota ${info.label}: ${node.title || 'Sin título'}. Pulsa Enter para editar, Suprimir para eliminar.`}
      aria-pressed={isSelected}
      onPointerDown={(e) => {
        if (!isEditing) {
          onSelect();
          onDragStart(e, node.id);
        }
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        if (!isEditing) onSelect();
      }}
      onWheel={(e) => {
        if (isEditing) {
          e.stopPropagation();
        }
      }}
      className="glass-card p-[3px] rounded-md select-none z-10 hover:border-white/20 transition-colors pointer-events-auto flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 group/card"
    >
      {isEditing ? (
        <div className="w-full h-full p-3 bg-[#0D0F17]/95 rounded-[3px] border border-white/5 flex flex-col">
          <NodeEditor
            node={node}
            color={info.color}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="w-full h-full py-2.5 px-3 bg-[#0D0F17]/80 rounded-[3px] border border-white/5 flex flex-col justify-between overflow-hidden">
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
              {node.isPinned && (
                <span className="text-[9px] animate-pulse" title="Fijado en el espacio">📌</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onOpenFocus && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFocus(node.id);
                  }}
                  className="opacity-0 group-hover/card:opacity-100 p-0.5 rounded text-white/40 hover:text-cyan-400 hover:bg-white/10 transition-all pointer-events-auto"
                  title="Abrir en Modo Focus (Editor Profundo)"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              )}
              <span className="text-[9px] text-white/30 font-mono">
                {new Date(node.createdAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xs font-semibold text-white/95 mt-1 truncate pr-1">
            {node.title || 'Sin Título'}
          </h3>

          {/* Markdown Content preview */}
          <div className="mt-1 max-h-[36px] overflow-hidden leading-tight">
            <MarkdownContent
              content={node.content}
              compact={true}
              accentColor={info.color}
              onWikilinkClick={onWikilinkClick}
            />
          </div>

          {/* Tags footer */}
          {node.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap max-h-[14px] overflow-hidden">
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[8px] font-mono font-medium px-1 py-0.2 rounded-sm"
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
  );
}

