import { NodeMeta, Connection } from '../types/node.types';

export interface Constellation {
  id: number;
  // Stable identifier across re-renders (the lexicographically smallest member
  // id). Used to persist collapse state independently of the volatile numeric id.
  key: string;
  color: string;
  nodeIds: string[];
}

// Soft, distinct hues for the constellation halos. Cycled if there are more
// connected components than colors.
export const CONSTELLATION_COLORS = [
  '#00E5FF',
  '#CE93D8',
  '#FFB74D',
  '#81C784',
  '#4FC3F7',
  '#F06292',
  '#A1887F',
  '#9575CD',
];

/**
 * Groups nodes into "constellations".
 *  - mode 'graph' (default): the connected components of the graph formed by the
 *    connections (union-find).
 *  - mode 'tags': nodes that share at least one tag form a cluster, so you can
 *    organize by theme without having to draw every link.
 *
 * Only clusters with 2+ members are returned (a lone node is not a constellation).
 * Nodes mid-deletion are excluded so a halo/star never follows a body flying into
 * the vortex. Colors are assigned deterministically per cluster.
 */
export function computeConstellations(
  nodes: NodeMeta[],
  connections: Connection[],
  mode: 'graph' | 'tags' = 'graph'
): Constellation[] {
  const liveNodes = nodes.filter((n) => !n.isDeleting);
  const nodeIds = new Set(liveNodes.map((n) => n.id));

  const parent = new Map<string, string>();
  for (const n of liveNodes) parent.set(n.id, n.id);

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  if (mode === 'tags') {
    // Connect every pair of nodes that share a non-empty tag.
    const byTag = new Map<string, string[]>();
    for (const n of liveNodes) {
      for (const tag of n.tags) {
        const t = tag.trim().toLowerCase();
        if (!t) continue;
        const arr = byTag.get(t) ?? [];
        arr.push(n.id);
        byTag.set(t, arr);
      }
    }
    for (const ids of byTag.values()) {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
    }
  } else {
    for (const c of connections) {
      if (nodeIds.has(c.sourceId) && nodeIds.has(c.targetId)) {
        union(c.sourceId, c.targetId);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const root = find(n.id);
    const arr = groups.get(root) ?? [];
    arr.push(n.id);
    groups.set(root, arr);
  }

  const multi = Array.from(groups.values()).filter((ids) => ids.length >= 2);

  // Stable ordering by the lexicographically smallest member id keeps color
  // assignment consistent between renders.
  multi.sort((a, b) => {
    const ka = [...a].sort()[0];
    const kb = [...b].sort()[0];
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return multi.map((ids, i) => ({
    id: i,
    key: [...ids].sort()[0],
    color: CONSTELLATION_COLORS[i % CONSTELLATION_COLORS.length],
    nodeIds: ids,
  }));
}
