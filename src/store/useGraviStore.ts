import { create } from 'zustand';
import { NodeMeta, Connection } from '../types/node.types';
import { createNodesSlice, NodesSlice } from './slices/nodesSlice';
import { createConnectionsSlice, ConnectionsSlice } from './slices/connectionsSlice';
import { createPhysicsSlice, PhysicsSlice } from './slices/physicsSlice';
import { createViewSlice, ViewSlice } from './slices/viewSlice';

interface GlobalSlice {
  clearCanvas: () => void;
  loadState: (nodes: NodeMeta[], connections: Connection[]) => void;
}

export type GraviStore = NodesSlice & ConnectionsSlice & PhysicsSlice & ViewSlice & GlobalSlice;

export const useGraviStore = create<GraviStore>()((set, get, api) => ({
  ...createNodesSlice(set, get, api),
  ...createConnectionsSlice(set, get, api),
  ...createPhysicsSlice(set, get, api),
  ...createViewSlice(set, get, api),

  // Cross-slice global actions
  clearCanvas: () => {
    set({
      nodes: [],
      connections: [],
      selectedId: null,
      backupDeleted: null,
      searchQuery: '',
      isPresenting: false,
      tourIndex: 0,
      collapsedClusters: [],
    });
  },

  loadState: (nodes, connections) => {
    set({
      nodes,
      connections,
      selectedId: null,
      backupDeleted: null,
      searchQuery: '',
      isPresenting: false,
      tourIndex: 0,
      collapsedClusters: [],
    });
  },
}));
