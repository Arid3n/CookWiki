import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface PhysicsState {
  scrollY: number;
  activePan: { x: number; y: number };
  setScrollY: (val: number) => void;
  setActivePan: (x: number, y: number) => void;
}

export const usePhysicsStore = create<PhysicsState>()(
  subscribeWithSelector((set) => ({
    scrollY: 0,
    activePan: { x: 0, y: 0 },
    setScrollY: (val) => set({ scrollY: val }),
    setActivePan: (x, y) => set({ activePan: { x, y } }),
  }))
);
