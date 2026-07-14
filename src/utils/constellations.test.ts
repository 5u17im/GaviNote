import { describe, it, expect } from 'vitest';
import { computeConstellations } from './constellations';
import { NodeMeta, Connection } from '../types/node.types';

function makeNode(id: string): NodeMeta {
  return {
    id,
    title: id,
    content: '',
    tags: [],
    category: 'idea',
    initialX: 0,
    initialY: 0,
    width: 260,
    height: 120,
    createdAt: 0,
  };
}

function makeConn(id: string, sourceId: string, targetId: string): Connection {
  return { id, sourceId, targetId, type: 'neutra' };
}

describe('computeConstellations', () => {
  it('returns no constellations when there are no connections', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    expect(computeConstellations(nodes, [])).toEqual([]);
  });

  it('groups a chain of connected nodes into one constellation', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const conns = [makeConn('c1', 'a', 'b'), makeConn('c2', 'b', 'c')];
    const result = computeConstellations(nodes, conns);
    expect(result).toHaveLength(1);
    expect([...result[0].nodeIds].sort()).toEqual(['a', 'b', 'c']);
  });

  it('separates disconnected components into different constellations', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(makeNode);
    const conns = [makeConn('c1', 'a', 'b'), makeConn('c2', 'c', 'd')];
    const result = computeConstellations(nodes, conns);
    expect(result).toHaveLength(2);
  });

  it('ignores lone nodes (component size < 2)', () => {
    const nodes = ['a', 'b', 'lonely'].map(makeNode);
    const conns = [makeConn('c1', 'a', 'b')];
    const result = computeConstellations(nodes, conns);
    expect(result).toHaveLength(1);
    expect(result[0].nodeIds).not.toContain('lonely');
  });

  it('ignores connections that reference missing nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const conns = [makeConn('c1', 'a', 'ghost')];
    const result = computeConstellations(nodes, conns);
    expect(result).toEqual([]);
  });

  it('assigns deterministic, stable colors', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(makeNode);
    const conns = [makeConn('c1', 'a', 'b'), makeConn('c2', 'c', 'd')];
    const first = computeConstellations(nodes, conns);
    const second = computeConstellations(nodes, conns);
    expect(first.map((c) => c.color)).toEqual(second.map((c) => c.color));
  });

  describe('mode "tags"', () => {
    it('groups nodes that share a tag, ignoring graph links', () => {
      const nodes = ['a', 'b', 'c', 'd'].map(makeNode);
      nodes[0].tags = ['alpha'];
      nodes[1].tags = ['alpha'];
      nodes[2].tags = ['beta'];
      nodes[3].tags = ['beta'];
      // No connections at all.
      const result = computeConstellations(nodes, [], 'tags');
      expect(result).toHaveLength(2);
      const sizes = result.map((c) => c.nodeIds.length).sort();
      expect(sizes).toEqual([2, 2]);
    });

    it('keeps unlinked-but-tagged nodes in their group', () => {
      const nodes = ['a', 'b', 'c'].map(makeNode);
      nodes[0].tags = ['x'];
      nodes[1].tags = ['x'];
      nodes[2].tags = ['y'];
      const result = computeConstellations(nodes, [], 'tags');
      const alpha = result.find((c) => c.nodeIds.includes('a'))!;
      expect(alpha.nodeIds).toContain('b');
      expect(alpha.nodeIds).not.toContain('c');
    });

    it('falls back to graph mode in the default', () => {
      const nodes = ['a', 'b', 'c'].map(makeNode);
      nodes[0].tags = ['x'];
      nodes[1].tags = ['x'];
      const result = computeConstellations(nodes, []);
      // No connections → no graph clusters despite shared tag.
      expect(result).toHaveLength(0);
    });
  });
});
