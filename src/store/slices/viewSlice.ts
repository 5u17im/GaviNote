import { StateCreator } from 'zustand';
import type { GraviStore } from '../useGraviStore';

export interface ViewSlice {
  // Constellations (Idea 1)
  showConstellations: boolean;
  toggleConstellations: () => void;

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

  isPresenting: false,
  tourIndex: 0,

  startPresentation: () => {
    if (get().nodes.length === 0) return;
    set({ isPresenting: true, tourIndex: 0 });
  },

  stopPresentation: () => {
    set({ isPresenting: false });
  },

  nextStep: () => {
    const { tourIndex, nodes } = get();
    set({ tourIndex: Math.min(tourIndex + 1, nodes.length - 1) });
  },

  prevStep: () => {
    const { tourIndex } = get();
    set({ tourIndex: Math.max(tourIndex - 1, 0) });
  },

  goToStep: (index) => {
    const { nodes } = get();
    if (nodes.length === 0) return;
    set({ tourIndex: Math.min(Math.max(index, 0), nodes.length - 1) });
  },
});
