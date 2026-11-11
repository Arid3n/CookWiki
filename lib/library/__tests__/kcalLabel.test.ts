import { kcalLabel } from '../kcalLabel';
import { Food, Variant } from '../types';

const v = (kcal: number, isDefault = true, o: Partial<Variant> = {}): Variant => ({
  id: `v${kcal}`, foodId: 'f', label: 'Default', isDefault, kcal, protein: 1, carbs: 1, fat: 1, ...o,
});
const food = (variants: Variant[]): Food => ({
  id: 'f', kind: 'dish', name: 'Tzatziki', pinned: false, tags: [], variants, updatedAt: '2026-01-01',
});

describe('kcalLabel', () => {
  it('rounds a single kcal value', () => {
    expect(kcalLabel(food([v(96.4)]))).toBe('96');
  });
  it('shows a range with an en dash when both bounds are set', () => {
    expect(kcalLabel(food([v(100, true, { kcalMin: 80, kcalMax: 120 })]))).toBe('80–120');
  });
  it('shows an em dash when the food has no variants', () => {
    expect(kcalLabel(food([]))).toBe('—');
  });
  it('falls back to rounded kcal when only kcalMin is set', () => {
    expect(kcalLabel(food([v(101.6, true, { kcalMin: 80 })]))).toBe('102');
  });
  it('uses the default variant', () => {
    expect(kcalLabel(food([v(50, false), v(200, true)]))).toBe('200');
  });
});
