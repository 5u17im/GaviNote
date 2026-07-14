'use client';

import React from 'react';

export function ConnectionLegend() {
  return (
    <div className="fixed bottom-24 left-10 z-40 w-64 rounded-lg border border-white/10 bg-[#0D0F17]/80 p-3 shadow-2xl shadow-black/70 backdrop-blur-md flex flex-col gap-2.5 pointer-events-auto">
      {/* Title */}
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 flex items-center justify-between border-b border-white/10 pb-1.5">
        <span>Conexiones</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF]/60 animate-pulse" />
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-2 font-mono">
        {/* Neutro */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#64748B" strokeWidth="2" />
          </svg>
          <span className="text-neutral-300 font-sans text-[11px]">Neutro / Derivación</span>
        </div>

        {/* Apoyo */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#059669" strokeWidth="3" />
          </svg>
          <span className="text-neutral-300 font-sans text-[11px]">Apoyo / Refuerzo</span>
        </div>

        {/* Conflicto */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
          </svg>
          <span className="text-neutral-300 font-sans text-[11px]">Conflicto / Tensión</span>
        </div>
      </div>

      {/* Help footnote */}
      <div className="text-[9px] text-neutral-500 font-mono border-t border-white/10 pt-1.5">
        Clic en el hilo: cambiar tipo · Clic der.: borrar · Doble clic: etiquetar
      </div>
    </div>
  );
}
