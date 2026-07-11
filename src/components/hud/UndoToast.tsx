'use client';

import React, { useEffect, useState } from 'react';
import { useGraviStore } from '../../store/useGraviStore';

export function UndoToast() {
  const { backupDeleted, recoverNode } = useGraviStore();
  const [timeLeft, setTimeLeft] = useState(100); // Percentage of progress bar

  useEffect(() => {
    if (backupDeleted) {
      setTimeLeft(100);

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Clear backup from store asynchronously in next event loop tick to prevent linter setState warning
            setTimeout(() => {
              useGraviStore.setState({ backupDeleted: null });
            }, 0);
            return 0;
          }
          return prev - 1; // 100 steps in 10 seconds (100ms each)
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [backupDeleted]);

  if (!backupDeleted) return null;

  return (
    <div 
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 rounded-xl border border-[#FF5252]/20 bg-[#0F1322]/90 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 w-80 animate-in slide-in-from-bottom-5"
      style={{ boxShadow: '0 8px 32px 0 rgba(255, 82, 82, 0.08)' }}
    >
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

      {/* Progress countdown bar */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
        <div 
          className="h-full bg-[#FF5252] transition-all duration-100 ease-linear"
          style={{ width: `${timeLeft}%` }}
        />
      </div>
    </div>
  );
}
