import { NodeMeta, Connection } from '../types/node.types';

export interface ExtractedWikilink {
  title: string;
  alias?: string;
  raw: string;
}

export interface BacklinksResult {
  incoming: NodeMeta[];
  outgoing: {
    targetTitle: string;
    alias?: string;
    targetNode?: NodeMeta;
    exists: boolean;
  }[];
}

export interface GraphStats {
  totalNotes: number;
  totalConnections: number;
  orphanedNodes: NodeMeta[];
  hubs: { node: NodeMeta; connectionCount: number }[];
}

/**
 * Extracts all [[WikiLinks]] (and [[Target|Alias]]) from markdown or plain text.
 */
export function extractWikilinks(text: string): ExtractedWikilink[] {
  if (!text) return [];

  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const results: ExtractedWikilink[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const title = match[1].trim();
    const alias = match[2]?.trim();

    if (title && !seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      results.push({
        title,
        alias,
        raw,
      });
    }
  }

  return results;
}

/**
 * Finds a node by title (case-insensitive trim match).
 */
export function findNodeByTitle(nodes: NodeMeta[], title: string): NodeMeta | undefined {
  if (!title) return undefined;
  const normalized = title.trim().toLowerCase();
  return nodes.find((n) => n.title.trim().toLowerCase() === normalized);
}

/**
 * Calculates incoming backlinks and outgoing links for a given note.
 */
export function calculateBacklinks(nodes: NodeMeta[], currentNodeId: string): BacklinksResult {
  const currentNode = nodes.find((n) => n.id === currentNodeId);
  if (!currentNode) {
    return { incoming: [], outgoing: [] };
  }

  const currentTitle = currentNode.title.trim().toLowerCase();

  // Incoming: all other nodes whose content or title mentions [[currentTitle]]
  const incoming: NodeMeta[] = nodes.filter((other) => {
    if (other.id === currentNodeId) return false;
    const links = extractWikilinks(`${other.title} ${other.content}`);
    return links.some((l) => l.title.trim().toLowerCase() === currentTitle);
  });

  // Outgoing: all wikilinks in currentNode
  const outgoingLinks = extractWikilinks(`${currentNode.title} ${currentNode.content}`);
  const outgoing = outgoingLinks.map((link) => {
    const targetNode = findNodeByTitle(nodes, link.title);
    return {
      targetTitle: link.title,
      alias: link.alias,
      targetNode,
      exists: Boolean(targetNode),
    };
  });

  return { incoming, outgoing };
}

/**
 * Computes network metrics for the Second Brain (hubs, isolated/orphan notes, connection count).
 */
export function getGraphStats(nodes: NodeMeta[], connections: Connection[]): GraphStats {
  const connectionCounts = new Map<string, number>();

  for (const node of nodes) {
    connectionCounts.set(node.id, 0);
  }

  for (const conn of connections) {
    connectionCounts.set(conn.sourceId, (connectionCounts.get(conn.sourceId) || 0) + 1);
    connectionCounts.set(conn.targetId, (connectionCounts.get(conn.targetId) || 0) + 1);
  }

  const orphanedNodes: NodeMeta[] = [];
  const hubsWithCount: { node: NodeMeta; connectionCount: number }[] = [];

  for (const node of nodes) {
    const count = connectionCounts.get(node.id) || 0;
    if (count === 0) {
      orphanedNodes.push(node);
    } else {
      hubsWithCount.push({ node, connectionCount: count });
    }
  }

  // Sort hubs descending by connection count
  hubsWithCount.sort((a, b) => b.connectionCount - a.connectionCount);

  return {
    totalNotes: nodes.length,
    totalConnections: connections.length,
    orphanedNodes,
    hubs: hubsWithCount,
  };
}

/**
 * Automatically synchronizes [[Wikilinks]] found across notes with physical canvas connections.
 * It adds missing connections for valid wikilinks while preserving existing user-defined connections.
 */
export function syncWikilinksWithConnections(
  nodes: NodeMeta[],
  currentConnections: Connection[]
): Connection[] {
  const updatedConnections = [...currentConnections];

  const hasConnection = (idA: string, idB: string) => {
    return updatedConnections.some(
      (c) =>
        (c.sourceId === idA && c.targetId === idB) ||
        (c.sourceId === idB && c.targetId === idA)
    );
  };

  for (const sourceNode of nodes) {
    const links = extractWikilinks(`${sourceNode.title} ${sourceNode.content}`);
    for (const link of links) {
      const targetNode = findNodeByTitle(nodes, link.title);
      if (targetNode && targetNode.id !== sourceNode.id) {
        if (!hasConnection(sourceNode.id, targetNode.id)) {
          updatedConnections.push({
            id: `conn-wiki-${Math.random().toString(36).slice(2, 9)}`,
            sourceId: sourceNode.id,
            targetId: targetNode.id,
            type: 'apoyo',
            label: '[[enlace]]',
          });
        }
      }
    }
  }

  return updatedConnections;
}
