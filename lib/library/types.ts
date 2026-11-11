export type FoodKind = 'dish' | 'single';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat?: number;
  sugar?: number;
  fiber?: number;
  sodiumMg?: number;
}

export interface Variant extends Macros {
  id: string;
  foodId: string;
  label: string;
  isDefault: boolean;
  kcalMin?: number;
  kcalMax?: number;
  confidence?: 'low' | 'medium' | 'high';
  ingredients?: { name: string; grams?: number }[];
}

export interface Food {
  id: string;
  kind: FoodKind;
  name: string;
  pinned: boolean;
  tags: string[];
  variants: Variant[];
  updatedAt: string;
}

export interface SearchFilters {
  text?: string;
  kind?: FoodKind;
  tags?: string[];
  maxKcal?: number;
  minProtein?: number;
  maxCarbs?: number;
  maxFat?: number;
}
