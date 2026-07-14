'use client';

import React, { useState } from 'react';
import { NodeMeta } from '../../types/node.types';
import { sanitizeTitle, sanitizeText, sanitizeTag } from '../../utils/sanitize';

interface NodeEditorProps {
  node: NodeMeta;
  onSave: (title: string, content: string, tags: string[]) => void;
  onCancel: () => void;
  color: string;
}

export function NodeEditor({ node, onSave, onCancel, color }: NodeEditorProps) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [tagsInput, setTagsInput] = useState(node.tags.map(t => `#${t}`).join(' '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse tags: remove #, split by space, sanitize, filter empty, dedupe
    const tags = Array.from(
      new Set(
        tagsInput
          .split(/\s+/)
          .map((tag) => sanitizeTag(tag))
          .filter((tag) => tag.length > 0)
      )
    );

    onSave(sanitizeTitle(title.trim()), sanitizeText(content.trim()), tags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl + Enter
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e);
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-2 w-full h-full select-text cursor-default pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()} // Prevent dragging while typing
    >
      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la nota..."
        maxLength={120}
        autoFocus
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-semibold font-sans text-white focus:outline-none focus:border-white/20"
        style={{ borderColor: `${color}33` }}
      />

      {/* Content textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe tu contenido aquí..."
        maxLength={2000}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-sans text-white/90 resize-none focus:outline-none focus:border-white/20"
        style={{ borderColor: `${color}33` }}
      />

      {/* Tags input */}
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Etiquetas (ej: #diseño #ideas)"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] font-mono text-white/70 focus:outline-none focus:border-white/20"
        style={{ borderColor: `${color}33` }}
      />

      {/* Actions */}
      <div className="flex justify-end gap-1.5 mt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-[10px] font-mono text-white/50 hover:text-white/80 transition-colors"
        >
          [Esc] Cancelar
        </button>
        <button
          type="submit"
          className="px-2.5 py-1 text-[10px] font-semibold font-mono rounded bg-white/10 border border-white/10 hover:bg-white/20 transition-all text-white"
          style={{ borderColor: `${color}55`, color: color }}
        >
          Guardar [Ctrl+Enter]
        </button>
      </div>
    </form>
  );
}
