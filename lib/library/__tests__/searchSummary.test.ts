import { describeFilters, hasStructure, mergeTags, wordCount } from '../searchSummary';

describe('searchSummary', () => {
  it('describes filters on one line', () => {
    expect(describeFilters({ minProtein: 20, maxKcal: 400, tags: ['dinner'] })).toBe(
      'Min protein 20 g · Max 400 kcal · dinner',
    );
  });
  it('describes kind, text, carbs and fat', () => {
    expect(describeFilters({ text: 'pollo', kind: 'dish', maxCarbs: 10, maxFat: 5 })).toBe(
      '"pollo" · dishes · Max carbs 10 g · Max fat 5 g',
    );
  });
  it('hasStructure ignores text-only', () => {
    expect(hasStructure({ text: 'x' })).toBe(false);
    expect(hasStructure({ maxFat: 0 })).toBe(true);
  });
  it('counts words', () => {
    expect(wordCount('  a  b ')).toBe(2);
    expect(wordCount('')).toBe(0);
  });
  it('merges tags case/accent-insensitively', () => {
    expect(mergeTags(['Dinner'], ['dinner', 'Café', 'cafe'])).toEqual(['Dinner', 'Café']);
  });
});
