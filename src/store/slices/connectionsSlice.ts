import { StateCreator } from 'zustand';
import { Connection, ConnectionType } from '../../types/node.types';
import type { GraviStore } from '../useGraviStore';

export interface ConnectionsSlice {
  connections: Connection[];

  addConnection: (sourceId: string, targetId: string, type?: ConnectionType) => string | null;
  removeConnection: (id: string) => void;
  cycleConnection: (id: string) => void; // Neutro -> Apoyo -> Conflicto -> Neutro
}

export const createConnectionsSlice: StateCreator<GraviStore, [], [], ConnectionsSlice> = (set, get) => ({
  connections: [],

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

    const id = `conn-${Math.random().toString(36).slice(2, 11)}`;
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
});
