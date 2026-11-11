import { create } from 'zustand';

interface RecipeDraftState {
  pendingIngredient: any | null;
  setPendingIngredient: (ing: any | null) => void;
}

export const useRecipeDraftStore = create<RecipeDraftState>((set) => ({
  pendingIngredient: null,
  setPendingIngredient: (ing) => set({ pendingIngredient: ing }),
}));
