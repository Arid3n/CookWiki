import type { SaveFoodArgs } from '../gemini/chatTools';
import { findDuplicates } from './duplicates';
import { addVariant, createFood } from './repository';
import type { Food } from './types';
import { normalizeTags } from './validate';

export type SaveOutcome =
  | { type: 'created' | 'variant-added'; food: Food }
  | { type: 'duplicate'; existing: Food };

/** Writes need internet: repository errors (OfflineError etc.) propagate and nothing is half-saved. */
export async function saveFromChat(
  args: SaveFoodArgs,
  foods: Food[],
  opts?: { focusFoodId?: string },
): Promise<SaveOutcome> {
  const variant = {
    ...args.macros,
    confidence: args.confidence,
    ingredients: args.ingredients,
  };
  const focus = opts?.focusFoodId ? foods.find((f) => f.id === opts.focusFoodId) : undefined;
  const target = focus ?? (args.variantLabel ? findDuplicates(args.name, foods)[0] : undefined);

  if (target) {
    await addVariant(target.id, { ...variant, label: args.variantLabel ?? 'Variation' });
    return { type: 'variant-added', food: target };
  }
  const existing = findDuplicates(args.name, foods)[0];
  if (existing) return { type: 'duplicate', existing };

  const food = await createFood({
    kind: args.kind,
    name: args.name,
    tags: args.tags ? normalizeTags(args.tags) : undefined,
    variant: { ...variant, label: args.variantLabel },
  });
  return { type: 'created', food };
}
