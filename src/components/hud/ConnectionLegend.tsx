'use client';

import React from 'react';

export function ConnectionLegend() {
  return (
    <div className="absolute bottom-6 left-10 z-40 w-64 rounded-sm border border-[#222733] bg-[#0D0F17]/90 p-3 shadow-xl backdrop-blur-md flex flex-col gap-2.5 pointer-events-auto font-mono text-[11px]">
      {/* Title */}
      <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 flex items-center justify-between border-b border-[#222733] pb-1.5">
        <span>{"// TELEMETRÍA DE ENLACES"}</span>
        <span className="h-1 w-1 bg-neutral-600 rounded-none animate-pulse" />
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-2">
        {/* Neutro */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#64748B" strokeWidth="2" />
          </svg>
          <span className="text-neutral-400 font-sans text-[11px]">Neutro / Derivación (Estándar)</span>
        </div>

        {/* Apoyo */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#059669" strokeWidth="3" />
          </svg>
          <span className="text-neutral-400 font-sans text-[11px]">Apoyo / Refuerzo Lógico</span>
        </div>

        {/* Conflicto */}
        <div className="flex items-center gap-3">
          <svg width="24" height="6" className="overflow-visible flex-shrink-0">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
          </svg>
          <span className="text-neutral-400 font-sans text-[11px]">Conflicto / Tensión</span>
        </div>
      </div>

      {/* Help footnote */}
      <div className="text-[9px] text-neutral-500 font-mono mt-0.5 border-t border-[#222733] pt-1.5">
        * Clic izq. en el hilo para cambiar tipo, clic der. para borrar.
      </div>
    </div>
  );
}
