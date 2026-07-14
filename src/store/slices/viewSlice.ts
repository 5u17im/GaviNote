import { StateCreator } from 'zustand';
import type { GraviStore } from '../useGraviStore';

export interface CollapsedCluster {
  // Stable key (lexicographically smallest member id at collapse time).
  key: string;
  // Frozen member ids captured when the cluster was collapsed. Keeping them
  // fixed means deleting a member later doesn't drop or re-shape the star.
  nodeIds: string[];
}

export type ConstellationMode = 'graph' | 'tags';

export interface ViewState {
  showConstellations: boolean;
  constellationMode: ConstellationMode;
  collapsedClusters: CollapsedCluster[];
}

export interface ViewSlice {
  // Constellations (Idea 1 / 5)
  showConstellations: boolean;
  toggleConstellations: () => void;
  // 'graph' = connected components; 'tags' = nodes sharing a tag form a cluster.
  constellationMode: ConstellationMode;
  setConstellationMode: (mode: ConstellationMode) => void;
  // Frozen membership per collapsed cluster.
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

  // Persistence of the view session (Idea 3)
  loadViewState: (view: Partial<ViewState>) => void;
}

const VIEW_STORAGE_KEY = 'gravinote-view-state';

export const createViewSlice: StateCreator<GraviStore, [], [], ViewSlice> = (set, get) => ({
  showConstellations: true,
  toggleConstellations: () => {
    set((state) => ({ showConstellations: !state.showConstellations }));
  },

  constellationMode: 'graph',
  setConstellationMode: (mode) => {
    set({ constellationMode: mode });
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

  loadViewState: (view) => {
    set((state) => ({
      showConstellations: view.showConstellations ?? state.showConstellations,
      constellationMode: view.constellationMode ?? state.constellationMode,
      collapsedClusters: view.collapsedClusters ?? state.collapsedClusters,
    }));
  },
});

/** Persist just the view session (cheap, independent of the heavy node snapshot). */
export function saveViewState(state: GraviStore) {
  try {
    const view: ViewState = {
      showConstellations: state.showConstellations,
      constellationMode: state.constellationMode,
      collapsedClusters: state.collapsedClusters,
    };
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** Read the persisted view session, or null if absent/corrupt. */
export function loadPersistedViewState(): ViewState | null {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      showConstellations:
        typeof parsed.showConstellations === 'boolean' ? parsed.showConstellations : true,
      constellationMode: parsed.constellationMode === 'tags' ? 'tags' : 'graph',
      collapsedClusters: Array.isArray(parsed.collapsedClusters)
        ? (parsed.collapsedClusters as unknown[])
            .filter((c: unknown): c is CollapsedCluster => {
              if (!c || typeof (c as CollapsedCluster).key !== 'string') return false;
              if (!Array.isArray((c as CollapsedCluster).nodeIds)) return false;
              return true;
            })
            .map((c) => ({ key: c.key, nodeIds: c.nodeIds.filter((n: unknown) => typeof n === 'string') }))
        : [],
    };
  } catch {
    return null;
  }
}
