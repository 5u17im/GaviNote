import { StateCreator } from 'zustand';
import { NodeMeta, Connection } from '../../types/node.types';
import type { GraviStore } from '../useGraviStore';

export interface DeletedNodeBackup {
  node: NodeMeta;
  connections: Connection[];
}

export interface NodesSlice {
  nodes: NodeMeta[];
  selectedId: string | null;
  backupDeleted: DeletedNodeBackup | null;
  searchQuery: string;

  addNode: (node: Omit<NodeMeta, 'id' | 'createdAt'>) => string;
  updateNode: (id: string, patch: Partial<NodeMeta>) => void;
  updateNodesPositions: (positions: { id: string; x: number; y: number }[]) => void;
  removeNode: (id: string) => void;
  recoverNode: () => void;
  selectNode: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const createNodesSlice: StateCreator<GraviStore, [], [], NodesSlice> = (set, get) => ({
  nodes: [],
  selectedId: null,
  backupDeleted: null,
  searchQuery: '',

  addNode: (nodeData) => {
    const id = `node-${Math.random().toString(36).slice(2, 11)}`;
    const newNode: NodeMeta = {
      ...nodeData,
      id,
      createdAt: Date.now(),
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
    return id;
  },

  updateNode: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }));
  },

  updateNodesPositions: (positions) => {
    if (positions.length === 0) return;
    const map = new Map(positions.map((p) => [p.id, p]));
    set((state) => ({
      nodes: state.nodes.map((node) => {
        const p = map.get(node.id);
        return p ? { ...node, initialX: p.x, initialY: p.y } : node;
      }),
    }));
  },

  removeNode: (id) => {
    const { nodes, connections } = get();
    const nodeToRemove = nodes.find((n) => n.id === id);
    if (!nodeToRemove) return;

    // Backup node and associated connections for Undo
    const relatedConnections = connections.filter(
      (c) => c.sourceId === id || c.targetId === id
    );

    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      connections: state.connections.filter((c) => c.sourceId !== id && c.targetId !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      backupDeleted: {
        node: nodeToRemove,
        connections: relatedConnections,
      },
    }));
  },

  recoverNode: () => {
    const { backupDeleted } = get();
    if (!backupDeleted) return;

    set((state) => ({
      nodes: [...state.nodes, backupDeleted.node],
      connections: [...state.connections, ...backupDeleted.connections],
      backupDeleted: null,
    }));
  },

  selectNode: (id) => {
    set({ selectedId: id });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
});
