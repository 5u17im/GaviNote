'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeMeta } from '../../types/node.types';
import { CATEGORY_INFO } from '../nodes/registry';
import { Search, Plus, CornerDownLeft, X } from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeMeta[];
  onSelectNode: (id: string) => void;
  onCreateNote: (title: string) => void;
  onCenterCamera: (worldX: number, worldY: number) => void;
}

export function QuickSwitcher({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onCreateNote,
  onCenterCamera,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter notes
  const filteredNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes.slice(0, 8);

    return nodes.filter((n) => {
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTags;
    });
  }, [nodes, query]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.some((n) => n.title.trim().toLowerCase() === q);
  }, [nodes, query]);

  const showCreateOption = query.trim().length > 0 && !hasExactMatch;

  // Keyboard navigation
  const totalOptions = filteredNodes.length + (showCreateOption ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleConfirm = () => {
    if (showCreateOption && selectedIndex === filteredNodes.length) {
      onCreateNote(query.trim());
      onClose();
      return;
    }

    const selected = filteredNodes[selectedIndex];
    if (selected) {
      onSelectNode(selected.id);
      onCenterCamera(selected.initialX, selected.initialY);
      onClose();
    } else if (query.trim()) {
      onCreateNote(query.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-[#0D0F17]/95 border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col glass-card"
        >
          {/* Search Bar Input */}
          <div className="p-3.5 border-b border-white/10 flex items-center gap-3 bg-[#0B0F19]/80">
            <Search className="w-5 h-5 text-cyan-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar nota, #etiqueta o escribir para crear... (Ctrl+K)"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none font-sans"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-white/30 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/10 text-white/50 rounded border border-white/10">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
            {filteredNodes.map((node, index) => {
              const info = CATEGORY_INFO[node.category] || CATEGORY_INFO.idea;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node.id);
                    onCenterCamera(node.initialX, node.initialY);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-white/10 border border-white/15 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base">{info.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {node.title || 'Sin Título'}
                        </span>
                        <span
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded"
                          style={{
                            color: info.color,
                            backgroundColor: `${info.color}15`,
                          }}
                        >
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate max-w-[380px] mt-0.5">
                        {node.content || 'Sin contenido'}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                      <span>Abrir</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </span>
                  )}
                </div>
              );
            })}

            {/* Create option */}
            {showCreateOption && (
              <div
                onClick={handleConfirm}
                onMouseEnter={() => setSelectedIndex(filteredNodes.length)}
                className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                  selectedIndex === filteredNodes.length
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'bg-white/[0.02] hover:bg-white/5 text-white/70 border border-dashed border-white/15'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>
                    Crear nueva nota: <strong className="text-white">&ldquo;{query.trim()}&rdquo;</strong>
                  </span>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 opacity-60" />
              </div>
            )}

            {filteredNodes.length === 0 && !showCreateOption && (
              <div className="py-8 text-center text-xs text-white/40">
                No se encontraron notas con &ldquo;{query}&rdquo;
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-2.5 border-t border-white/5 bg-[#0B0F19]/90 flex items-center justify-between text-[10px] font-mono text-white/40">
            <div className="flex items-center gap-3">
              <span>↑↓ Navegar</span>
              <span>↵ Seleccionar</span>
            </div>
            <span>🧠 GaviNote Second Brain</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
