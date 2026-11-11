import type { Food, FoodKind, Variant } from '../library/types';

export class InvalidSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSaveError';
  }
}

export interface SaveFoodArgs {
  name: string;
  kind: FoodKind;
  variantLabel?: string;
  macros: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    satFat?: number;
    sugar?: number;
    fiber?: number;
    sodiumMg?: number;
    kcalMin?: number;
    kcalMax?: number;
  };
  confidence?: Variant['confidence'];
  ingredients?: { name: string; grams?: number }[];
  tags?: string[];
}

const NUM = { type: 'NUMBER' };

export const SAVE_FOOD_TOOL = {
  name: 'save_food',
  description:
    'Save a food or dish to the user library. Call only when the user asks to save. All numbers are per 100 g.',
  parameters: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Food name; reuse an existing library name when it is the same food.' },
      kind: { type: 'STRING', enum: ['dish', 'single'] },
      variantLabel: { type: 'STRING', description: 'Short label for a variation, e.g. "Low oil".' },
      macros: {
        type: 'OBJECT',
        description: 'Nutrition per 100 g. kcal, protein, carbs and fat in grams (kcal in kcal).',
        properties: {
          kcal: NUM, protein: NUM, carbs: NUM, fat: NUM,
          satFat: NUM, sugar: NUM, fiber: NUM, sodiumMg: NUM, kcalMin: NUM, kcalMax: NUM,
        },
        required: ['kcal', 'protein', 'carbs', 'fat'],
      },
      confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
      ingredients: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' }, grams: NUM },
          required: ['name'],
        },
      },
      tags: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['name', 'kind', 'macros'],
  },
};

const REQUIRED = ['kcal', 'protein', 'carbs', 'fat'] as const;
const OPTIONAL = ['satFat', 'sugar', 'fiber', 'sodiumMg', 'kcalMin', 'kcalMax'] as const;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

function checkNumber(m: Record<string, unknown>, key: string, required: boolean): number | undefined {
  const v = m[key];
  if (v === undefined || v === null) {
    if (required) throw new InvalidSaveError(`The numbers for "${key}" are missing, so nothing was saved.`);
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new InvalidSaveError(`The value for "${key}" is not a valid number, so nothing was saved.`);
  }
  if (v < 0) throw new InvalidSaveError(`The value for "${key}" is negative, so nothing was saved.`);
  return v;
}

export function parseSaveFoodArgs(args: unknown): SaveFoodArgs {
  if (!isObj(args)) throw new InvalidSaveError('The save request was malformed, so nothing was saved.');
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  if (!name) throw new InvalidSaveError('The save request had no food name, so nothing was saved.');
  if (args.kind !== 'dish' && args.kind !== 'single') {
    throw new InvalidSaveError('The save request had an unknown food type, so nothing was saved.');
  }
  if (!isObj(args.macros)) throw new InvalidSaveError('The save request had no nutrition numbers, so nothing was saved.');

  const m = args.macros;
  const macros = {} as SaveFoodArgs['macros'];
  for (const k of REQUIRED) macros[k] = checkNumber(m, k, true) as number;
  for (const k of OPTIONAL) {
    const v = checkNumber(m, k, false);
    if (v !== undefined) macros[k] = v;
  }
  if (macros.kcal > 50) {
    const atwater = 4 * macros.protein + 4 * macros.carbs + 9 * macros.fat;
    if (Math.abs(macros.kcal - atwater) > 0.35 * Math.max(atwater, 1)) {
      throw new InvalidSaveError(
        `The calories (${macros.kcal}) do not match the protein, carbs and fat (about ${Math.round(atwater)}), so nothing was saved. Ask again for corrected numbers.`,
      );
    }
  }

  const out: SaveFoodArgs = { name, kind: args.kind, macros };
  if (typeof args.variantLabel === 'string' && args.variantLabel.trim()) out.variantLabel = args.variantLabel.trim();
  if (args.confidence === 'low' || args.confidence === 'medium' || args.confidence === 'high') out.confidence = args.confidence;
  if (Array.isArray(args.ingredients)) {
    out.ingredients = args.ingredients
      .filter((i): i is Record<string, unknown> => isObj(i) && typeof i.name === 'string' && i.name.trim() !== '')
      .map((i) => ({
        name: (i.name as string).trim(),
        ...(typeof i.grams === 'number' && Number.isFinite(i.grams) && i.grams >= 0 ? { grams: i.grams } : {}),
      }));
  }
  if (Array.isArray(args.tags)) out.tags = args.tags.filter((t): t is string => typeof t === 'string');
  return out;
}

export function buildChatSystemPrompt(libraryNames: string[], focus?: Food): string {
  const lines = [
    'You are the nutrition assistant inside the CookWiki food library app.',
    'All nutrition values are per 100 g, in grams (kcal for energy, sodium in mg). Never use cups, ounces or per-serving values.',
    'Answer questions about foods and dishes concisely.',
    'Call the save_food tool only when the user asks to save something. Never save on your own.',
    'Preferences such as "low in oil" apply only to that one dish: adapt the amounts for it and save it as a variantLabel (e.g. "Low oil") instead of changing the base dish.',
    'Reuse an existing name from the library list below when the food is the same one.',
    'Reply in the language the user writes in.',
    `Existing library names: ${libraryNames.length ? libraryNames.join(', ') : '(none yet)'}.`,
  ];
  if (focus) {
    lines.push(
      `The user is refining the existing food "${focus.name}" (${focus.kind}). Anything saved is stored as a new variant of it.`,
    );
    const v = focus.variants.find((x) => x.isDefault) ?? focus.variants[0];
    if (v) {
      lines.push(
        `Its default variant "${v.label}" per 100 g: ${v.kcal} kcal, protein ${v.protein} g, carbs ${v.carbs} g, fat ${v.fat} g.`,
      );
    }
  }
  return lines.join('\n');
}
