import { applyFilters, defaultVariant } from '../search';
import { Food, Variant } from '../types';

const v = (foodId: string, kcal: number, isDefault = true, extra: Partial<Variant> = {}): Variant => ({
  id: `${foodId}-${kcal}`, foodId, label: 'x', isDefault, kcal, protein: 10, carbs: 20, fat: 5, ...extra,
});
const food = (id: string, o: Partial<Food> = {}): Food => ({
  id, kind: 'dish', name: id, pinned: false, tags: [], variants: [v(id, 300)], updatedAt: '2026-01-01', ...o,
});

describe('defaultVariant', () => {
  it('returns isDefault variant', () => {
    const f = food('a', { variants: [v('a', 100, false), v('a', 200, true)] });
    expect(defaultVariant(f).kcal).toBe(200);
  });
  it('falls back to first', () => {
    const f = food('a', { variants: [v('a', 100, false), v('a', 200, false)] });
    expect(defaultVariant(f).kcal).toBe(100);
  });
  it('throws when no variants', () => {
    expect(() => defaultVariant(food('a', { variants: [] }))).toThrow(/no variants/i);
  });
});

describe('applyFilters', () => {
  it('returns all for empty filters', () => {
    const fs = [food('a'), food('b')];
    expect(applyFilters(fs, {})).toHaveLength(2);
  });
  it('filters by kind', () => {
    const fs = [food('a'), food('b', { kind: 'single' })];
    expect(applyFilters(fs, { kind: 'single' }).map((f) => f.id)).toEqual(['b']);
  });
  it('filters maxKcal against default variant', () => {
    const fs = [
      food('a', { variants: [v('a', 900, false), v('a', 200, true)] }),
      food('b', { variants: [v('b', 500)] }),
    ];
    expect(applyFilters(fs, { maxKcal: 300 }).map((f) => f.id)).toEqual(['a']);
  });
  it('filters minProtein, maxCarbs, maxFat', () => {
    const fs = [
      food('a', { variants: [v('a', 100, true, { protein: 30, carbs: 5, fat: 2 })] }),
      food('b'),
    ];
    expect(applyFilters(fs, { minProtein: 20 }).map((f) => f.id)).toEqual(['a']);
    expect(applyFilters(fs, { maxCarbs: 10 }).map((f) => f.id)).toEqual(['a']);
    expect(applyFilters(fs, { maxFat: 3 }).map((f) => f.id)).toEqual(['a']);
  });
  it('requires all tags, case-insensitive', () => {
    const fs = [food('a', { tags: ['Vegano', 'rápido'] }), food('b', { tags: ['vegano'] })];
    expect(applyFilters(fs, { tags: ['vegano', 'RAPIDO'] }).map((f) => f.id)).toEqual(['a']);
  });
  it('matches text against name and tags', () => {
    const fs = [food('Tortilla', { name: 'Tortilla', tags: ['huevo'] }), food('Pizza', { name: 'Pizza' })];
    expect(applyFilters(fs, { text: 'tortí' }).map((f) => f.id)).toEqual(['Tortilla']);
    expect(applyFilters(fs, { text: 'torti' }).map((f) => f.id)).toEqual(['Tortilla']);
    expect(applyFilters(fs, { text: 'huevo' }).map((f) => f.id)).toEqual(['Tortilla']);
    expect(applyFilters(fs, { text: 'tortilla huevo' }).map((f) => f.id)).toEqual(['Tortilla']);
    expect(applyFilters(fs, { text: 'tortilla pizza' })).toEqual([]);
  });
  it('sorts pinned first, stable otherwise', () => {
    const fs = [food('a'), food('b', { pinned: true }), food('c'), food('d', { pinned: true })];
    expect(applyFilters(fs, {}).map((f) => f.id)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('does not crash on food without variants', () => {
    const fs = [food('a', { variants: [] }), food('b')];
    expect(applyFilters(fs, {}).map((f) => f.id)).toEqual(['a', 'b']);
    expect(applyFilters(fs, { maxKcal: 1000 }).map((f) => f.id)).toEqual(['b']);
  });
});
