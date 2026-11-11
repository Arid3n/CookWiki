import { normalizeName } from '../library/duplicates';
import { SearchFilters } from '../library/types';
import { callGemini, MissingKeyError } from './client';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING', description: 'Leftover name keywords (e.g. "chicken"); omit if none.' },
    kind: { type: 'STRING', enum: ['dish', 'single'] },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    maxKcal: { type: 'NUMBER' },
    minProtein: { type: 'NUMBER' },
    maxCarbs: { type: 'NUMBER' },
    maxFat: { type: 'NUMBER' },
  },
};

function buildSystem(knownTags: string[]): string {
  return [
    'You turn a food-library search query into filters. The query may be in Spanish or English.',
    'All nutrition numbers are per 100 g of food: maxKcal (kcal), minProtein, maxCarbs, maxFat (grams). Never per serving.',
    'Fields: text (leftover name keywords), kind ("dish" = finished meal, "single" = single ingredient), tags, maxKcal, minProtein, maxCarbs, maxFat.',
    `Known tags (use only these, exact spelling): ${knownTags.length ? JSON.stringify(knownTags) : '(none)'}.`,
    'Only set a field when the query clearly asks for it. "High protein" means minProtein of about 20.',
    'Reply only with a JSON object matching the schema. Do not invent tags.',
  ].join('\n');
}

const NUMERIC = ['maxKcal', 'minProtein', 'maxCarbs', 'maxFat'] as const;

function sanitize(raw: unknown, knownTags: string[]): SearchFilters {
  const out: SearchFilters = {};
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;

  if (typeof r.text === 'string' && r.text.trim()) out.text = r.text.trim();
  if (r.kind === 'dish' || r.kind === 'single') out.kind = r.kind;
  for (const key of NUMERIC) {
    const v = r[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  if (Array.isArray(r.tags)) {
    const byKey = new Map(knownTags.map((t) => [normalizeName(t), t]));
    const picked: string[] = [];
    for (const t of r.tags) {
      const known = typeof t === 'string' ? byKey.get(normalizeName(t)) : undefined;
      if (known !== undefined && !picked.includes(known)) picked.push(known);
    }
    if (picked.length > 0) out.tags = picked;
  }
  return out;
}

/**
 * Interprets a natural-language query into SearchFilters (nutrition per 100 g).
 * Any Gemini or parsing failure returns `{ text: query }` (plain text search).
 * MissingKeyError is rethrown so the UI can point the user to Settings.
 */
export async function interpretSearch(
  query: string,
  knownTags: string[],
  signal?: AbortSignal,
): Promise<SearchFilters> {
  try {
    const res = await callGemini({
      system: buildSystem(knownTags),
      contents: [{ role: 'user', parts: [{ text: query }] }],
      responseSchema: SCHEMA,
      signal,
    });
    if (!res.text) return { text: query };
    return sanitize(JSON.parse(res.text), knownTags);
  } catch (e) {
    if (e instanceof MissingKeyError) throw e;
    return { text: query };
  }
}
