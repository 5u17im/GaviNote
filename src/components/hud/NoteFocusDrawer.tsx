'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeMeta, NodeCategory } from '../../types/node.types';
import { CATEGORY_INFO } from '../nodes/registry';
import { MarkdownContent } from '../nodes/MarkdownContent';
import { calculateBacklinks, extractWikilinks } from '../../utils/wikilinks';
import { downloadNoteAsMarkdown } from '../../utils/localVault';
import { 
  X, 
  Sparkles, 
  Pin, 
  Crosshair, 
  Download, 
  Trash2, 
  Link as LinkIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Eye, 
  Edit3, 
  Columns, 
  Tag as TagIcon,
  CheckSquare,
  FileText
} from 'lucide-react';

interface NoteFocusDrawerProps {
  nodeId: string | null;
  nodes: NodeMeta[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (id: string, patch: Partial<NodeMeta>) => void;
  onDeleteNode: (id: string) => void;
  onSelectNode: (id: string) => void;
  onCreateLinkedNode: (fromNodeId: string, targetTitle: string) => void;
  onCenterCamera: (worldX: number, worldY: number) => void;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function NoteFocusDrawer({
  nodeId,
  nodes,
  isOpen,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onSelectNode,
  onCreateLinkedNode,
  onCenterCamera,
}: NoteFocusDrawerProps) {
  const currentNode = useMemo(() => {
    return nodes.find((n) => n.id === nodeId);
  }, [nodes, nodeId]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState<NodeCategory>('idea');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showTagInput, setShowTagInput] = useState(false);
  const [wikilinkQuery, setWikilinkQuery] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync state when active node changes
  useEffect(() => {
    if (currentNode) {
      setTitle(currentNode.title);
      setContent(currentNode.content);
      setTagsInput(currentNode.tags.join(' '));
      setCategory(currentNode.category);
    }
  }, [currentNode]);

  // Compute backlinks and outgoing links
  const { incoming, outgoing } = useMemo(() => {
    if (!currentNode) return { incoming: [], outgoing: [] };
    return calculateBacklinks(nodes, currentNode.id);
  }, [nodes, currentNode]);

  const info = CATEGORY_INFO[category] || CATEGORY_INFO.idea;

  // Auto-save on edits
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (currentNode) {
      onUpdateNode(currentNode.id, { title: newTitle, updatedAt: Date.now() });
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (currentNode) {
      onUpdateNode(currentNode.id, { content: newContent, updatedAt: Date.now() });
    }

    // Check for [[ autocomplete trigger
    const cursor = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newContent.slice(0, cursor);
    const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');
    if (lastOpenBrackets !== -1 && !textBeforeCursor.slice(lastOpenBrackets).includes(']]')) {
      const query = textBeforeCursor.slice(lastOpenBrackets + 2);
      setWikilinkQuery(query);
    } else {
      setWikilinkQuery(null);
    }
  };

  const handleCategoryChange = (newCategory: NodeCategory) => {
    setCategory(newCategory);
    if (currentNode) {
      onUpdateNode(currentNode.id, { category: newCategory, updatedAt: Date.now() });
    }
  };

  const handleTagsBlur = () => {
    const parsedTags = Array.from(
      new Set(
        tagsInput
          .split(/\s+/)
          .map((t) => t.replace(/^#/, '').trim())
          .filter(Boolean)
      )
    );
    if (currentNode) {
      onUpdateNode(currentNode.id, { tags: parsedTags, updatedAt: Date.now() });
    }
    setShowTagInput(false);
  };

  // Insert markdown snippet at cursor
  const insertSnippet = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    
    handleContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // Toggle task item from preview
  const handleToggleTask = (taskText: string, completed: boolean) => {
    if (!currentNode) return;
    const currentLines = content.split('\n');
    const updatedLines = currentLines.map((line) => {
      if (line.includes(taskText)) {
        return completed
          ? line.replace(/-\s*\[\s*\]/, '- [x]').replace(/-\s*\[ \]/, '- [x]')
          : line.replace(/-\s*\[[xX]\]/, '- [ ]');
      }
      return line;
    });
    const newContent = updatedLines.join('\n');
    handleContentChange(newContent);
  };

  // Jump to Wikilink target
  const handleWikilinkClick = (targetTitle: string) => {
    const target = nodes.find(
      (n) => n.title.trim().toLowerCase() === targetTitle.trim().toLowerCase()
    );
    if (target) {
      onSelectNode(target.id);
      onCenterCamera(target.initialX, target.initialY);
    } else if (currentNode) {
      // Create new note on click
      onCreateLinkedNode(currentNode.id, targetTitle);
    }
  };

  // Autocomplete matching nodes
  const matchingSuggestions = useMemo(() => {
    if (wikilinkQuery === null) return [];
    const q = wikilinkQuery.toLowerCase();
    return nodes
      .filter((n) => n.id !== currentNode?.id && n.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [nodes, currentNode, wikilinkQuery]);

  const selectSuggestion = (targetTitle: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = content.slice(0, cursor);
    const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');
    if (lastOpenBrackets !== -1) {
      const newContent =
        content.slice(0, lastOpenBrackets + 2) +
        targetTitle +
        ']] ' +
        content.slice(cursor);
      handleContentChange(newContent);
      setWikilinkQuery(null);
    }
  };

  if (!isOpen || !currentNode) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed top-0 right-0 h-full w-[540px] max-w-[92vw] z-50 bg-[#0D0F17]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto"
        aria-label="Panel de edición de nota y Second Brain"
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 bg-[#0B0F19]/60">
          <div className="flex items-center gap-2">
            {/* Category Selector */}
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as NodeCategory)}
              className="bg-black/40 text-[11px] font-mono font-medium uppercase tracking-wider px-2 py-1 rounded border border-white/10 focus:outline-none cursor-pointer"
              style={{ color: info.color }}
            >
              {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
                <option key={key} value={key} className="bg-[#0D0F17] text-white">
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            {/* Pin Toggle */}
            <button
              onClick={() =>
                onUpdateNode(currentNode.id, {
                  isPinned: !currentNode.isPinned,
                  updatedAt: Date.now(),
                })
              }
              className={`p-1.5 rounded text-xs transition-colors ${
                currentNode.isPinned
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              title={currentNode.isPinned ? 'Desfijar del lienzo' : 'Fijar posición en el lienzo'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Center camera on node */}
            <button
              onClick={() => onCenterCamera(currentNode.initialX, currentNode.initialY)}
              className="p-1.5 rounded text-white/40 hover:text-cyan-400 hover:bg-white/5 transition-colors text-xs"
              title="Centrar vista en este nodo"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Modes & Close */}
          <div className="flex items-center gap-2">
            <div className="flex bg-black/40 p-0.5 rounded border border-white/10">
              <button
                onClick={() => setViewMode('edit')}
                className={`p-1 rounded text-xs transition-all ${
                  viewMode === 'edit' ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/80'
                }`}
                title="Solo Editor"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1 rounded text-xs transition-all ${
                  viewMode === 'split' ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/80'
                }`}
                title="Editor y Vista Previa (Split)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1 rounded text-xs transition-all ${
                  viewMode === 'preview' ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/80'
                }`}
                title="Solo Vista Previa"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Title Input */}
        <div className="px-5 pt-4 pb-2">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título de la nota..."
            className="w-full bg-transparent font-serif text-xl font-bold text-white placeholder:text-white/30 border-none focus:outline-none tracking-tight"
          />

          {/* Tags bar */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {currentNode.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-medium border"
                style={{
                  color: info.color,
                  backgroundColor: `${info.color}12`,
                  borderColor: `${info.color}30`,
                }}
              >
                #{tag}
              </span>
            ))}
            {showTagInput ? (
              <input
                type="text"
                autoFocus
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleTagsBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleTagsBlur()}
                placeholder="tag1 tag2..."
                className="bg-black/60 text-[10px] font-mono text-white px-2 py-0.5 rounded border border-white/20 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] text-white/40 hover:text-white hover:bg-white/5 transition-colors border border-dashed border-white/20"
              >
                <TagIcon className="w-2.5 h-2.5" /> + etiquetas
              </button>
            )}
          </div>
        </div>

        {/* Markdown Toolbar (when editor visible) */}
        {viewMode !== 'preview' && (
          <div className="px-5 py-1.5 border-y border-white/5 bg-[#0B0F19]/40 flex items-center gap-1 flex-wrap text-xs text-white/60">
            <button
              onClick={() => insertSnippet('**', '**')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white font-bold"
              title="Negrita (**texto**)"
            >
              B
            </button>
            <button
              onClick={() => insertSnippet('*', '*')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white italic font-serif"
              title="Cursiva (*texto*)"
            >
              I
            </button>
            <button
              onClick={() => insertSnippet('[[', ']]')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-cyan-400 font-mono text-[11px] font-semibold"
              title="Wikilink / Enlace bidireccional ([[Nota]])"
            >
              [[ en ]]
            </button>
            <button
              onClick={() => insertSnippet('- [ ] ')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-emerald-400 font-mono text-[11px]"
              title="Tarea (- [ ])"
            >
              ☑ Tarea
            </button>
            <button
              onClick={() => insertSnippet('> ')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white font-mono text-[11px]"
              title="Cita (> cita)"
            >
              &ldquo; Cita
            </button>
            <button
              onClick={() => insertSnippet('```\n', '\n```')}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-emerald-300 font-mono text-[11px]"
              title="Bloque de código (```)"
            >
              &lt;/&gt;
            </button>
          </div>
        )}

        {/* Content Body Area */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Editor Column */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`p-4 flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Escribe tus pensamientos en Markdown...&#10;&#10;Usa [[Nombre de Nota]] para conectar ideas al instante.&#10;Usa - [ ] para crear tareas interactivas."
                className="w-full flex-1 bg-transparent font-sans text-xs text-white/90 leading-relaxed placeholder:text-white/30 border-none focus:outline-none resize-none"
              />

              {/* [[ Wikilink Autocomplete Dropdown */}
              {wikilinkQuery !== null && matchingSuggestions.length > 0 && (
                <div className="absolute bottom-4 left-4 z-50 bg-[#0B0F19] border border-cyan-500/40 rounded-md shadow-2xl p-1.5 max-w-[280px]">
                  <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider px-2 py-1 font-semibold">
                    Conectar con:
                  </div>
                  {matchingSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSuggestion(s.title)}
                      className="w-full text-left px-2 py-1 rounded text-xs text-white/90 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{s.title}</span>
                      <span className="text-[9px] font-mono opacity-50">[[{CATEGORY_INFO[s.category].label}]]</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Column */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`p-4 overflow-y-auto ${viewMode === 'split' ? 'w-1/2 bg-black/20' : 'w-full'}`}>
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-2">
                Vista Previa Markdown
              </div>
              <MarkdownContent
                content={content}
                compact={false}
                accentColor={info.color}
                onWikilinkClick={handleWikilinkClick}
                onToggleTask={handleToggleTask}
              />
            </div>
          )}
        </div>

        {/* Backlinks & Connections Drawer Section */}
        <div className="border-t border-white/10 bg-[#0B0F19]/80 p-4 max-h-[220px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono text-[10px] tracking-wider uppercase font-semibold text-white/60 flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3 text-cyan-400" />
              Red de Conocimiento (Backlinks)
            </h4>
            <span className="text-[9px] font-mono text-white/40">
              {incoming.length} entrante(s) · {outgoing.length} saliente(s)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {/* Incoming Links (Backlinks) */}
            <div className="space-y-1">
              <div className="text-[9px] font-mono text-emerald-400/80 flex items-center gap-1 mb-1">
                <ArrowDownLeft className="w-2.5 h-2.5" /> Mencionada en ({incoming.length}):
              </div>
              {incoming.length === 0 ? (
                <div className="text-[10px] text-white/30 italic">Sin menciones entrantes</div>
              ) : (
                incoming.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => {
                      onSelectNode(inc.id);
                      onCenterCamera(inc.initialX, inc.initialY);
                    }}
                    className="w-full text-left p-1.5 rounded bg-white/[0.03] hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-between group"
                  >
                    <span className="text-xs text-white/90 group-hover:text-emerald-300 truncate">
                      {inc.title || 'Sin Título'}
                    </span>
                    <span className="text-[9px] font-mono text-white/30">
                      {CATEGORY_INFO[inc.category].label}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Outgoing Links */}
            <div className="space-y-1">
              <div className="text-[9px] font-mono text-cyan-400/80 flex items-center gap-1 mb-1">
                <ArrowUpRight className="w-2.5 h-2.5" /> Enlaces salientes ({outgoing.length}):
              </div>
              {outgoing.length === 0 ? (
                <div className="text-[10px] text-white/30 italic">Sin enlaces salientes</div>
              ) : (
                outgoing.map((out, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between gap-1"
                  >
                    <span className="text-xs text-white/90 truncate">
                      [[{out.targetTitle}]]
                    </span>
                    {out.exists && out.targetNode ? (
                      <button
                        onClick={() => {
                          onSelectNode(out.targetNode!.id);
                          onCenterCamera(out.targetNode!.initialX, out.targetNode!.initialY);
                        }}
                        className="text-[9px] font-mono text-cyan-400 hover:underline px-1 py-0.5 rounded bg-cyan-500/10"
                        title="Ver nota"
                      >
                        Abrir
                      </button>
                    ) : (
                      <button
                        onClick={() => onCreateLinkedNode(currentNode.id, out.targetTitle)}
                        className="text-[9px] font-mono text-amber-400 hover:text-amber-200 px-1 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-0.5"
                        title="Crear esta nota en el lienzo"
                      >
                        <Plus className="w-2.5 h-2.5" /> Crear
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/5 bg-[#090C14] flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>{wordCount} palabras</span>
            <span>{content.length} caracteres</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadNoteAsMarkdown(currentNode)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 transition-colors text-[11px] font-mono"
              title="Descargar como archivo Markdown (.md)"
            >
              <Download className="w-3 h-3" /> Exportar .md
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar la nota "${currentNode.title}"?`)) {
                  onDeleteNode(currentNode.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors text-[11px] font-mono"
              title="Eliminar nota"
            >
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
