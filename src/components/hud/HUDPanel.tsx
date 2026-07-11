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
  Plus
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
    setZoom,
    setPan,
    loadState,
    addNode,
  } = useGraviStore();

  const { gravity, airFriction, magnetStrength, zoom } = physicsConfig;

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
    // Calculate world coordinates for screen center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    // Map screen center (cx, cy) to world coords: (cx - cx - panX)/zoom = -panX/zoom
    const { physicsConfig: currentConfig } = useGraviStore.getState();
    const x = -currentConfig.panX;
    const y = -currentConfig.panY;

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
      {/* 1. Quick Floating Actions (Bottom right or top right) */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-2 pointer-events-auto">
        {/* Quick Add Node */}
        <button
          onClick={handleQuickAdd}
          title="Crear Nota al Centro"
          className="p-3 rounded-full border border-white/10 bg-[#0F1322]/90 hover:bg-white/10 hover:border-white/20 text-white transition-all shadow-lg flex items-center justify-center cursor-pointer"
        >
          <Plus size={16} />
        </button>

        {/* Zoom to Fit */}
        <button
          onClick={handleZoomFit}
          title="Centrar Cámara"
          className="p-3 rounded-full border border-white/10 bg-[#0F1322]/90 hover:bg-white/10 hover:border-white/20 text-white transition-all shadow-lg flex items-center justify-center cursor-pointer"
        >
          <Maximize2 size={16} />
        </button>

        {/* Toggle Menu Panel */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Configuración de Física y Guardado"
          className={`p-3 rounded-full border transition-all shadow-lg flex items-center justify-center cursor-pointer ${
            isOpen 
              ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]' 
              : 'border-white/10 bg-[#0F1322]/90 hover:bg-white/10 hover:border-white/20 text-white'
          }`}
        >
          <Settings size={16} className={isOpen ? 'animate-spin-slow' : ''} />
        </button>

        {/* Help Panel Toggle */}
        <button
          onClick={() => setShowHelp(true)}
          title="Ver Atajos y Guía"
          className="p-3 rounded-full border border-white/10 bg-[#0F1322]/90 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all shadow-lg flex items-center justify-center cursor-pointer"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {/* 2. Settings Sidebar Panel */}
      {isOpen && (
        <div 
          className="absolute top-24 right-6 z-40 w-80 rounded-xl border border-white/10 bg-[#0F1322]/90 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-5 animate-in slide-in-from-top-3 pointer-events-auto"
          style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold tracking-wide text-white">⚙️ Ajustes Físicos</span>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
              <X size={14} />
            </button>
          </div>

          <div className="h-px bg-white/5" />

          {/* Sliders */}
          <div className="flex flex-col gap-4">
            {/* Gravity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/60">Gravedad</span>
                <span className="text-[#00E5FF] font-semibold">{gravity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full accent-[#00E5FF] bg-white/5 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono">0.00 (Espacio) - 1.00 (Tierra)</span>
            </div>

            {/* Friction */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/60">Resistencia del Aire</span>
                <span className="text-[#00E5FF] font-semibold">{(airFriction * 1000).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.05"
                step="0.001"
                value={airFriction}
                onChange={(e) => setAirFriction(parseFloat(e.target.value))}
                className="w-full accent-[#00E5FF] bg-white/5 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono">Menor valor = mayor inercia física</span>
            </div>

            {/* Magnetic Strength */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/60">Magnetismo (Etiquetas)</span>
                <span className="text-[#00E5FF] font-semibold">{magnetStrength.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.2"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(parseFloat(e.target.value))}
                className="w-full accent-[#00E5FF] bg-white/5 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <span className="text-[9px] text-white/30 font-mono">Atracción mutua entre notas con tags compartidos</span>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Trigger commands */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBigBang}
              className="w-full py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white/95 text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-[#FFB300]" />
              Explosión Big Bang
            </button>
            
            <button
              onClick={handleClearCanvas}
              disabled={nodes.length === 0}
              className="w-full py-2 rounded-lg border border-[#FF5252]/10 bg-[#FF5252]/5 hover:bg-[#FF5252]/15 text-[#FF5252] text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Trash2 size={14} />
              Limpiar Lienzo
            </button>
          </div>

          <div className="h-px bg-white/5" />

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
                className="py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload size={12} />
                Importar
              </button>
              
              <button
                onClick={handleExportJSON}
                className="py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={12} />
                Exportar
              </button>
            </div>

            <button
              onClick={handleExportPNG}
              className="w-full py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Image size={13} />
              Exportar Imagen
            </button>
          </div>
        </div>
      )}

      {/* 3. Help Modal Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="w-[450px] max-w-full rounded-2xl border border-white/10 bg-[#0F1322]/95 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-white">🚀 Guía Rápida & Atajos</h2>
              <button onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex flex-col gap-3.5 text-xs text-white/80">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Crear Nota</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Doble Clic (Vacío)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Editar Nota</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Doble Clic (Nota)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Guardar Edición</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Ctrl + Enter</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Conectar Notas</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Shift + Arrastrar</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Rotar Tipo Conexión</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Clic en el Hilo</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Desplazar Cámara</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Space + Arrastrar / Clic Medio</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Zoom</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Rueda Mouse</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="font-semibold">Menú de Opciones</span>
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-[10px]">Clic Derecho (Nota)</span>
              </div>
            </div>

            <div className="h-px bg-white/5 mt-1" />

            <div className="text-[10px] text-white/40 text-center font-mono">
              GraviNote por Nothing Sense · Versión 1.0.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
