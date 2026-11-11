import { callGemini, GeminiBlockedError, GeminiHttpError, MissingKeyError } from '../client';
import { getGeminiConfig, setGeminiKey, setGeminiModel } from '../config';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

const FAKE_KEY = 'test-key-not-real';
const fetchMock = jest.fn();
const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const userContent = [{ role: 'user' as const, parts: [{ text: 'hi' }] }];

beforeEach(() => {
  mockStore.clear();
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

describe('config', () => {
  it('defaults', async () => {
    expect(await getGeminiConfig()).toEqual({ apiKey: null, model: 'gemini-2.5-flash' });
  });
  it('trims and stores; blank key is null', async () => {
    await setGeminiKey('  abc  ');
    await setGeminiModel(' gemini-x ');
    expect(await getGeminiConfig()).toEqual({ apiKey: 'abc', model: 'gemini-x' });
    mockStore.set('gemini_api_key', '   ');
    mockStore.set('gemini_model', '  ');
    expect(await getGeminiConfig()).toEqual({ apiKey: null, model: 'gemini-2.5-flash' });
  });
  it('empty key deletes', async () => {
    await setGeminiKey('abc');
    await setGeminiKey('');
    expect(mockStore.has('gemini_api_key')).toBe(false);
  });
});

describe('callGemini', () => {
  it('throws MissingKeyError without fetching', async () => {
    await expect(callGemini({ contents: userContent })).rejects.toBeInstanceOf(MissingKeyError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends key in header, not URL; builds body', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue(okJson({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] }));
    const r = await callGemini({ system: 'sys', contents: userContent, responseSchema: { type: 'OBJECT' } });
    expect(r).toEqual({ text: 'ab' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain(FAKE_KEY);
    expect(url).not.toContain('key=');
    expect(init.method).toBe('POST');
    expect(init.headers['x-goog-api-key']).toBe(FAKE_KEY);
    const body = JSON.parse(init.body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'sys' }] });
    expect(body.contents).toEqual(userContent);
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseSchema: { type: 'OBJECT' } });
    expect(body.tools).toBeUndefined();
  });

  it('omits generationConfig/system without schema', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue(okJson({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }));
    await callGemini({ contents: userContent });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig).toBeUndefined();
    expect(body.systemInstruction).toBeUndefined();
  });

  it('returns functionCall', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue(
      okJson({ candidates: [{ content: { parts: [{ functionCall: { name: 'f', args: { a: 1 } } }] } }] }),
    );
    const r = await callGemini({ contents: userContent, tools: [{ functionDeclarations: [] }] });
    expect(r.functionCall).toEqual({ name: 'f', args: { a: 1 } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools).toEqual([{ functionDeclarations: [] }]);
  });

  it('429 throws GeminiHttpError without key', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'quota ' + 'x'.repeat(400) } }),
      text: async () => '',
    });
    const err = await callGemini({ contents: userContent }).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiHttpError);
    expect(err.status).toBe(429);
    expect(err.message).toContain('429');
    expect(err.message).not.toContain(FAKE_KEY);
    expect(err.message.length).toBeLessThan(330);
  });

  it('non-JSON error body still throws GeminiHttpError', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('bad json');
      },
      text: async () => 'oops',
    });
    const err = await callGemini({ contents: userContent }).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiHttpError);
    expect(err.status).toBe(500);
  });

  it('no candidates throws GeminiBlockedError', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockResolvedValue(okJson({ promptFeedback: { blockReason: 'SAFETY' } }));
    const err = await callGemini({ contents: userContent }).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiBlockedError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('SAFETY');
  });

  it('network error propagates', async () => {
    await setGeminiKey(FAKE_KEY);
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(callGemini({ contents: userContent })).rejects.toThrow('Network request failed');
  });
});
