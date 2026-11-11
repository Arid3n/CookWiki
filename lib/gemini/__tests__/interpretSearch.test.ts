import { callGemini, MissingKeyError } from '../client';
import { interpretSearch } from '../interpretSearch';

jest.mock('../client', () => {
  const actual = jest.requireActual('../client');
  return { ...actual, callGemini: jest.fn() };
});
const mockCall = callGemini as jest.Mock;
const tags = ['dinner', 'Desayuno', 'snack'];

beforeEach(() => mockCall.mockReset());

describe('interpretSearch', () => {
  it('returns the interpreted filters', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ minProtein: 20, maxKcal: 400, tags: ['dinner'] }) });
    expect(await interpretSearch('high protein dinners under 400 kcal', tags)).toEqual({
      minProtein: 20, maxKcal: 400, tags: ['dinner'],
    });
  });

  it('drops a negative number', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ minProtein: 20, maxKcal: -5 }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ minProtein: 20 });
  });

  it('drops non-finite and non-number values', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ maxFat: 'lots', maxCarbs: null, minProtein: 10 }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ minProtein: 10 });
  });

  it('drops unknown fields', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ maxKcal: 300, sugar: 5, foo: 'x' }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ maxKcal: 300 });
  });

  it('restricts tags to known tags, accent/case-insensitive, using the known spelling', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ tags: ['DINNER', 'desayuno', 'invented'] }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ tags: ['dinner', 'Desayuno'] });
  });

  it('omits tags when none are known', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ tags: ['invented'], maxKcal: 100 }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ maxKcal: 100 });
  });

  it('keeps only valid kind', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ kind: 'dish' }) });
    expect(await interpretSearch('a b c', tags)).toEqual({ kind: 'dish' });
    mockCall.mockResolvedValue({ text: JSON.stringify({ kind: 'drink' }) });
    expect(await interpretSearch('a b c', tags)).toEqual({});
  });

  it('falls back to plain text on a Gemini failure', async () => {
    mockCall.mockRejectedValue(new Error('boom'));
    expect(await interpretSearch('high protein dinners', tags)).toEqual({ text: 'high protein dinners' });
  });

  it('falls back to plain text on unparseable output', async () => {
    mockCall.mockResolvedValue({ text: 'not json' });
    expect(await interpretSearch('high protein dinners', tags)).toEqual({ text: 'high protein dinners' });
  });

  it('rethrows MissingKeyError so the UI can hint', async () => {
    mockCall.mockRejectedValue(new MissingKeyError());
    await expect(interpretSearch('a b c', tags)).rejects.toBeInstanceOf(MissingKeyError);
  });

  it('passes the abort signal and a response schema', async () => {
    mockCall.mockResolvedValue({ text: '{}' });
    const ac = new AbortController();
    await interpretSearch('a b c', tags, ac.signal);
    const req = mockCall.mock.calls[0][0];
    expect(req.signal).toBe(ac.signal);
    expect(req.responseSchema).toBeDefined();
  });
});
