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
});
