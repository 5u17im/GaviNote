import { StateCreator } from 'zustand';
import { PhysicsConfig } from '../../types/node.types';
import type { GraviStore } from '../useGraviStore';

export interface PhysicsSlice {
  physicsConfig: PhysicsConfig;

  setGravity: (val: number) => void;
  setAirFriction: (val: number) => void;
  setMagnetStrength: (val: number) => void;
  setVortexGravity: (val: number) => void;
  setPan: (x: number | ((prev: number) => number), y: number | ((prev: number) => number)) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
}

export const createPhysicsSlice: StateCreator<GraviStore, [], [], PhysicsSlice> = (set) => ({
  physicsConfig: {
    gravity: 0.0,
    airFriction: 0.01,
    magnetStrength: 1.0,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    vortexGravity: 1.0,
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

  setVortexGravity: (val) => {
    set((state) => ({
      physicsConfig: { ...state.physicsConfig, vortexGravity: val },
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
});
