'use client';

import React, { useState, useRef } from 'react';
import { useGraviStore } from '../../store/useGraviStore';
import { exportStateToJSON, importStateFromJSON } from '../../utils/serializer';
import { 
  Settings, 
  Trash2, 
  Download, 
  Upload, 
  Image, 
  Sparkles, 
  Maximize2,
  HelpCircle,
  X,
  Plus,
  Sliders,
  Info
} from 'lucide-react';

export function HUDPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    nodes,
    connections,
    physicsConfig,
    setGravity,
    setAirFriction,
    setMagnetStrength,
    loadState,
    addNode,
  } = useGraviStore();

  const { gravity, airFriction, magnetStrength, zoom, panX, panY } = physicsConfig;

  // Trigger Big Bang
  const handleBigBang = () => {
    window.dispatchEvent(new Event('trigger-bigbang'));
  };

  // Zoom to Fit
  const handleZoomFit = () => {
    window.dispatchEvent(new Event('trigger-zoom-fit'));
  };

  // Clear Canvas (with disintegration effect on all nodes)
  const handleClearCanvas = () => {
    if (nodes.length === 0) return;
    if (confirm('¿Estás seguro de que deseas limpiar todo el lienzo?')) {
      window.dispatchEvent(new Event('trigger-clear-canvas'));
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

  // PNG Capture Notice
  const handleExportPNG = () => {
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
      {/* 1. Quick Floating Actions (Top Right) */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-2 pointer-events-auto">
        {/* Quick Add Node */}
        <button
          onClick={handleQuickAdd}
          title="Crear Nota al Centro"
          className="p-3 rounded-xl border border-white/[0.08] bg-[#0A0D1B]/85 hover:bg-white/[0.08] hover:border-white/20 text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <Plus size={16} />
        </button>

        {/* Zoom to Fit */}
        <button
          onClick={handleZoomFit}
          title="Centrar Cámara"
          className="p-3 rounded-xl border border-white/[0.08] bg-[#0A0D1B]/85 hover:bg-white/[0.08] hover:border-white/20 text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <Maximize2 size={16} />
        </button>

        {/* Toggle Menu Panel */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Configuración de Física y Guardado"
          className={`p-3 rounded-xl border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md ${
            isOpen 
              ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]' 
              : 'border-white/[0.08] bg-[#0A0D1B]/85 hover:bg-white/[0.08] hover:border-white/20 text-white'
          }`}
        >
          <Settings size={16} className={isOpen ? 'animate-spin-slow' : ''} />
        </button>

        {/* Help Panel Toggle */}
        <button
          onClick={() => setShowHelp(true)}
          title="Ver Atajos y Guía"
          className="p-3 rounded-xl border border-white/[0.08] bg-[#0A0D1B]/85 hover:bg-white/[0.08] hover:border-white/20 text-white/70 hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {/* 2. Settings Sidebar Panel */}
      {isOpen && (
        <div 
          className="absolute top-24 right-6 z-40 w-80 rounded-2xl border border-white/[0.08] bg-[#070913]/92 p-5 shadow-[0_20px_50px_rgba(0,229,255,0.05),0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col gap-4.5 animate-in slide-in-from-top-4 duration-200 pointer-events-auto"
          style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[#00E5FF] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-white/90">
                Panel de Telemetría
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-lg">
              <X size={14} />
            </button>
          </div>

          <div className="h-px bg-white/[0.04]" />

          {/* Sliders */}
          <div className="flex flex-col gap-4">
            {/* Gravity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-white/50">// Gravedad</span>
                <span className="text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 font-bold">
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
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono italic mt-0.5">0.00 (Espacio) - 1.00 (Tierra)</span>
            </div>

            {/* Friction */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-white/50">// Fricción de Aire</span>
                <span className="text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 font-bold">
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
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono italic mt-0.5">Menor fricción = mayor inercia de planeo</span>
            </div>

            {/* Magnetic Strength */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-white/50">// Fuerza Magnética</span>
                <span className="text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 font-bold">
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
                className="w-full hud-slider mt-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono italic mt-0.5">Atracción por tags / Repulsión de colisión</span>
            </div>
          </div>

          <div className="h-px bg-white/[0.04] my-0.5" />

          {/* Trigger commands */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBigBang}
              className="w-full py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/15 hover:border-amber-400 text-amber-300 text-[11px] font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
            >
              <Sparkles size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
              Explosión Big Bang
            </button>
            
            <button
              onClick={handleClearCanvas}
              disabled={nodes.length === 0}
              className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/15 hover:border-red-400 text-red-300 text-[11px] font-bold font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] group"
            >
              <Trash2 size={13} className="text-red-400 group-hover:scale-110 transition-transform" />
              Limpiar Lienzo
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-0.5" />

          {/* Serialization */}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleImportClick}
                className="py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white/90 hover:text-white text-[11px] font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload size={12} className="text-white/40" />
                Importar
              </button>
              
              <button
                onClick={handleExportJSON}
                className="py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white/90 hover:text-white text-[11px] font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={12} className="text-white/40" />
                Exportar
              </button>
            </div>

            <button
              onClick={handleExportPNG}
              className="w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white/90 hover:text-white text-[11px] font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Image size={12} className="text-white/40" />
              Exportar Imagen
            </button>
          </div>
        </div>
      )}

      {/* 3. Help Modal Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
          <div className="w-[460px] max-w-full rounded-2xl border border-white/[0.08] bg-[#070913]/96 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#00E5FF] animate-pulse" />
                <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-white">
                  Manual de Pilotaje (Atajos)
                </h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/5 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="h-px bg-white/[0.04]" />

            {/* Instruction table */}
            <div className="flex flex-col gap-2.5 text-[11px] font-sans text-white/80">
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Crear Nota</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Doble Clic (Vacío)
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Editar Nota</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Doble Clic (Nota)
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Guardar Edición</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Ctrl + Enter
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Conectar Notas</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Shift + Arrastrar
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Rotar Tipo Conexión</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Clic en el Hilo
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Desplazar Cámara</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Espacio + Arrastrar
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Zoom Lienzo</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Rueda del Mouse
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.03] hover:bg-white/[0.01] px-1 rounded transition-colors">
                <span className="font-semibold text-white/90">Menú de Opciones</span>
                <span className="font-mono bg-white/[0.05] border border-white/[0.05] text-[#00E5FF] px-2 py-0.5 rounded text-[10px]">
                  Clic Derecho (Nota)
                </span>
              </div>
            </div>

            <div className="h-px bg-white/[0.04] mt-1" />

            <div className="text-[10px] text-white/40 text-center font-mono uppercase tracking-wider">
              GraviNote por Nothing Sense · v1.0.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
