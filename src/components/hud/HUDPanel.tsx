'use client';

import React, { useState, useRef } from 'react';
import { useGraviStore } from '../../store/useGraviStore';
import { exportStateToJSON, importStateFromJSON } from '../../utils/serializer';
import { commandBus } from '../../utils/commandBus';
import { 
  Settings, 
  Trash2, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Maximize2,
  HelpCircle,
  X,
  Plus,
  Sliders,
  Info,
  Search,
  Orbit,
  Play,
  Tag
} from 'lucide-react';

export function HUDPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    nodes,
    connections,
    physicsConfig,
    searchQuery,
    setSearchQuery,
    showConstellations,
    toggleConstellations,
    constellationMode,
    setConstellationMode,
    startPresentation,
    setGravity,
    setAirFriction,
    setMagnetStrength,
    setVortexGravity,
    loadState,
    addNode,
  } = useGraviStore();

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchCount = trimmedQuery
    ? nodes.filter((n) =>
        `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase().includes(trimmedQuery)
      ).length
    : 0;

  const { gravity, airFriction, magnetStrength, panX, panY, vortexGravity = 1.0 } = physicsConfig;

  // Trigger Big Bang
  const handleBigBang = () => {
    commandBus.emit('bigBang');
  };

  // Zoom to Fit
  const handleZoomFit = () => {
    commandBus.emit('zoomFit');
  };

  // Clear Canvas (with disintegration effect on all nodes)
  const handleClearCanvas = () => {
    if (nodes.length === 0) return;
    if (confirm('¿Estás seguro de que deseas limpiar todo el lienzo?')) {
      commandBus.emit('clearCanvas');
    }
  };

  // Import JSON
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importStateFromJSON(file, (loadedNodes, loadedConnections) => {
        loadState(loadedNodes, loadedConnections);
      });
    }
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // Export JSON
  const handleExportJSON = () => {
    exportStateToJSON(nodes, connections);
  };

  // Image capture guidance. Exporting to PNG is out of scope for V1 (see PRD §6);
  // we point the user to reliable OS-level capture instead of bundling html2canvas.
  const handleCaptureHelp = () => {
    alert(
      "📸 Para capturar tu mapa mental con la máxima fidelidad:\n\n" +
      "1. Te recomendamos presionar 'Ctrl + P' para guardar el lienzo completo como PDF.\n" +
      "2. O bien, utiliza la herramienta de recortes de tu sistema operativo (Windows: Win + Shift + S / macOS: Cmd + Shift + 4)."
    );
  };

  // Create new node in the center of current viewport
  const handleQuickAdd = () => {
    const category = 'idea';
    // Map screen center (cx, cy) to world coords: (cx - cx - panX)/zoom = -panX/zoom
    const x = -panX;
    const y = -panY;

    addNode({
      title: '',
      content: '',
      tags: [],
      category: category,
      initialX: x,
      initialY: y,
      width: 260,
      height: 120,
    });
  };

  return (
    <>
      {/* 0. Search / Filter (Top Left) */}
      <div className="fixed top-10 left-10 z-40 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-md border border-[#222733] bg-[#0D0F17]/95 px-3 py-2 shadow-xl backdrop-blur-md focus-within:border-[#00E5FF]/40 transition-colors">
          <Search size={14} aria-hidden="true" className="text-neutral-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, contenido o tag…"
            aria-label="Buscar notas por título, contenido o tag"
            className="w-52 bg-transparent text-xs text-white placeholder:text-neutral-600 font-mono outline-none"
          />
          {searchQuery && (
            <>
              <span className="font-mono text-[10px] text-neutral-500 shrink-0 tabular-nums">
                {matchCount}
              </span>
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 1. Quick Floating Actions (Top Right) */}
      <div className="fixed top-10 right-6 z-40 flex items-center gap-2 pointer-events-auto">
        {/* Quick Add Node */}
        <button
          onClick={handleQuickAdd}
          title="Crear Nota al Centro"
          aria-label="Crear nota al centro"
          className="p-3 rounded-md border border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <Plus size={16} aria-hidden="true" />
        </button>

        {/* Zoom to Fit */}
        <button
          onClick={handleZoomFit}
          title="Centrar Cámara"
          aria-label="Centrar cámara en el contenido"
          className="p-3 rounded-md border border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>

        {/* Toggle Constellations */}
        <button
          onClick={toggleConstellations}
          title="Mostrar/ocultar constelaciones"
          aria-label="Mostrar u ocultar constelaciones"
          aria-pressed={showConstellations}
          className={`p-3 rounded-md border transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md ${
            showConstellations
              ? 'bg-[#161A26] border-[#00E5FF]/40 text-[#00E5FF]'
              : 'border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white'
          }`}
        >
          <Orbit size={16} aria-hidden="true" />
        </button>

        {/* Grouping mode: by graph vs by shared tags (Idea 5) */}
        <button
          onClick={() => setConstellationMode(constellationMode === 'tags' ? 'graph' : 'tags')}
          aria-pressed={constellationMode === 'tags'}
          title={constellationMode === 'tags' ? 'Agrupar por tags' : 'Agrupar por conexiones'}
          aria-label="Cambiar modo de agrupación de constelaciones"
          className={`p-3 rounded-md border transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md ${
            constellationMode === 'tags'
              ? 'bg-[#161A26] border-[#CE93D8]/40 text-[#CE93D8]'
              : 'border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white'
          }`}
        >
          <Tag size={16} aria-hidden="true" />
        </button>

        {/* Start Presentation */}
        <button
          onClick={startPresentation}
          disabled={nodes.length === 0}
          title="Iniciar recorrido guiado"
          aria-label="Iniciar recorrido guiado"
          className="p-3 rounded-md border border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md disabled:opacity-30 disabled:pointer-events-none"
        >
          <Play size={16} aria-hidden="true" />
        </button>

        {/* Toggle Menu Panel */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Configuración de Física y Guardado"
          aria-label="Configuración de física y guardado"
          aria-expanded={isOpen}
          aria-controls="hud-settings-panel"
          className={`p-3 rounded-md border transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md ${
            isOpen 
              ? 'bg-[#161A26] border-[#00E5FF]/40 text-[#00E5FF]' 
              : 'border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white'
          }`}
        >
          <Settings size={16} aria-hidden="true" className={isOpen ? 'animate-spin-slow' : ''} />
        </button>

        {/* Help Panel Toggle */}
        <button
          onClick={() => setShowHelp(true)}
          title="Ver Atajos y Guía"
          aria-label="Ver atajos y guía"
          aria-haspopup="dialog"
          className="p-3 rounded-md border border-[#222733] bg-[#0D0F17]/95 hover:bg-[#161A26] hover:border-white/10 text-white/70 hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <HelpCircle size={16} aria-hidden="true" />
        </button>
      </div>

      {/* 2. Settings Sidebar Panel */}
      {isOpen && (
        <div 
          id="hud-settings-panel"
          role="region"
          aria-label="Telemetría física y guardado"
          className="fixed top-28 right-6 z-40 w-80 rounded-md border border-[#222733] bg-[#0D0F17]/95 p-5 shadow-2xl shadow-black/80 backdrop-blur-md flex flex-col gap-4.5 animate-in slide-in-from-top-4 duration-200 pointer-events-auto"
          style={{ maxHeight: 'calc(100dvh - 120px)', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-neutral-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-white/90">
                TELEMETRÍA FÍSICA
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Cerrar panel de configuración" className="text-white/40 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-md">
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="h-px bg-[#222733]" />

          {/* Sliders */}
          <div className="flex flex-col gap-4">
            {/* Gravity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500">{"// Gravedad"}</span>
                <span className="text-neutral-300 font-bold">
                  {gravity.toFixed(2)} G
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                aria-label="Gravedad"
                aria-valuetext={`${gravity.toFixed(2)} G`}
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-600 font-mono italic mt-0.5">0.00 (Espacio) - 1.00 (Tierra)</span>
            </div>

            {/* Friction */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500">{"// Fricción de Aire"}</span>
                <span className="text-neutral-300 font-bold">
                  {(airFriction * 1000).toFixed(0)} ms
                </span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.05"
                step="0.001"
                value={airFriction}
                onChange={(e) => setAirFriction(parseFloat(e.target.value))}
                aria-label="Fricción de aire"
                aria-valuetext={`${(airFriction * 1000).toFixed(0)} ms`}
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-600 font-mono italic mt-0.5">Menor fricción = mayor inercia</span>
            </div>

            {/* Magnetic Strength */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500">{"// Fuerza Magnética"}</span>
                <span className="text-neutral-300 font-bold">
                  {magnetStrength.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.2"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(parseFloat(e.target.value))}
                aria-label="Fuerza magnética"
                aria-valuetext={`${magnetStrength.toFixed(1)}x`}
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-600 font-mono italic mt-0.5">Atracción por tags / Repulsión de colisión</span>
            </div>

            {/* Vortex Gravity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500">{"// Succión del Vórtice"}</span>
                <span className="text-neutral-300 font-bold">
                  {(vortexGravity * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={vortexGravity}
                onChange={(e) => setVortexGravity(parseFloat(e.target.value))}
                aria-label="Succión del vórtice"
                aria-valuetext={`${(vortexGravity * 100).toFixed(0)}%`}
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-600 font-mono italic mt-0.5">Gravedad del hoyo negro al eliminar ideas</span>
            </div>
          </div>

          <div className="h-px bg-[#222733] my-0.5" />

          {/* Combined compact actions grid */}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            
            <div className="grid grid-cols-2 gap-px bg-[#222733] border border-[#222733] rounded-sm overflow-hidden">
              <button
                onClick={handleBigBang}
                className="bg-[#0D0F17] hover:bg-[#161A26] font-mono text-xs text-neutral-300 py-2.5 cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                <Sparkles size={12} className="text-amber-500" />
                Big Bang
              </button>
              
              <button
                onClick={handleClearCanvas}
                disabled={nodes.length === 0}
                className="bg-[#0D0F17] hover:bg-[#161A26] font-mono text-xs text-neutral-300 py-2.5 cursor-pointer flex items-center justify-center gap-1.5 border-0 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 size={12} className="text-red-500" />
                Limpiar
              </button>
              
              <button
                onClick={handleImportClick}
                className="bg-[#0D0F17] hover:bg-[#161A26] font-mono text-xs text-neutral-300 py-2.5 cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                <Upload size={12} className="text-neutral-500" />
                Importar
              </button>
              
              <button
                onClick={handleExportJSON}
                className="bg-[#0D0F17] hover:bg-[#161A26] font-mono text-xs text-neutral-300 py-2.5 cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                <Download size={12} className="text-neutral-500" />
                Exportar
              </button>

              <button
                onClick={handleCaptureHelp}
                title="Cómo capturar el lienzo como imagen"
                aria-label="Cómo capturar el lienzo como imagen"
                className="col-span-2 bg-[#0D0F17] hover:bg-[#161A26] font-mono text-xs text-neutral-300 py-2.5 cursor-pointer flex items-center justify-center gap-1.5 border-0 border-t border-[#222733]"
              >
                <ImageIcon size={12} aria-hidden="true" className="text-neutral-500" />
                Capturar Imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Help Modal Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-label="Atajos y guía de pilotaje" className="w-[460px] max-w-full rounded-md border border-[#222733] bg-[#0D0F17]/96 px-6 py-4 shadow-2xl shadow-black/80 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-neutral-400" />
                <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-white">
                  TELEMETRÍA DE PILOTAJE
                </h2>
              </div>
              <button onClick={() => setShowHelp(false)} aria-label="Cerrar guía" className="text-white/40 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-md">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="h-px bg-[#222733]" />

            {/* Instruction table */}
            <div className="flex flex-col text-neutral-400">
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Crear Nota</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Doble Clic (Vacío)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Editar Nota</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Doble Clic (Nota)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Guardar Edición</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Conectar Notas</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Shift + Arrastrar
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Rotar Tipo Conexión</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Clic en el Hilo
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Desplazar Cámara</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Espacio + Arrastrar
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Zoom Lienzo</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Rueda del Mouse
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Zoom Táctil</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Pellizco (2 Dedos)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/80 text-xs text-neutral-300">
                <span className="font-sans text-neutral-400">Menú de Opciones</span>
                <kbd className="px-2 py-1 bg-neutral-900 border border-neutral-700/80 rounded text-[11px] font-mono text-neutral-200 shadow-sm">
                  Clic Derecho (Nota)
                </kbd>
              </div>
            </div>

            <div className="mt-4 py-3 text-center text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
              GraviNote por Nothing Sense · v1.1.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
