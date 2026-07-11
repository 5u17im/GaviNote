'use client';

import React, { useEffect, useRef } from 'react';
import { NodeCategory } from '../../types/node.types';
import { CATEGORY_INFO } from './registry';

interface NodeContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeCategory: (category: NodeCategory) => void;
}

export function NodeContextMenu({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onChangeCategory,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-lg border border-white/10 bg-[#0F1322]/95 py-1.5 shadow-2xl backdrop-blur-md font-sans text-xs"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-white/80 hover:bg-white/5 hover:text-white transition-colors"
      >
        ✏️ Editar Nota
      </button>

      <div className="h-px bg-white/5 my-1" />

      {/* Categories submenu */}
      <div className="px-4 py-1 text-white/40 font-mono text-[9px] uppercase tracking-wider">
        Categorizar
      </div>
      
      {(Object.keys(CATEGORY_INFO) as NodeCategory[]).map((cat) => {
        const info = CATEGORY_INFO[cat];
        return (
          <button
            key={cat}
            onClick={() => {
              onChangeCategory(cat);
              onClose();
            }}
            className="w-full text-left px-4 py-1.5 text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
          >
            <span style={{ color: info.color }}>{info.icon}</span>
            <span>{info.label}</span>
          </button>
        );
      })}

      <div className="h-px bg-white/5 my-1" />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors font-semibold"
      >
        🗑️ Eliminar Nota
      </button>
    </div>
  );
}
