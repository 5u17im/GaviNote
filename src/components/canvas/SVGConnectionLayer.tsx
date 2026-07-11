'use client';

import React from 'react';
import { Connection } from '../../types/node.types';
import { ConnectionDrawState } from '../../hooks/useConnectionDraw';

interface SVGConnectionLayerProps {
  connections: Connection[];
  drawingState: ConnectionDrawState | null;
  onCycleConnection: (id: string) => void;
}

export function SVGConnectionLayer({
  connections,
  drawingState,
  onCycleConnection,
}: SVGConnectionLayerProps) {
  
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

  return (
    <svg 
      className="absolute inset-0 pointer-events-none overflow-visible" 
      style={{ zIndex: 5, width: '100%', height: '100%' }}
    >
      {/* 1. Saved connections */}
      {connections.map((conn) => {
        const visual = getStyleProps(conn.type);
        
        return (
          <g key={conn.id}>
            {/* Click helper path: thicker, transparent, captures stroke mouse pointer events */}
            <path
              id={`thick-${conn.id}`}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="cursor-pointer hover:stroke-white/5 transition-colors"
              style={{ pointerEvents: 'stroke' }}
              onClick={(e) => {
                e.stopPropagation();
                onCycleConnection(conn.id);
              }}
            />
            {/* Visual visible path */}
            <path
              id={`path-${conn.id}`}
              fill="none"
              stroke={visual.stroke}
              strokeWidth={visual.strokeWidth}
              strokeDasharray={visual.strokeDasharray}
              className="transition-all duration-300"
            />
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
