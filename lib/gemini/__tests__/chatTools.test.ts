import { InvalidSaveError, SAVE_FOOD_TOOL, buildChatSystemPrompt, parseSaveFoodArgs } from '../chatTools';

const base = { name: 'Tzatziki', kind: 'dish', macros: { kcal: 96, protein: 4, carbs: 4, fat: 7 } };
const withMacros = (m: Record<string, unknown>) => ({ ...base, macros: m });

describe('parseSaveFoodArgs', () => {
  it('accepts the tzatziki example', () => {
    const r = parseSaveFoodArgs({ ...base, variantLabel: 'Low oil', tags: ['dip'] });
    expect(r.name).toBe('Tzatziki');
    expect(r.macros.kcal).toBe(96);
    expect(r.variantLabel).toBe('Low oil');
  });
  it('rejects negative protein', () => {
    expect(() => parseSaveFoodArgs(withMacros({ kcal: 96, protein: -4, carbs: 4, fat: 7 }))).toThrow(InvalidSaveError);
  });
  it('rejects missing kcal', () => {
    expect(() => parseSaveFoodArgs(withMacros({ protein: 4, carbs: 4, fat: 7 }))).toThrow(InvalidSaveError);
  });
  it('rejects a string where a number is expected', () => {
    expect(() => parseSaveFoodArgs(withMacros({ kcal: '96', protein: 4, carbs: 4, fat: 7 }))).toThrow(InvalidSaveError);
  });
  it('rejects non-finite values', () => {
    expect(() => parseSaveFoodArgs(withMacros({ kcal: 96, protein: Infinity, carbs: 4, fat: 7 }))).toThrow(InvalidSaveError);
  });
  it('rejects kcal far from Atwater', () => {
    expect(() => parseSaveFoodArgs(withMacros({ kcal: 900, protein: 1, carbs: 1, fat: 1 }))).toThrow(InvalidSaveError);
  });
  it('skips the Atwater check at 50 kcal or below', () => {
    expect(() => parseSaveFoodArgs(withMacros({ kcal: 40, protein: 0, carbs: 0, fat: 0 }))).not.toThrow();
  });
  it('rejects a bad kind or empty name', () => {
    expect(() => parseSaveFoodArgs({ ...base, kind: 'meal' })).toThrow(InvalidSaveError);
    expect(() => parseSaveFoodArgs({ ...base, name: '  ' })).toThrow(InvalidSaveError);
  });
  it('rejects non-object input', () => {
    expect(() => parseSaveFoodArgs(null)).toThrow(InvalidSaveError);
  });
});

describe('parseSaveFoodArgs kcal range', () => {
  const range = (extra: Record<string, unknown>) => parseSaveFoodArgs(withMacros({ kcal: 96, protein: 4, carbs: 4, fat: 7, ...extra })).macros;
  it('keeps a complete range that brackets kcal', () => {
    const m = range({ kcalMin: 80, kcalMax: 110 });
    expect([m.kcalMin, m.kcalMax]).toEqual([80, 110]);
  });
  it('keeps a range touching kcal', () => {
    const m = range({ kcalMin: 96, kcalMax: 96 });
    expect([m.kcalMin, m.kcalMax]).toEqual([96, 96]);
  });
  it('drops a half range', () => {
    expect(range({ kcalMin: 80 })).not.toHaveProperty('kcalMin');
    expect(range({ kcalMax: 110 })).not.toHaveProperty('kcalMax');
  });
  it('drops an inverted or non-bracketing range without throwing', () => {
    for (const r of [{ kcalMin: 110, kcalMax: 80 }, { kcalMin: 100, kcalMax: 120 }, { kcalMin: 60, kcalMax: 90 }]) {
      const m = range(r);
      expect(m).not.toHaveProperty('kcalMin');
      expect(m).not.toHaveProperty('kcalMax');
    }
  });
});

describe('buildChatSystemPrompt', () => {
  it('tells the model to say a library food is already saved', () => {
    expect(buildChatSystemPrompt(['Rice'])).toMatch(/already saved instead of estimating/);
  });
  it('mentions per 100 g, save_food and library names', () => {
    const p = buildChatSystemPrompt(['Tzatziki', 'Rice']);
    expect(p).toMatch(/100 g/);
    expect(p).toMatch(/save_food/);
    expect(p).toMatch(/Tzatziki, Rice/);
  });
  it('describes the focused food', () => {
    const p = buildChatSystemPrompt([], { id: 'f1', kind: 'dish', name: 'Hummus', pinned: false, tags: [], variants: [], updatedAt: '' });
    expect(p).toMatch(/Hummus/);
  });
});

it('declares the save_food tool', () => {
  expect(SAVE_FOOD_TOOL.name).toBe('save_food');
});
