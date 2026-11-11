import { supabase } from '../supabase';
import { OfflineError, isNetworkError } from './errors';
import { readLocal, replaceLocal, type FoodRow, type VariantRow } from './localDb';
import type { Food, FoodKind, Macros, Variant } from './types';

export type NewVariant = Macros & {
  label?: string;
  kcalMin?: number;
  kcalMax?: number;
  confidence?: Variant['confidence'];
  ingredients?: Variant['ingredients'];
};

export type NewFood = {
  kind: FoodKind;
  name: string;
  tags?: string[];
  variant: NewVariant;
};

const PAGE = 1000;

// Mapping ----------------------------------------------------------------------

const num = (x: unknown): number | undefined =>
  x === null || x === undefined ? undefined : Number(x);

function parseJson<T>(text: unknown, fallback: T): T {
  if (typeof text !== 'string') return (text as T) ?? fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** Remote (PostgREST) row to local row. */
function foodToLocal(r: any): FoodRow {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    pinned: r.pinned ? 1 : 0,
    tags: JSON.stringify(r.tags ?? []),
    updated_at: r.updated_at ?? null,
  };
}

function variantToLocal(r: any): VariantRow {
  const n = (x: unknown) => (x === null || x === undefined ? null : Number(x));
  return {
    id: r.id,
    food_id: r.food_id,
    label: r.label,
    is_default: r.is_default ? 1 : 0,
    kcal: Number(r.kcal),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
    sat_fat: n(r.sat_fat),
    sugar: n(r.sugar),
    fiber: n(r.fiber),
    sodium_mg: n(r.sodium_mg),
    kcal_min: n(r.kcal_min),
    kcal_max: n(r.kcal_max),
    confidence: r.confidence ?? null,
    ingredients: r.ingredients == null ? null : JSON.stringify(r.ingredients),
    updated_at: r.updated_at ?? null,
  };
}

function variantFromLocal(r: VariantRow): Variant {
  const v: Variant = {
    id: r.id,
    foodId: r.food_id,
    label: r.label,
    isDefault: !!r.is_default,
    kcal: Number(r.kcal),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
  };
  const opt: [keyof Variant, unknown][] = [
    ['satFat', num(r.sat_fat)],
    ['sugar', num(r.sugar)],
    ['fiber', num(r.fiber)],
    ['sodiumMg', num(r.sodium_mg)],
    ['kcalMin', num(r.kcal_min)],
    ['kcalMax', num(r.kcal_max)],
    ['confidence', r.confidence ?? undefined],
    ['ingredients', r.ingredients == null ? undefined : parseJson(r.ingredients, undefined)],
  ];
  for (const [k, val] of opt) if (val !== undefined) (v as any)[k] = val;
  return v;
}

/** Fields of a Macros/variant patch to DB columns; undefined keys are skipped. */
const VARIANT_COLUMN: Record<string, string> = {
  label: 'label',
  kcal: 'kcal',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  satFat: 'sat_fat',
  sugar: 'sugar',
  fiber: 'fiber',
  sodiumMg: 'sodium_mg',
  kcalMin: 'kcal_min',
  kcalMax: 'kcal_max',
  confidence: 'confidence',
  ingredients: 'ingredients',
};

function variantPayload(v: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val !== undefined && VARIANT_COLUMN[k]) out[VARIANT_COLUMN[k]] = val;
  }
  return out;
}

// Network helpers ----------------------------------------------------------------

/** Await a supabase call; throw OfflineError for network failures, rethrow others as-is. */
async function call<T>(p: PromiseLike<{ data: T; error: any }>): Promise<T> {
  let res: { data: T; error: any };
  try {
    res = await p;
  } catch (e) {
    throw isNetworkError(e) ? new OfflineError() : e;
  }
  if (res.error) throw isNetworkError(res.error) ? new OfflineError() : res.error;
  return res.data;
}

async function pullAll(table: 'foods' | 'food_variants'): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await call<any[]>(
      supabase.from(table).select('*').order('id').range(from, from + PAGE - 1) as any,
    );
    rows.push(...(page ?? []));
    if (!page || page.length < PAGE) break;
  }
  return rows;
}

// Reads / sync ---------------------------------------------------------------------

