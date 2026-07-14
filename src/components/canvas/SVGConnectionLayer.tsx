'use client';

import React, { useState } from 'react';
import { useGraviStore } from '../../store/useGraviStore';
import { Connection } from '../../types/node.types';
import { ConnectionDrawState } from '../../hooks/useConnectionDraw';
import type { ConnectionPathRefs } from '../../hooks/usePhysicsSync';

interface SVGConnectionLayerProps {
  connections: Connection[];
  drawingState: ConnectionDrawState | null;
  onCycleConnection: (id: string) => void;
  onRemoveConnection: (id: string) => void;
  svgRefs: React.MutableRefObject<Map<string, ConnectionPathRefs>>;
  labelRefs: React.MutableRefObject<Map<string, SVGGElement>>;
}

export function SVGConnectionLayer({
  connections,
  drawingState,
  onCycleConnection,
  onRemoveConnection,
  svgRefs,
  labelRefs,
}: SVGConnectionLayerProps) {
  const updateConnection = useGraviStore((s) => s.updateConnection);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Register/unregister path elements so the RAF sync loop reads cached refs
  // instead of calling document.getElementById on every frame.
  const registerRef = (id: string, key: keyof ConnectionPathRefs) => (el: SVGPathElement | null) => {
    const entry = svgRefs.current.get(id) ?? { path: null, thick: null };
    entry[key] = el;
    if (!entry.path && !entry.thick) {
      svgRefs.current.delete(id);
    } else {
      svgRefs.current.set(id, entry);
    }
  };

  const registerLabel = (id: string) => (el: SVGGElement | null) => {
    if (el) labelRefs.current.set(id, el);
    else labelRefs.current.delete(id);
  };

  // Style mappings based on connection type
  const getStyleProps = (type: Connection['type']) => {
    switch (type) {
      case 'apoyo':
        return {
          stroke: '#059669', // Verde Esmeralda mate
          strokeWidth: 3,
          strokeDasharray: undefined,
        };
      case 'conflicto':
        return {
          stroke: '#DC2626', // Terracota
          strokeWidth: 2,
          strokeDasharray: '6,4',
        };
      case 'neutra':
      default:
        return {
          stroke: '#64748B', // Gris Acero sólido
          strokeWidth: 2,
          strokeDasharray: undefined,
        };
    }
  };

  const startEdit = (conn: Connection) => {
    setDraft(conn.label ?? '');
    setEditingId(conn.id);
  };

  const commitEdit = () => {
    if (editingId) {
      updateConnection(editingId, { label: draft.trim() || undefined });
    }
    setEditingId(null);
  };

  return (
    <svg
      width={6000}
      height={6000}
      className="absolute pointer-events-none overflow-visible"
      style={{ zIndex: 5, left: 0, top: 0 }}
    >
      {/* 1. Saved connections */}
      {connections.map((conn) => {
        const visual = getStyleProps(conn.type);

        return (
          <g key={conn.id}>
            {/* Click helper path: thicker, transparent, captures stroke mouse pointer events */}
            <path
              ref={registerRef(conn.id, 'thick')}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="cursor-pointer hover:stroke-white/5 transition-colors"
              style={{ pointerEvents: 'stroke' }}
              onClick={(e) => {
                e.stopPropagation();
                onCycleConnection(conn.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveConnection(conn.id);
              }}
            />
            {/* Visual visible path */}
            <path
              ref={registerRef(conn.id, 'path')}
              fill="none"
              stroke={visual.stroke}
              strokeWidth={visual.strokeWidth}
              strokeDasharray={visual.strokeDasharray}
            />

            {/* Editable relationship label, positioned at the path midpoint by the RAF loop */}
            <g ref={registerLabel(conn.id)} style={{ pointerEvents: 'auto', cursor: 'text' }}>
              {editingId === conn.id ? (
                <foreignObject x={-70} y={-12} width={140} height={24}>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    placeholder="etiqueta…"
                    className="w-[136px] rounded bg-[#0D0F17]/95 border border-[#00E5FF]/40 px-1.5 py-0.5 text-[10px] font-mono text-white outline-none text-center"
                  />
                </foreignObject>
              ) : (
                <g
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(conn);
                  }}
                >
                  {conn.label ? (
                    <g transform="translate(-100, 0)">
                      <rect width={200} height={18} rx={9} fill="#0D0F17" opacity={0.82} />
                      <text
                        x={100}
                        y={13}
                        textAnchor="middle"
                        fontSize={10}
                        fontFamily="var(--font-jetbrains), monospace"
                        fill="#CBD5E1"
                        style={{ userSelect: 'none' }}
                      >
                        {conn.label}
                      </text>
                    </g>
                  ) : (
                    <circle r={3} fill={visual.stroke} opacity={0.5}>
                      <title>Doble clic para etiquetar la relación</title>
                    </circle>
                  )}
                </g>
              )}
            </g>
          </g>
        );
      })}

      {/* 2. Drawing preview line */}
      {drawingState && (
        <path
          d={`M ${drawingState.sourceX},${drawingState.sourceY} L ${drawingState.currentX},${drawingState.currentY}`}
          fill="none"
          stroke="#00E5FF" // Cian preview
          strokeWidth={1.5}
          strokeDasharray="4,4"
        />
      )}
    </svg>
  );
}
