import { describe, it, expect } from 'vitest';
import { validateSnapshot, serializeSnapshot, SCHEMA_VERSION } from './serializer';
import type { NodeMeta, Connection } from '../types/node.types';

function makeNode(overrides: Partial<NodeMeta> = {}): NodeMeta {
  return {
    id: 'node-1',
    title: 'Title',
    content: 'Content',
    tags: ['a'],
    category: 'idea',
    initialX: 10,
    initialY: 20,
    width: 260,
    height: 120,
    createdAt: 123,
    ...overrides,
  };
}

describe('validateSnapshot', () => {
  it('returns null for non-object input', () => {
    expect(validateSnapshot(null)).toBeNull();
    expect(validateSnapshot('nope')).toBeNull();
    expect(validateSnapshot(42)).toBeNull();
  });

  it('returns null when nodes is not an array', () => {
    expect(validateSnapshot({ nodes: 'x' })).toBeNull();
  });

  it('parses a valid snapshot', () => {
    const raw = { nodes: [makeNode()], connections: [] };
    const result = validateSnapshot(raw);
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.nodes[0].id).toBe('node-1');
  });

  it('falls back to idea for invalid category', () => {
    const raw = { nodes: [makeNode({ category: 'bogus' as never })] };
    const result = validateSnapshot(raw)!;
    expect(result.nodes[0].category).toBe('idea');
  });

  it('applies default dimensions for invalid numbers', () => {
    const raw = { nodes: [makeNode({ width: NaN, height: undefined as never })] };
    const result = validateSnapshot(raw)!;
    expect(result.nodes[0].width).toBe(260);
    expect(result.nodes[0].height).toBe(120);
  });

  it('drops connections referencing missing nodes', () => {
    const raw = {
      nodes: [makeNode({ id: 'node-1' })],
      connections: [
        { id: 'c1', sourceId: 'node-1', targetId: 'ghost', type: 'apoyo' },
      ] as Connection[],
    };
    const result = validateSnapshot(raw)!;
    expect(result.connections).toHaveLength(0);
  });

  it('keeps valid connections and drops self-loops', () => {
    const raw = {
      nodes: [makeNode({ id: 'a' }), makeNode({ id: 'b' })],
      connections: [
        { id: 'c1', sourceId: 'a', targetId: 'b', type: 'apoyo' },
        { id: 'c2', sourceId: 'a', targetId: 'a', type: 'neutra' },
      ] as Connection[],
    };
    const result = validateSnapshot(raw)!;
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].id).toBe('c1');
  });

  it('falls back to neutra for invalid connection type', () => {
    const raw = {
      nodes: [makeNode({ id: 'a' }), makeNode({ id: 'b' })],
      connections: [{ id: 'c1', sourceId: 'a', targetId: 'b', type: 'weird' }],
    };
    const result = validateSnapshot(raw)!;
    expect(result.connections[0].type).toBe('neutra');
  });
});

describe('serializeSnapshot', () => {
  it('wraps data with version and app metadata', () => {
    const snap = serializeSnapshot([makeNode()], []);
    expect(snap.version).toBe(SCHEMA_VERSION);
    expect(snap.app).toBe('GraviNote');
    expect(snap.nodes).toHaveLength(1);
    expect(typeof snap.exportedAt).toBe('number');
  });

  it('round-trips through validateSnapshot', () => {
    const nodes = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];
    const connections: Connection[] = [
      { id: 'c1', sourceId: 'a', targetId: 'b', type: 'conflicto' },
    ];
    const serialized = serializeSnapshot(nodes, connections);
    const parsed = validateSnapshot(JSON.parse(JSON.stringify(serialized)))!;
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections[0].type).toBe('conflicto');
  });
});
