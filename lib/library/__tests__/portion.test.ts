import { parseGrams, scalePortion } from '../portion';

describe('scalePortion', () => {
  const base = { kcal: 96, protein: 4, carbs: 4, fat: 7 };
  it('scales per-100g macros to grams', () => {
    expect(scalePortion(base, 250)).toEqual({ kcal: 240, protein: 10, carbs: 10, fat: 17.5 });
  });
  it('accepts strings with comma decimal', () => {
    expect(scalePortion(base, '180,5')).toEqual({ kcal: 173.3, protein: 7.2, carbs: 7.2, fat: 12.6 });
  });
  it('keeps optional fields undefined when absent', () => {
    const r = scalePortion(base, 100)!;
    expect(r.satFat).toBeUndefined();
    expect(r.sodiumMg).toBeUndefined();
    expect('sugar' in r).toBe(false);
  });
  it('scales optional fields when present', () => {
    expect(scalePortion({ ...base, fiber: 2 }, 50)!.fiber).toBe(1);
  });
  it('returns null for invalid input', () => {
    expect(scalePortion(base, NaN)).toBeNull();
    expect(scalePortion(base, -5)).toBeNull();
    expect(scalePortion(base, 0)).toBeNull();
    expect(scalePortion(base, '')).toBeNull();
    expect(scalePortion(base, 'abc')).toBeNull();
  });
});

describe('parseGrams', () => {
  it('parses comma and dot decimals', () => {
    expect(parseGrams('180,5')).toBe(180.5);
    expect(parseGrams('180.5')).toBe(180.5);
    expect(parseGrams(' 200 ')).toBe(200);
  });
  it('returns null for invalid', () => {
    expect(parseGrams('')).toBeNull();
    expect(parseGrams('-5')).toBeNull();
    expect(parseGrams('abc')).toBeNull();
    expect(parseGrams('0')).toBeNull();
  });
});
