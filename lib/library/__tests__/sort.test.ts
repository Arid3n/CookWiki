import { sortFoods } from '../sort';
import { Food } from '../types';

const food = (id: string, o: Partial<Food> = {}): Food => ({
  id, kind: 'dish', name: id, pinned: false, tags: [], variants: [], updatedAt: '2026-01-01T00:00:00Z', ...o,
});

describe('sortFoods', () => {
  it('puts pinned first, then newest updatedAt', () => {
    const out = sortFoods([
      food('old', { updatedAt: '2026-01-01T00:00:00Z' }),
      food('new', { updatedAt: '2026-03-01T00:00:00Z' }),
      food('pinOld', { pinned: true, updatedAt: '2025-01-01T00:00:00Z' }),
      food('pinNew', { pinned: true, updatedAt: '2025-06-01T00:00:00Z' }),
    ]);
    expect(out.map((f) => f.id)).toEqual(['pinNew', 'pinOld', 'new', 'old']);
  });

  it('is stable for equal keys', () => {
    const same = '2026-01-01T00:00:00Z';
    const out = sortFoods([
      food('c', { updatedAt: same }), food('a', { updatedAt: same }),
      food('d', { updatedAt: same }), food('b', { updatedAt: same }),
    ]);
    expect(out.map((f) => f.id)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('sorts invalid or missing updatedAt last without crashing', () => {
    const out = sortFoods([
      food('bad', { updatedAt: 'not-a-date' }),
      food('ok', { updatedAt: '2026-01-01T00:00:00Z' }),
      food('missing', { updatedAt: undefined as unknown as string }),
    ]);
    expect(out.map((f) => f.id)).toEqual(['ok', 'bad', 'missing']);
  });

  it('does not mutate input', () => {
    const input = [food('a', { updatedAt: '2026-01-01T00:00:00Z' }), food('b', { updatedAt: '2026-02-01T00:00:00Z' })];
    const copy = [...input];
    sortFoods(input);
    expect(input).toEqual(copy);
  });
});
