import { StateCreator } from 'zustand';
import type { GraviStore } from '../useGraviStore';

export interface CollapsedCluster {
  // Stable key (lexicographically smallest member id at collapse time).
  key: string;
  // Frozen member ids captured when the cluster was collapsed. Keeping them
  // fixed means deleting a member later doesn't drop or re-shape the star.
  nodeIds: string[];
}

export interface ViewSlice {
  // Constellations (Idea 1)
  showConstellations: boolean;
  toggleConstellations: () => void;
  // Collapsed constellations, with a frozen member list per cluster.
  collapsedClusters: CollapsedCluster[];
  toggleCollapse: (key: string, nodeIds: string[]) => void;
  expandAll: () => void;
  // Presentation / guided tour (Idea 3)
  isPresenting: boolean;
  tourIndex: number;
  startPresentation: () => void;
  stopPresentation: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

export const createViewSlice: StateCreator<GraviStore, [], [], ViewSlice> = (set, get) => ({
  showConstellations: true,
  toggleConstellations: () => {
    set((state) => ({ showConstellations: !state.showConstellations }));
  },

  collapsedClusters: [],
  toggleCollapse: (key, nodeIds) => {
    set((state) => {
      const existing = state.collapsedClusters.find((c) => c.key === key);
      if (existing) {
        return { collapsedClusters: state.collapsedClusters.filter((c) => c.key !== key) };
      }
      return { collapsedClusters: [...state.collapsedClusters, { key, nodeIds }] };
    });
  },
  expandAll: () => {
    set({ collapsedClusters: [] });
  },

  isPresenting: false,
  tourIndex: 0,

  startPresentation: () => {
    if (get().nodes.length === 0) return;
    // Expand everything so the tour can frame every node.
    set({ isPresenting: true, tourIndex: 0, collapsedClusters: [] });
  },

  stopPresentation: () => {
    set({ isPresenting: false });
  },

  nextStep: () => {
    const { tourIndex, nodes } = get();
    const total = nodes.filter((n) => !n.isDeleting).length;
    set({ tourIndex: Math.min(tourIndex + 1, Math.max(total - 1, 0)) });
  },

  prevStep: () => {
    const { tourIndex } = get();
    set({ tourIndex: Math.max(tourIndex - 1, 0) });
  },

  goToStep: (index) => {
    const { nodes } = get();
    const total = nodes.filter((n) => !n.isDeleting).length;
    if (total === 0) return;
    set({ tourIndex: Math.min(Math.max(index, 0), total - 1) });
  },
});
