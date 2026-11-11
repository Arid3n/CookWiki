import { findDuplicates, normalizeName } from '../duplicates';
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
