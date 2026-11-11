import { InvalidSaveError, SAVE_FOOD_TOOL, SaveFoodArgs, parseSaveFoodArgs } from './chatTools';
import { callGemini } from './client';

const SYSTEM = [
  'You read nutrition labels from a photo for the CookWiki food library.',
  'Return one JSON object with the same fields as the save_food tool.',
  'All values must be per 100 g, in grams (kcal for energy, sodium in mg). Never use per-serving, cups or ounces.',
  'If the label has a per-100 g column, use it. Otherwise find the stated serving size in grams and convert: value / serving size in grams * 100.',
  'Use the product name as printed on the label for "name".',
  'Set kind to "dish" for a finished product (for example pizza, ready meal, soup) and "single" for a single item (for example cottage cheese, rice, an apple).',
  'Set confidence to "low" if the label is blurry, partly hidden or you had to guess.',
  'Leave out optional fields you cannot read; do not invent numbers.',
].join('\n');

/**
 * Reads a nutrition label image (base64, never stored) and returns per-100 g values.
 * Throws InvalidSaveError when the answer is unusable; transport errors propagate from callGemini.
 */
export async function scanLabel(base64: string, mimeType: string): Promise<SaveFoodArgs> {
  const res = await callGemini({
    system: SYSTEM,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Read this nutrition label. Give all values per 100 g, converting from the serving size if needed.' },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    responseSchema: SAVE_FOOD_TOOL.parameters,
  });
  if (!res.text) throw new InvalidSaveError('The label could not be read, so nothing was saved. Try a clearer photo.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    throw new InvalidSaveError('The label could not be read, so nothing was saved. Try a clearer photo.');
  }
  let args: SaveFoodArgs;
  try {
    args = parseSaveFoodArgs(parsed);
  } catch (e) {
    // Chat tells the user to "ask again"; on the scan screen the fix is a new photo.
    if (e instanceof InvalidSaveError) {
      throw new InvalidSaveError(
        e.message.replace('Ask again for corrected numbers.', 'Retake the photo so the label is clear.'),
      );
    }
    throw e;
  }
  assertPer100g(args);
  return args;
}

const PER_SERVING_MESSAGE =
  'These look like per-serving values, not per 100 g, so nothing was saved. Retake the photo so the per-100 g column is visible.';

/** Per 100 g of any food cannot exceed these; a breach means the label was never converted. */
function assertPer100g({ macros: m }: SaveFoodArgs): void {
  const grams = [m.protein, m.carbs, m.fat, m.satFat, m.sugar, m.fiber];
  if (
    m.protein + m.carbs + m.fat > 105 ||
    grams.some((g) => g !== undefined && g > 100) ||
    m.kcal > 900
  ) {
    throw new InvalidSaveError(PER_SERVING_MESSAGE);
  }
}
