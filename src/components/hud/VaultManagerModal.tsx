'use client';

import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeMeta, Connection } from '../../types/node.types';
import { getGraphStats } from '../../utils/wikilinks';
import { 
  exportVaultToMarkdownFiles, 
  parseObsidianMarkdown, 
  clearLocalVault,
  saveLocalVault
} from '../../utils/localVault';
import { INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS } from '../canvas/DemoNodes';
import { 
  Trash2, 
  X, 
  FolderLock, 
  Layers, 
  Radio, 
  FileDown, 
  FileUp, 
  RefreshCw, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface VaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeMeta[];
  connections: Connection[];
  onLoadState: (nodes: NodeMeta[], connections: Connection[]) => void;
  onSelectNode: (id: string) => void;
  onCenterCamera: (worldX: number, worldY: number) => void;
}

export function VaultManagerModal({
  isOpen,
  onClose,
  nodes,
  connections,
  onLoadState,
  onSelectNode,
  onCenterCamera,
}: VaultManagerModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    return getGraphStats(nodes, connections);
  }, [nodes, connections]);

  // Handle importing multiple .md files
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const importedNodes: NodeMeta[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const text = await file.text();
        const parsed = parseObsidianMarkdown(file.name, text);
        const id = `node-${Math.random().toString(36).slice(2, 11)}`;
        importedNodes.push({
          ...parsed,
          id,
          createdAt: Date.now(),
        });
      }
    }

    if (importedNodes.length > 0) {
      const mergedNodes = [...nodes, ...importedNodes];
      onLoadState(mergedNodes, connections);
      saveLocalVault(mergedNodes, connections);
    }

    e.target.value = '';
  };

  const handleResetDemo = () => {
    if (confirm('¿Restaurar el ecosistema completo de NothingSense? Se recargarán los proyectos y sus conexiones.')) {
      onLoadState(INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS);
      saveLocalVault(INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS);
      onClose();
    }
  };

  const handleClearAll = () => {
    if (confirm('¿Vaciar completamente la bóveda? Esta acción borrará todas las notas del lienzo.')) {
      onLoadState([], []);
      clearLocalVault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-[#090D17]/98 border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] overflow-hidden glass-card"
        >
          {/* Fixed Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#060911]/90 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold tracking-tight text-white font-sans">
                    Bóveda Local & Obsidian Sync
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Aislado de Git
                  </span>
                </div>
                <p className="text-xs text-white/50 font-sans mt-0.5">
                  Persistencia 100% privada en tu navegador y sincronización compatible con Obsidian
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content with Strict Flex Bounds */}
          <div className="p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 space-y-6 custom-scrollbar">
            {/* Git Privacy Banner */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-emerald-300">
                  Privacidad Garantizada & Protección Local
                </div>
                <p className="text-white/70 leading-relaxed">
                  Tus notas se guardan en el almacenamiento local de tu navegador y están totalmente excluidas por el archivo <code className="text-emerald-300 font-mono text-[11px] bg-black/50 px-1.5 py-0.5 rounded border border-emerald-500/30">.gitignore</code>. Ninguna nota privada se enviará a repositorios remotos de Git.
                </p>
              </div>
            </div>

            {/* Metrics Section */}
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Métricas del Grafo de Pensamiento
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Notes */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 border-t-2 border-t-cyan-500/70 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-bold text-cyan-400 tracking-tight">
                    {stats.totalNotes}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-white/40 uppercase mt-1">
                    Notas Totales
                  </span>
                </div>

                {/* Connections */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 border-t-2 border-t-purple-500/70 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-bold text-purple-400 tracking-tight">
                    {stats.totalConnections}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-white/40 uppercase mt-1">
                    Conexiones
                  </span>
                </div>

                {/* Orphaned Notes */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 border-t-2 border-t-amber-500/70 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-bold text-amber-400 tracking-tight">
                    {stats.orphanedNodes.length}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-white/40 uppercase mt-1">
                    Ideas Huérfanas
                  </span>
                </div>

                {/* Hubs */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 border-t-2 border-t-emerald-500/70 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-bold text-emerald-400 tracking-tight">
                    {stats.hubs.length}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-white/40 uppercase mt-1">
                    Nodos Centrales
                  </span>
                </div>
              </div>
            </div>

            {/* Orphan Nodes (If any) */}
            {stats.orphanedNodes.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Radio className="w-4 h-4 text-amber-400" />
                    Ideas sin conectar ({stats.orphanedNodes.length})
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">
                    Haz clic para centrar en el lienzo
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto custom-scrollbar pt-1">
                  {stats.orphanedNodes.map((orphan) => (
                    <button
                      key={orphan.id}
                      onClick={() => {
                        onSelectNode(orphan.id);
                        onCenterCamera(orphan.initialX, orphan.initialY);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-amber-500/20 text-white/90 hover:text-amber-200 text-xs font-mono border border-amber-500/30 transition-all flex items-center gap-1.5 group shadow-sm"
                    >
                      <span>{orphan.title || 'Sin Título'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Operations Grid */}
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 font-semibold mb-3">
                Operaciones de Bóveda
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Export Markdown */}
                <button
                  onClick={() => exportVaultToMarkdownFiles(nodes)}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-cyan-500/[0.06] border border-white/10 hover:border-cyan-500/30 text-left transition-all flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-105 transition-transform">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors">
                      Exportar Bóveda (.md)
                    </div>
                    <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                      Descarga todas las notas en archivos Markdown compatibles con Obsidian.
                    </div>
                  </div>
                </button>

                {/* Import Markdown */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-purple-500/[0.06] border border-white/10 hover:border-purple-500/30 text-left transition-all flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-105 transition-transform">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-purple-200 transition-colors">
                      Importar Archivos .md
                    </div>
                    <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                      Carga archivos Markdown de tu ordenador directamente al lienzo.
                    </div>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".md,.txt"
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                {/* Reset Demo */}
                <button
                  onClick={handleResetDemo}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-amber-500/[0.06] border border-white/10 hover:border-amber-500/30 text-left transition-all flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-105 transition-transform">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-amber-200 transition-colors">
                      Restaurar NothingSense Hub
                    </div>
                    <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                      Recarga el mapa completo del ecosistema con sus conexiones físicas.
                    </div>
                  </div>
                </button>

                {/* Clear All */}
                <button
                  onClick={handleClearAll}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-rose-500/[0.08] border border-white/10 hover:border-rose-500/30 text-left transition-all flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-400 group-hover:scale-105 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-rose-200 transition-colors">
                      Vaciar Bóveda
                    </div>
                    <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                      Limpia todas las notas y conexiones del almacenamiento local.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Clean Flex Layout */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-[#060911]/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] text-white/60">
                ESC
              </kbd>
              <span>para cerrar</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-sans text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Listo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
