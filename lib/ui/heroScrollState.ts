import { create } from 'zustand';

/** True once the food page has scrolled its header off the top, so the status bar sits over the dark background. */
export const useHeroScrolledOff = create<{ off: boolean; setOff: (off: boolean) => void }>((set) => ({
  off: false,
  setOff: (off) => set((s) => (s.off === off ? s : { off })),
}));
