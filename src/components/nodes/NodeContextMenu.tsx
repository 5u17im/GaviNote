'use client';

import React, { useEffect, useRef } from 'react';
import { NodeCategory } from '../../types/node.types';
import { CATEGORY_INFO } from './registry';
import { Edit2, Trash2, Tag } from 'lucide-react';

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
      className="fixed z-50 min-w-[190px] rounded-md border border-[#222733] bg-[#0D0F17]/95 py-2 shadow-2xl shadow-black/80 backdrop-blur-md font-mono text-[11px] text-neutral-300 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title / Telemetry status */}
      <div className="px-4 py-1 pb-1.5 text-neutral-500 text-[8px] uppercase tracking-widest border-b border-[#222733] mb-1.5 flex items-center justify-between">
        <span>Opciones de Nota</span>
        <span className="flex h-1.5 w-1.5 rounded-none bg-neutral-600" />
      </div>

      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-[#161A26] hover:text-white flex items-center gap-2.5 transition-all duration-150 cursor-pointer group"
      >
        <Edit2 size={12} className="text-neutral-500 group-hover:text-neutral-300 transition-colors" />
        <span>Editar Contenido</span>
      </button>

      <div className="h-px bg-[#222733] my-1" />

      {/* Categories submenu header */}
      <div className="px-4 py-1 text-neutral-500 text-[8px] uppercase tracking-widest flex items-center gap-1.5 mt-1">
        <Tag size={9} />
        <span>Asignar Categoría</span>
      </div>
      
      <div className="flex flex-col gap-0.5 mt-1">
        {(Object.keys(CATEGORY_INFO) as NodeCategory[]).map((cat) => {
          const info = CATEGORY_INFO[cat];
          return (
            <button
              key={cat}
              onClick={() => {
                onChangeCategory(cat);
                onClose();
              }}
              className="w-full text-left px-4 py-1.5 hover:bg-[#161A26] hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] opacity-75 group-hover:opacity-100 transition-opacity">{info.icon}</span>
                <span className="font-sans text-neutral-300 group-hover:text-white transition-colors">{info.label}</span>
              </div>
              <span 
                className="w-2 h-2 rounded-sm transition-transform"
                style={{ backgroundColor: info.color }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-px bg-[#222733] my-1.5" />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-neutral-300 hover:bg-red-955/45 hover:bg-red-950/40 hover:text-red-400 flex items-center gap-2.5 transition-colors font-semibold cursor-pointer group"
      >
        <Trash2 size={12} className="text-neutral-500 group-hover:text-red-400 transition-colors" />
        <span>Eliminar Nota</span>
      </button>
    </div>
  );
}
