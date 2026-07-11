import { create } from 'zustand';
import { NodeMeta, Connection, PhysicsConfig, ConnectionType } from '../types/node.types';

interface DeletedNodeBackup {
  node: NodeMeta;
  connections: Connection[];
}

interface GraviStore {
  // State
  nodes: NodeMeta[];
  connections: Connection[];
  selectedId: string | null;
  physicsConfig: PhysicsConfig;
  backupDeleted: DeletedNodeBackup | null;

  // Node Actions
  addNode: (node: Omit<NodeMeta, 'id' | 'createdAt'>) => string;
  updateNode: (id: string, patch: Partial<NodeMeta>) => void;
  removeNode: (id: string) => void;
  recoverNode: () => void;
  selectNode: (id: string | null) => void;

  // Connection Actions
  addConnection: (sourceId: string, targetId: string, type?: ConnectionType) => string | null;
  removeConnection: (id: string) => void;
  cycleConnection: (id: string) => void; // Neutro -> Apoyo -> Conflicto -> Neutro

  // Physics Actions
  setGravity: (val: number) => void;
  setAirFriction: (val: number) => void;
  setMagnetStrength: (val: number) => void;
  setPan: (x: number | ((prev: number) => number), y: number | ((prev: number) => number)) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  clearCanvas: () => void;

  // Bulk Actions
  loadState: (nodes: NodeMeta[], connections: Connection[]) => void;
}

export const useGraviStore = create<GraviStore>((set, get) => ({
  nodes: [],
  connections: [],
  selectedId: null,
  physicsConfig: {
    gravity: 0.0,
    airFriction: 0.01,
    magnetStrength: 1.0,
    zoom: 1.0,
    panX: 0,
    panY: 0,
  },
  backupDeleted: null,

  addNode: (nodeData) => {
    const id = `node-${Math.random().toString(36).substr(2, 9)}`;
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

  addConnection: (sourceId, targetId, type = 'neutra') => {
    if (sourceId === targetId) return null;

    // Prevent duplicate connections
    const { connections } = get();
    const exists = connections.some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId)
    );
    if (exists) return null;

    const id = `conn-${Math.random().toString(36).substr(2, 9)}`;
    const newConnection: Connection = {
      id,
      sourceId,
      targetId,
      type,
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
    }));
    return id;
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
  },

  cycleConnection: (id) => {
    const types: ConnectionType[] = ['neutra', 'apoyo', 'conflicto'];
    set((state) => ({
      connections: state.connections.map((c) => {
        if (c.id === id) {
          const currentIndex = types.indexOf(c.type);
          const nextIndex = (currentIndex + 1) % types.length;
          return { ...c, type: types[nextIndex] };
        }
        return c;
      }),
    }));
  },

  setGravity: (val) => {
    set((state) => ({
      physicsConfig: { ...state.physicsConfig, gravity: val },
    }));
  },

  setAirFriction: (val) => {
    set((state) => ({
      physicsConfig: { ...state.physicsConfig, airFriction: val },
    }));
  },

  setMagnetStrength: (val) => {
    set((state) => ({
      physicsConfig: { ...state.physicsConfig, magnetStrength: val },
    }));
  },

  setPan: (x, y) => {
    set((state) => {
      const panX = typeof x === 'function' ? x(state.physicsConfig.panX) : x;
      const panY = typeof y === 'function' ? y(state.physicsConfig.panY) : y;
      return {
        physicsConfig: { ...state.physicsConfig, panX, panY },
      };
    });
  },

  setZoom: (zoomVal) => {
    set((state) => {
      const zoom = typeof zoomVal === 'function' ? zoomVal(state.physicsConfig.zoom) : zoomVal;
      // Clamp zoom between 0.15 and 3.0
      const clampedZoom = Math.min(Math.max(zoom, 0.15), 3.0);
      return {
        physicsConfig: { ...state.physicsConfig, zoom: clampedZoom },
      };
    });
  },

  clearCanvas: () => {
    set({
      nodes: [],
      connections: [],
      selectedId: null,
      backupDeleted: null,
    });
  },

  loadState: (nodes, connections) => {
    set({
      nodes,
      connections,
      selectedId: null,
      backupDeleted: null,
    });
  },
}));
