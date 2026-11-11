import { findDuplicates, findSavedMentioned, normalizeName } from '../duplicates';
import { Food } from '../types';

const food = (name: string, tags: string[] = []): Food => ({
  id: name, kind: 'dish', name, pinned: false, tags, variants: [], updatedAt: '2026-01-01',
});

describe('normalizeName', () => {
  it('lowercases, strips diacritics, trims', () => {
    expect(normalizeName('  Tzatzíki ')).toBe('tzatziki');
  });
  it('collapses whitespace and strips punctuation', () => {
    expect(normalizeName('Arroz   con,  pollo!')).toBe('arroz con pollo');
  });
});

describe('findDuplicates', () => {
  it('matches plural to singular', () => {
    const f = food('Tomate');
    expect(findDuplicates('tomates', [f])).toEqual([f]);
  });
  it('matches diacritic/case variants', () => {
    const f = food('tzatziki');
    expect(findDuplicates('Tzatzíki', [f])).toEqual([f]);
  });
  it('matches within edit distance 2 for long names', () => {
    const f = food('Lasagna');
    expect(findDuplicates('Lasagne', [f])).toEqual([f]);
  });
  it('does not match clearly different names', () => {
    expect(findDuplicates('paella', [food('Pizza')])).toEqual([]);
  });
  it('does not match short unrelated names', () => {
    expect(findDuplicates('pan', [food('pez')])).toEqual([]);
  });
  it('matches by tag equal to normalized name', () => {
    const f = food('Gazpacho andaluz', ['Salmorejo']);
    expect(findDuplicates('salmorejo', [f])).toEqual([f]);
  });
});

describe('findSavedMentioned', () => {
  it('matches accent/case variants', () => {
    const f = food('tzatziki');
    expect(findSavedMentioned('How many kcal in Tzatzíki?', [f])).toEqual([f]);
  });
  it('tolerates plural differences both ways', () => {
    const a = food('tomate');
    const b = food('Lentejas');
    expect(findSavedMentioned('cuanto tiene Tomates', [a])).toEqual([a]);
    expect(findSavedMentioned('una lenteja', [b])).toEqual([b]);
  });
  it('matches multi-word names as a phrase', () => {
    const f = food('Gazpacho andaluz');
    expect(findSavedMentioned('gazpacho andaluz casero', [f])).toEqual([f]);
    expect(findSavedMentioned('andaluz gazpacho', [f])).toEqual([]);
  });
  it('requires whole words, not substrings', () => {
    expect(findSavedMentioned('I like pizzas rice', [food('zas')])).toEqual([]);
    expect(findSavedMentioned('arrozal', [food('arroz')])).toEqual([]);
  });
  it('ignores names shorter than 3 and does not fuzzy match', () => {
    expect(findSavedMentioned('un pan por favor', [food('pa')])).toEqual([]);
    expect(findSavedMentioned('lasagne', [food('Lasagna')])).toEqual([]);
  });
});
