import { callGemini } from '../client';
import { InvalidSaveError } from '../chatTools';
import { scanLabel } from '../scanLabel';

jest.mock('../client', () => ({ callGemini: jest.fn() }));
const mockCall = callGemini as jest.Mock;

const good = {
  name: 'Cottage cheese',
  kind: 'single',
  macros: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, sugar: 3.4 },
  confidence: 'high',
};

beforeEach(() => mockCall.mockReset());

describe('scanLabel', () => {
  it('parses a JSON response into SaveFoodArgs', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify(good) });
    const r = await scanLabel('AAAA', 'image/jpeg');
    expect(r.name).toBe('Cottage cheese');
    expect(r.kind).toBe('single');
    expect(r.macros.kcal).toBe(98);
  });

  it('throws InvalidSaveError on a negative value', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify({ ...good, macros: { ...good.macros, protein: -1 } }) });
    await expect(scanLabel('AAAA', 'image/jpeg')).rejects.toThrow(InvalidSaveError);
  });

  it('throws InvalidSaveError on non-JSON or empty text', async () => {
    mockCall.mockResolvedValue({ text: 'not json' });
    await expect(scanLabel('AAAA', 'image/jpeg')).rejects.toThrow(InvalidSaveError);
    mockCall.mockResolvedValue({});
    await expect(scanLabel('AAAA', 'image/jpeg')).rejects.toThrow(InvalidSaveError);
  });

  it('sends the image as an inlineData part with a response schema and per-100 g prompt', async () => {
    mockCall.mockResolvedValue({ text: JSON.stringify(good) });
    await scanLabel('AAAA', 'image/png');
    const req = mockCall.mock.calls[0][0];
    const parts = req.contents[0].parts;
    expect(parts).toContainEqual({ inlineData: { mimeType: 'image/png', data: 'AAAA' } });
    expect(JSON.stringify(req.system + JSON.stringify(parts))).toMatch(/per 100 g/);
    expect(JSON.stringify(req.system + JSON.stringify(parts))).toMatch(/serving size/);
    expect(req.responseSchema.properties.macros).toBeDefined();
    expect(req.tools).toBeUndefined();
  });

  describe('per-100 g plausibility', () => {
    const say = (macros: Record<string, number>) =>
      mockCall.mockResolvedValue({ text: JSON.stringify({ ...good, macros }) });
    const PER = /per-serving values/;
    it.each([
      ['unconverted label', { kcal: 1000, protein: 10, carbs: 250, fat: 0 }],
      ['macro sum over 105', { kcal: 800, protein: 40, carbs: 40, fat: 40 }],
      ['kcal over 900', { kcal: 950, protein: 0, carbs: 0, fat: 100 }],
      ['satFat over 100', { kcal: 400, protein: 0, carbs: 0, fat: 44, satFat: 101 }],
      ['sugar over 100', { kcal: 200, protein: 0, carbs: 50, fat: 0, sugar: 101 }],
      ['fiber over 100', { kcal: 200, protein: 0, carbs: 50, fat: 0, fiber: 101 }],
    ])('rejects %s', async (_n, macros) => {
      say(macros);
      await expect(scanLabel('AAAA', 'image/jpeg')).rejects.toThrow(PER);
    });
    it('accepts tzatziki-like and butter-like foods', async () => {
      say({ kcal: 96, protein: 4, carbs: 4, fat: 7 });
      await expect(scanLabel('AAAA', 'image/jpeg')).resolves.toBeDefined();
      say({ kcal: 717, protein: 0.9, carbs: 0.1, fat: 81, satFat: 51 });
      await expect(scanLabel('AAAA', 'image/jpeg')).resolves.toBeDefined();
    });
    it('uses scan wording for the Atwater mismatch', async () => {
      say({ kcal: 900, protein: 1, carbs: 1, fat: 1 });
      const e = await scanLabel('AAAA', 'image/jpeg').catch((x) => x);
      expect(e).toBeInstanceOf(InvalidSaveError);
      expect(e.message).toMatch(/Retake the photo/);
      expect(e.message).not.toMatch(/Ask again/);
    });
  });
});
