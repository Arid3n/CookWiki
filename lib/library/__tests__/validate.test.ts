import { parseMacroValue, withRangeReset } from '../validate';

describe('parseMacroValue', () => {
  it('parses dot and comma decimals', () => {
    expect(parseMacroValue('12.5')).toBe(12.5);
    expect(parseMacroValue(' 12,5 ')).toBe(12.5);
  });
  it('allows zero', () => {
    expect(parseMacroValue('0')).toBe(0);
  });
  it('rejects empty, negative, non-numeric, non-finite', () => {
    expect(parseMacroValue('')).toBeNull();
    expect(parseMacroValue('  ')).toBeNull();
    expect(parseMacroValue('-1')).toBeNull();
    expect(parseMacroValue('abc')).toBeNull();
    expect(parseMacroValue('1.2.3')).toBeNull();
    expect(parseMacroValue('Infinity')).toBeNull();
    expect(parseMacroValue('1e999')).toBeNull();
    expect(parseMacroValue('NaN')).toBeNull();
  });
});

describe('withRangeReset', () => {
  it('clears the range when kcal changed', () => {
    expect(withRangeReset({ kcal: 220, protein: 5 }, 150)).toEqual({ kcal: 220, protein: 5, kcalMin: null, kcalMax: null });
  });
  it('leaves the patch alone when kcal is unchanged', () => {
    const p = { kcal: 150, protein: 6 };
    expect(withRangeReset(p, 150)).toEqual({ kcal: 150, protein: 6 });
  });
  it('leaves the patch alone when kcal is absent', () => {
    expect(withRangeReset<{ kcal?: number; protein: number }>({ protein: 6 }, 150)).toEqual({ protein: 6 });
  });
});
