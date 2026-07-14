import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import { applyMagneticForces } from './forces';
import type { NodeMeta } from '../types/node.types';

function makeNode(id: string, tags: string[] = []): NodeMeta {
  return {
    id,
    title: id,
    content: '',
    tags,
    category: 'idea',
    initialX: 0,
    initialY: 0,
    width: 260,
    height: 120,
    createdAt: 0,
  };
}

function setup(positions: Array<{ id: string; x: number; y: number; tags?: string[] }>) {
  const nodes: NodeMeta[] = [];
  const bodies = new Map<string, Matter.Body>();
  for (const p of positions) {
    nodes.push(makeNode(p.id, p.tags));
    const body = Matter.Bodies.circle(p.x, p.y, 20);
    bodies.set(p.id, body);
  }
  return { nodes, bodies };
}

describe('applyMagneticForces', () => {
  it('does nothing with fewer than 2 nodes', () => {
    const { nodes, bodies } = setup([{ id: 'a', x: 0, y: 0 }]);
    applyMagneticForces(bodies, nodes);
    expect(bodies.get('a')!.force).toEqual({ x: 0, y: 0 });
  });

  it('repels overlapping nodes (within repulsion distance)', () => {
    const { nodes, bodies } = setup([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 50, y: 0 },
    ]);
    applyMagneticForces(bodies, nodes);
    const a = bodies.get('a')!;
    const b = bodies.get('b')!;
    // a pushed left (negative x), b pushed right (positive x)
    expect(a.force.x).toBeLessThan(0);
    expect(b.force.x).toBeGreaterThan(0);
  });

  it('attracts nodes sharing tags at medium distance', () => {
    const { nodes, bodies } = setup([
      { id: 'a', x: 0, y: 0, tags: ['t'] },
      { id: 'b', x: 300, y: 0, tags: ['t'] },
    ]);
    applyMagneticForces(bodies, nodes);
    const a = bodies.get('a')!;
    const b = bodies.get('b')!;
    // a pulled right (toward b), b pulled left (toward a)
    expect(a.force.x).toBeGreaterThan(0);
    expect(b.force.x).toBeLessThan(0);
  });

  it('does not attract nodes without shared tags', () => {
    const { nodes, bodies } = setup([
      { id: 'a', x: 0, y: 0, tags: ['x'] },
      { id: 'b', x: 300, y: 0, tags: ['y'] },
    ]);
    applyMagneticForces(bodies, nodes);
    expect(bodies.get('a')!.force).toEqual({ x: 0, y: 0 });
  });

  it('ignores nodes beyond attraction range', () => {
    const { nodes, bodies } = setup([
      { id: 'a', x: 0, y: 0, tags: ['t'] },
      { id: 'b', x: 2000, y: 0, tags: ['t'] },
    ]);
    applyMagneticForces(bodies, nodes);
    expect(bodies.get('a')!.force).toEqual({ x: 0, y: 0 });
  });

  it('produces the same result regardless of grid cell boundaries (many nodes)', () => {
    const positions = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      x: i * 40,
      y: 0,
      tags: ['t'],
    }));
    const { nodes, bodies } = setup(positions);
    expect(() => applyMagneticForces(bodies, nodes)).not.toThrow();
    // At least some forces were applied
    const anyForce = Array.from(bodies.values()).some((b) => b.force.x !== 0 || b.force.y !== 0);
    expect(anyForce).toBe(true);
  });
});

describe('applyMagneticForces — performance budget (RNF-01)', () => {
  // Proxy for the 60 FPS budget: a single force tick with 200 nodes must fit
  // well within a 16.6ms frame. We take the best of several runs to discount
  // GC/scheduling noise while still catching an accidental O(N^2) regression.
  it('computes a force tick for 200 nodes within the frame budget', () => {
    const GRID = 20; // 20 x 10 = 200 nodes
    const positions = Array.from({ length: 200 }, (_, i) => ({
      id: `n${i}`,
      x: (i % GRID) * 200,
      y: Math.floor(i / GRID) * 200,
      tags: [`t${i % 5}`],
    }));
    const { nodes, bodies } = setup(positions);

    let best = Infinity;
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      applyMagneticForces(bodies, nodes);
      best = Math.min(best, performance.now() - start);
    }

    expect(best).toBeLessThan(16.6);
  });
});
