import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastError: string | null;
  setSyncing: (isSyncing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastError: null,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setError: (error) => set({ lastError: error }),
}));
