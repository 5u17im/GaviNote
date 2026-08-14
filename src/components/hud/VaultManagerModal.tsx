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
  ShieldCheck, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  X, 
  Sparkles, 
  GitBranch, 
  FolderLock, 
  Layers, 
  Link as LinkIcon,
  AlertCircle
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
      alert(`¡Se importaron ${importedNodes.length} notas exitosamente!`);
    }

    e.target.value = '';
  };

  const handleResetDemo = () => {
    if (confirm('¿Restaurar las notas demo iniciales? Se reemplazarán tus notas actuales.')) {
      onLoadState(INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS);
      saveLocalVault(INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS);
      onClose();
    }
  };

  const handleClearAll = () => {
    if (confirm('¿Eliminar todas las notas de la bóveda? Esta acción no se puede deshacer.')) {
      onLoadState([], []);
      clearLocalVault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[#0D0F17]/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col glass-card max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0B0F19]/80">
            <div className="flex items-center gap-2.5">
              <FolderLock className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  Bóveda Local & Second Brain
                </h3>
                <p className="text-[11px] text-white/50 font-sans">
                  Gestión de notas, respaldo local y compatibilidad con Obsidian
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Git Privacy Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-300">
                  Privacidad 100% Local (Aislado de Git)
                </div>
                <p className="text-white/70 mt-1 leading-relaxed">
                  Tus notas personales se guardan en el almacenamiento local de tu navegador y
                  están completamente excluidas en el archivo <code className="text-emerald-300 font-mono text-[11px]">.gitignore</code>.
                  Aunque subas cambios de código a Git, tu información privada <strong>nunca se subirá</strong>.
                </p>
              </div>
            </div>

            {/* Network / Graph Stats */}
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Métricas de tu Red de Pensamiento
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                  <div className="font-mono text-xl font-bold text-cyan-400">
                    {stats.totalNotes}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase mt-0.5">Notas Totales</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                  <div className="font-mono text-xl font-bold text-purple-400">
                    {stats.totalConnections}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase mt-0.5">Conexiones</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                  <div className="font-mono text-xl font-bold text-amber-400">
                    {stats.orphanedNodes.length}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase mt-0.5">Ideas Huérfanas</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                  <div className="font-mono text-xl font-bold text-emerald-400">
                    {stats.hubs.length}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase mt-0.5">Nodos Centrales</div>
                </div>
              </div>
            </div>

            {/* Orphan Nodes (Help user connect ideas) */}
            {stats.orphanedNodes.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Ideas Aisladas sin conexiones ({stats.orphanedNodes.length})
                </div>
                <p className="text-[11px] text-white/60 mb-2">
                  Estas notas no están enlazadas a ninguna otra idea. Haz clic para localizarlas y conectarlas:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  {stats.orphanedNodes.map((orphan) => (
                    <button
                      key={orphan.id}
                      onClick={() => {
                        onSelectNode(orphan.id);
                        onCenterCamera(orphan.initialX, orphan.initialY);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-black/40 hover:bg-amber-500/20 text-white/80 hover:text-amber-200 text-[11px] font-mono border border-amber-500/30 transition-colors"
                    >
                      {orphan.title || 'Sin Título'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Grid */}
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">
                Operaciones de Bóveda
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Export Markdown */}
                <button
                  onClick={() => exportVaultToMarkdownFiles(nodes)}
                  className="p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-start gap-3 group"
                >
                  <Download className="w-5 h-5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white">Exportar Bóveda (.md)</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Descarga todas las notas en formato Markdown compatible con Obsidian.
                    </div>
                  </div>
                </button>

                {/* Import Markdown */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-start gap-3 group"
                >
                  <Upload className="w-5 h-5 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white">Importar Archivos .md</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Carga archivos Markdown existentes para agregarlos a tu lienzo.
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

                {/* Reset to Demo */}
                <button
                  onClick={handleResetDemo}
                  className="p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-start gap-3 group"
                >
                  <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-white">Restaurar Notas Demo</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Vuelve al conjunto de notas de bienvenida predeterminado.
                    </div>
                  </div>
                </button>

                {/* Clear Vault */}
                <button
                  onClick={handleClearAll}
                  className="p-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-left transition-colors flex items-start gap-3 group"
                >
                  <Trash2 className="w-5 h-5 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-semibold text-rose-300">Vaciar Bóveda</div>
                    <div className="text-[11px] text-rose-200/60 mt-0.5">
                      Borra todas las notas y conexiones del almacenamiento local.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-[#090C14] flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-mono transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
