'use client';

import React from 'react';
import { useGraviStore } from '../../store/useGraviStore';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function PresentationBar() {
  const isPresenting = useGraviStore((s) => s.isPresenting);
  const tourIndex = useGraviStore((s) => s.tourIndex);
  const nodes = useGraviStore((s) => s.nodes);
  const nextStep = useGraviStore((s) => s.nextStep);
  const prevStep = useGraviStore((s) => s.prevStep);
  const stopPresentation = useGraviStore((s) => s.stopPresentation);

  if (!isPresenting || nodes.length === 0) return null;

  const total = nodes.length;
  const current = Math.min(tourIndex, total - 1);
  const node = nodes[current];
  const title = node?.title?.trim() || 'Sin título';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-[#222733] bg-[#0D0F17]/95 px-3 py-2 shadow-2xl shadow-black/80 backdrop-blur-md pointer-events-auto">
      <button
        onClick={prevStep}
        disabled={current === 0}
        aria-label="Nota anterior"
        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center min-w-40 max-w-64 px-1">
        <span className="font-sans text-xs text-white/90 truncate max-w-full" title={title}>
          {title}
        </span>
        <span className="font-mono text-[10px] text-neutral-500 tabular-nums tracking-widest">
          {current + 1} / {total}
        </span>
      </div>

      <button
        onClick={nextStep}
        disabled={current >= total - 1}
        aria-label="Nota siguiente"
        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <div className="w-px h-6 bg-[#222733]" />

      <button
        onClick={stopPresentation}
        aria-label="Salir de la presentación"
        className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
