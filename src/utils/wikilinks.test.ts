import { describe, it, expect } from 'vitest';
import {
  extractWikilinks,
  calculateBacklinks,
  getGraphStats,
  syncWikilinksWithConnections,
  findNodeByTitle,
} from './wikilinks';
import { NodeMeta, Connection } from '../types/node.types';

describe('wikilinks utility', () => {
  it('extracts standard and aliased wikilinks from text', () => {
    const text = 'Esta es una nota con [[Inteligencia Artificial]] y también [[Redes Neuronales|Deep Learning]].';
    const links = extractWikilinks(text);

    expect(links).toHaveLength(2);
    expect(links[0].title).toBe('Inteligencia Artificial');
    expect(links[0].alias).toBeUndefined();
    expect(links[1].title).toBe('Redes Neuronales');
    expect(links[1].alias).toBe('Deep Learning');
  });

  it('deduplicates wikilinks in the same text', () => {
    const text = '[[Misma Nota]] y otra vez [[misma nota]].';
    const links = extractWikilinks(text);
    expect(links).toHaveLength(1);
    expect(links[0].title).toBe('Misma Nota');
  });

  it('finds node by title case-insensitively', () => {
    const nodes: NodeMeta[] = [
      {
        id: 'node-1',
        title: 'Mi Idea Central',
        content: '',
        tags: [],
        category: 'central',
        initialX: 0,
        initialY: 0,
        width: 200,
        height: 100,
        createdAt: 100,
      },
    ];

    const found = findNodeByTitle(nodes, 'mi idea central');
    expect(found).toBeDefined();
    expect(found?.id).toBe('node-1');
  });

  it('calculates incoming backlinks and outgoing links correctly', () => {
    const nodes: NodeMeta[] = [
      {
        id: 'node-1',
        title: 'Origen',
        content: 'Enlazando a [[Destino]]',
        tags: [],
        category: 'idea',
        initialX: 0,
        initialY: 0,
        width: 200,
        height: 100,
        createdAt: 100,
      },
      {
        id: 'node-2',
        title: 'Destino',
        content: 'Contenido sin enlaces',
        tags: [],
        category: 'referencia',
        initialX: 100,
        initialY: 100,
        width: 200,
        height: 100,
        createdAt: 100,
      },
    ];

    const backlinks = calculateBacklinks(nodes, 'node-2');
    expect(backlinks.incoming).toHaveLength(1);
    expect(backlinks.incoming[0].id).toBe('node-1');

    const outgoingFromOrigin = calculateBacklinks(nodes, 'node-1');
    expect(outgoingFromOrigin.outgoing).toHaveLength(1);
    expect(outgoingFromOrigin.outgoing[0].targetTitle).toBe('Destino');
    expect(outgoingFromOrigin.outgoing[0].exists).toBe(true);
  });

  it('computes graph stats identifying orphans and hubs', () => {
    const nodes: NodeMeta[] = [
      { id: 'n1', title: 'Hub', content: '', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
      { id: 'n2', title: 'Child 1', content: '', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
      { id: 'n3', title: 'Child 2', content: '', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
      { id: 'n4', title: 'Orphan', content: '', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
    ];

    const connections: Connection[] = [
      { id: 'c1', sourceId: 'n1', targetId: 'n2', type: 'apoyo' },
      { id: 'c2', sourceId: 'n1', targetId: 'n3', type: 'apoyo' },
    ];

    const stats = getGraphStats(nodes, connections);
    expect(stats.totalNotes).toBe(4);
    expect(stats.totalConnections).toBe(2);
    expect(stats.orphanedNodes).toHaveLength(1);
    expect(stats.orphanedNodes[0].id).toBe('n4');
    expect(stats.hubs[0].node.id).toBe('n1');
    expect(stats.hubs[0].connectionCount).toBe(2);
  });

  it('syncs wikilinks with physics connections without duplicating existing ones', () => {
    const nodes: NodeMeta[] = [
      { id: 'n1', title: 'Nota A', content: 'Mira [[Nota B]]', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
      { id: 'n2', title: 'Nota B', content: '', tags: [], category: 'idea', initialX: 0, initialY: 0, width: 200, height: 100, createdAt: 1 },
    ];

    const currentConns: Connection[] = [];
    const synced = syncWikilinksWithConnections(nodes, currentConns);

    expect(synced).toHaveLength(1);
    expect(synced[0].sourceId).toBe('n1');
    expect(synced[0].targetId).toBe('n2');

    // Running again shouldn't duplicate
    const syncedAgain = syncWikilinksWithConnections(nodes, synced);
    expect(syncedAgain).toHaveLength(1);
  });
});
