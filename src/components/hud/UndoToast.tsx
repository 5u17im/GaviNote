'use client';

import React, { useEffect } from 'react';
import { useGraviStore } from '../../store/useGraviStore';

export function UndoToast() {
  const { backupDeleted, recoverNode } = useGraviStore();

  useEffect(() => {
    if (backupDeleted) {
      const timer = setTimeout(() => {
        useGraviStore.setState({ backupDeleted: null });
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [backupDeleted]);

  if (!backupDeleted) return null;

  return (
    <div 
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 rounded-xl border border-[#FF5252]/20 bg-[#0F1322]/90 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 w-80 animate-in slide-in-from-bottom-5"
      style={{ boxShadow: '0 8px 32px 0 rgba(255, 82, 82, 0.08)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shrink-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-progress-bar {
          animation: shrink-progress 10s linear forwards;
        }
      `}} />
      
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono text-[#FF5252]/80 uppercase tracking-wide">
            Acción realizada
          </span>
          <span className="text-xs text-white/90 font-medium truncate max-w-[180px]">
            {`Nota "${backupDeleted.node.title || 'Sin Título'}" eliminada`}
          </span>
        </div>
        <button
          onClick={() => {
            recoverNode();
          }}
          className="px-3 py-1.5 text-xs font-semibold font-mono rounded bg-[#FF5252]/10 hover:bg-[#FF5252]/20 border border-[#FF5252]/30 hover:border-[#FF5252] text-[#FF5252] transition-all cursor-pointer"
        >
          Deshacer
        </button>
      </div>

      {/* Progress countdown bar (Animated strictly with hardware-accelerated CSS transitions) */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
        <div className="toast-progress-bar h-full bg-[#FF5252]" />
      </div>
    </div>
  );
}
