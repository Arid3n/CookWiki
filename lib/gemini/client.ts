import { getGeminiConfig } from './config';

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiRequest {
  system?: string;
  contents: GeminiContent[];
  tools?: unknown[];
  responseSchema?: unknown;
  /** Abort the request; surfaces as an AbortError. */
  signal?: AbortSignal;
}

export interface GeminiResult {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

export class MissingKeyError extends Error {
  constructor() {
    super('No Gemini API key set. Add your key in Settings.');
    this.name = 'MissingKeyError';
  }
}

export class GeminiHttpError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(`Gemini request failed (${status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    this.name = 'GeminiHttpError';
    this.status = status;
  }
}

export class GeminiBlockedError extends Error {
  constructor(reason?: string) {
    super(
      `Gemini did not return an answer${reason ? ` (${reason})` : ''}. The request may have been blocked; try rephrasing.`,
    );
    this.name = 'GeminiBlockedError';
  }
}

const TIMEOUT_MS = 60_000;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini(req: GeminiRequest): Promise<GeminiResult> {
  const { apiKey, model } = await getGeminiConfig();
  if (!apiKey) throw new MissingKeyError();

  const body: Record<string, unknown> = { contents: req.contents };
  if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };
  if (req.tools) body.tools = req.tools;
  if (req.responseSchema !== undefined) {
    body.generationConfig = { responseMimeType: 'application/json', responseSchema: req.responseSchema };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  if (req.signal?.aborted) controller.abort();
  else req.signal?.addEventListener('abort', onCallerAbort);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener('abort', onCallerAbort);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      if (typeof j?.error?.message === 'string') detail = j.error.message;
    } catch {
      // body not JSON: status alone is enough
    }
    throw new GeminiHttpError(res.status, detail);
  }

  const json = await res.json();
  const parts: Record<string, any>[] = json?.candidates?.[0]?.content?.parts ?? [];
  if (!json?.candidates?.length) throw new GeminiBlockedError(json?.promptFeedback?.blockReason);

  const result: GeminiResult = {};
  const text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
  if (text) result.text = text;
  const fc = parts.find((p) => p.functionCall)?.functionCall;
  if (fc) result.functionCall = { name: fc.name, args: fc.args ?? {} };
  const reason = json.candidates[0]?.finishReason;
  if (!result.text && !result.functionCall) {
    throw new GeminiBlockedError(reason ?? 'no content');
  }
  if (req.responseSchema !== undefined && reason === 'MAX_TOKENS') {
    throw new GeminiBlockedError('MAX_TOKENS: the answer was cut off');
  }
  return result;
}
