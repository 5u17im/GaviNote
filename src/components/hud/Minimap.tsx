'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { CATEGORY_INFO } from '../nodes/registry';
import type { NodeMeta } from '../../types/node.types';

interface MinimapProps {
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  nodes: NodeMeta[];
  zoom: number;
  panX: number;
  panY: number;
  onRecenter: (worldX: number, worldY: number) => void;
}

const MAP_W = 180;
const MAP_H = 130;
const PAD = 1.25;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Dot {
  x: number;
  y: number;
  color: string;
}

export function Minimap({ bodiesRef, nodes, zoom, panX, panY, onRecenter }: MinimapProps) {
  const [bounds, setBounds] = useState<Bounds>({ minX: -500, minY: -400, maxX: 500, maxY: 400 });
  const [dots, setDots] = useState<Dot[]>([]);
  const [viewRect, setViewRect] = useState<Bounds | null>(null);
  const lastUpdate = useRef(0);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate.current < 110) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastUpdate.current = now;

      const bodies = Array.from(bodiesRef.current.values());
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const nextDots: Dot[] = [];
      const catById = new Map(nodes.map((n) => [n.id, n.category]));

      for (const b of bodies) {
        if (!Number.isFinite(b.position.x) || !Number.isFinite(b.position.y)) continue;
        const cat = catById.get(b.label);
        const color = cat ? CATEGORY_INFO[cat]?.color ?? '#00E5FF' : '#00E5FF';
        nextDots.push({ x: b.position.x, y: b.position.y, color });
        minX = Math.min(minX, b.position.x);
        minY = Math.min(minY, b.position.y);
        maxX = Math.max(maxX, b.position.x);
        maxY = Math.max(maxY, b.position.y);
      }

      // Include the current viewport so the camera rect is always visible.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const vMinX = (-cx - panX) / zoom;
      const vMinY = (-cy - panY) / zoom;
      const vMaxX = vMinX + window.innerWidth / zoom;
      const vMaxY = vMinY + window.innerHeight / zoom;

      if (bodies.length === 0) {
        minX = -500; minY = -400; maxX = 500; maxY = 400;
      }
      const allMinX = Math.min(minX, vMinX);
      const allMinY = Math.min(minY, vMinY);
      const allMaxX = Math.max(maxX, vMaxX);
      const allMaxY = Math.max(maxY, vMaxY);

      setBounds({ minX: allMinX, minY: allMinY, maxX: allMaxX, maxY: allMaxY });
      setDots(nextDots);
      setViewRect({ minX: vMinX, minY: vMinY, maxX: vMaxX, maxY: vMaxY });
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bodiesRef, nodes, zoom, panX, panY]);

  const toMap = (wx: number, wy: number) => {
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(MAP_W / (w * PAD), MAP_H / (h * PAD));
    const offX = (MAP_W - w * scale) / 2;
    const offY = (MAP_H - h * scale) / 2;
    return {
      x: offX + (wx - bounds.minX) * scale,
      y: offY + (wy - bounds.minY) * scale,
    };
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(MAP_W / (w * PAD), MAP_H / (h * PAD));
    const offX = (MAP_W - w * scale) / 2;
    const offY = (MAP_H - h * scale) / 2;
    const wx = (mx - offX) / scale + bounds.minX;
    const wy = (my - offY) / scale + bounds.minY;
    onRecenter(wx, wy);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-[140px] z-40 rounded-lg border border-white/10 bg-[#0D0F17]/70 px-2.5 py-2 shadow-2xl shadow-black/70 backdrop-blur-md pointer-events-auto">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-400">
          Mapa
        </span>
        <span className="font-mono text-[9px] tabular-nums text-neutral-500">
          {dots.length}
        </span>
      </div>
      <svg
        width={MAP_W}
        height={MAP_H}
        className="block cursor-pointer rounded-md bg-black/30"
        onClick={handleClick}
      >
        {dots.map((d, i) => {
          const p = toMap(d.x, d.y);
          return <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={d.color} opacity={0.9} />;
        })}
        {viewRect && (
          <rect
            x={toMap(viewRect.minX, viewRect.minY).x}
            y={toMap(viewRect.minX, viewRect.minY).y}
            width={toMap(viewRect.maxX, viewRect.maxY).x - toMap(viewRect.minX, viewRect.minY).x}
            height={toMap(viewRect.maxX, viewRect.maxY).y - toMap(viewRect.minX, viewRect.minY).y}
            fill="rgba(0,229,255,0.08)"
            stroke="#00E5FF"
            strokeWidth={1}
            rx={2}
          />
        )}
      </svg>
    </div>
  );
}