export async function listFoods(): Promise<Food[]> {
  const { foods, variants } = await readLocal();
  const byFood = new Map<string, Variant[]>();
  for (const r of variants) {
    const list = byFood.get(r.food_id) ?? [];
    list.push(variantFromLocal(r));
    byFood.set(r.food_id, list);
  }
  return foods.map((f) => ({
    id: f.id,
    kind: f.kind as FoodKind,
    name: f.name,
    pinned: !!f.pinned,
    tags: parseJson<string[]>(f.tags, []),
    variants: byFood.get(f.id) ?? [],
    updatedAt: f.updated_at ?? '',
  }));
}

/** Full pull of both tables, then replace local rows in one transaction. */
export async function syncFromSupabase(): Promise<void> {
  const foods = await pullAll('foods');
  const variants = await pullAll('food_variants');
  await replaceLocal(foods.map(foodToLocal), variants.map(variantToLocal));
}

/** Best-effort local refresh after a successful write. */
async function refresh(): Promise<void> {
  try {
    await syncFromSupabase();
  } catch {
    // write already succeeded; next sync will catch up
  }
}

// Writes (Supabase first, local refresh after success) --------------------------------

export async function createFood(input: NewFood): Promise<Food> {
  const foodRow = await call<any>(
    supabase
      .from('foods')
      .insert({ kind: input.kind, name: input.name, tags: input.tags ?? [] })
      .select()
      .single() as any,
  );
  let variantRow: any;
  try {
    variantRow = await call<any>(
      supabase
        .from('food_variants')
        .insert({
          food_id: foodRow.id,
          is_default: true,
          label: input.variant.label ?? 'Normal',
          ...variantPayload({ ...input.variant, label: undefined }),
        })
        .select()
        .single() as any,
    );
  } catch (e) {
    try {
      await supabase.from('foods').delete().eq('id', foodRow.id);
    } catch {
      // best-effort compensation
    }
    throw e;
  }
  await refresh();
  return {
    id: foodRow.id,
    kind: foodRow.kind,
    name: foodRow.name,
    pinned: !!foodRow.pinned,
    tags: foodRow.tags ?? [],
    variants: [variantFromLocal(variantToLocal(variantRow))],
    updatedAt: foodRow.updated_at ?? '',
  };
}

export async function updateFood(
  id: string,
  patch: Partial<Pick<Food, 'name' | 'kind' | 'pinned' | 'tags'>>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const k of ['name', 'kind', 'pinned', 'tags'] as const) {
    if (patch[k] !== undefined) payload[k] = patch[k];
  }
  if (Object.keys(payload).length === 0) return;
  await call(supabase.from('foods').update(payload).eq('id', id) as any);
  await refresh();
}

export async function deleteFood(id: string): Promise<void> {
  await call(supabase.from('foods').delete().eq('id', id) as any);
  await refresh();
}

export async function addVariant(foodId: string, v: NewVariant): Promise<Variant> {
  const row = await call<any>(
    supabase
      .from('food_variants')
      .insert({
        food_id: foodId,
        is_default: false,
        label: v.label ?? 'Normal',
        ...variantPayload({ ...v, label: undefined }),
      })
      .select()
      .single() as any,
  );
  await refresh();
  return variantFromLocal(variantToLocal(row));
}

export async function updateVariant(
  id: string,
  patch: Partial<Macros & { label: string }>,
): Promise<void> {
  const payload = variantPayload(patch as Record<string, unknown>);
  if (Object.keys(payload).length === 0) return;
  await call(supabase.from('food_variants').update(payload).eq('id', id) as any);
  await refresh();
}

async function promote(foodId: string, variantId: string): Promise<void> {
  await call(
    supabase.rpc('set_default_variant', { p_food_id: foodId, p_variant_id: variantId }) as any,
  );
}

export async function setDefaultVariant(foodId: string, variantId: string): Promise<void> {
  await promote(foodId, variantId);
  await refresh();
}

export async function deleteVariant(id: string): Promise<void> {
  const { variants } = await readLocal();
  const target = variants.find((v) => v.id === id);
  if (!target) throw new Error('Variant not found');
  const siblings = variants.filter((v) => v.food_id === target.food_id);
  if (siblings.length <= 1) throw new Error('A food needs at least one variant');

  await call(supabase.from('food_variants').delete().eq('id', id) as any);

  if (target.is_default) {
    const remaining = siblings.filter((v) => v.id !== id);
    const next = remaining.reduce((best, v) =>
      (v.updated_at ?? '') > (best.updated_at ?? '') ? v : best,
    );
    await promote(target.food_id, next.id);
  }
  await refresh();
}
