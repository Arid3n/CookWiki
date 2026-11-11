import { supabase } from '@/lib/supabase';
import { db } from './index';
import { ingredients, recipes, recipeIngredients, userPantry, recipeLikes, recipeLogs } from './schema';
import { useSyncStore } from '@/store/syncStore';
import * as SecureStore from 'expo-secure-store';
import { eq } from 'drizzle-orm';
// v3: bumped key to force a clean full re-sync to restore locally deleted records
const LAST_SYNC_KEY = 'cookwiki_last_sync_v3';

const PAGE_SIZE = 1000;

/**
 * Fetches all pages of a timestamped table updated since lastSync.
 * Results are ordered by updatedAt ascending so pages are stable.
 */
async function fetchTimestampedPages<T>(
  table: string,
  lastSync: number
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updatedAt', lastSync)
      .order('updatedAt', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Fetches all pages of recipe_ingredients, which has no updatedAt column.
 * We use the row id for stable ordering instead.
 */
async function fetchRecipeIngredientsPages<T>(): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function fetchAllServerIds(table: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const d of data) ids.add(d.id);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

export async function runBackgroundSync() {
  const { setSyncing, setError } = useSyncStore.getState();

  try {
    setSyncing(true);
    setError(null);

    const lastSyncTimestamp = await SecureStore.getItemAsync(LAST_SYNC_KEY) || '0';
    const lastSync = parseInt(lastSyncTimestamp, 10);

    // 1. Fetch all pages — ingredients & recipes use timestamp delta;
    //    recipe_ingredients has no timestamp so we fetch everything every time.
    const [
      ingredientsData,
      recipesData,
      recipeIngredientsData,
      serverIngredientIds,
      serverRecipeIds,
      serverRecipeIngredientIds
    ] = await Promise.all([
      fetchTimestampedPages<typeof ingredients.$inferInsert>('ingredients', lastSync),
      fetchTimestampedPages<typeof recipes.$inferInsert>('recipes', lastSync),
      fetchRecipeIngredientsPages<typeof recipeIngredients.$inferInsert>(),
      fetchAllServerIds('ingredients'),
      fetchAllServerIds('recipes'),
      fetchAllServerIds('recipe_ingredients'),
    ]);

    // 2. Upsert inside a single atomic transaction
    await db.transaction(async (tx) => {
      // Handle hard deletions from server
      const localIngredients = await tx.select({ id: ingredients.id }).from(ingredients);
      for (const row of localIngredients) {
        if (!serverIngredientIds.has(row.id)) {
          await tx.delete(ingredients).where(eq(ingredients.id, row.id));
          await tx.delete(userPantry).where(eq(userPantry.ingredientId, row.id));
        }
      }

      const localRecipes = await tx.select({ id: recipes.id }).from(recipes);
      for (const row of localRecipes) {
        if (!serverRecipeIds.has(row.id)) {
          await tx.delete(recipes).where(eq(recipes.id, row.id));
          await tx.delete(recipeLikes).where(eq(recipeLikes.recipeId, row.id));
          await tx.delete(recipeLogs).where(eq(recipeLogs.recipeId, row.id));
        }
      }

      const localRecipeIngredients = await tx.select({ id: recipeIngredients.id }).from(recipeIngredients);
      for (const row of localRecipeIngredients) {
        if (!serverRecipeIngredientIds.has(row.id)) {
          await tx.delete(recipeIngredients).where(eq(recipeIngredients.id, row.id));
        }
      }

      for (const b of ingredientsData) {
        const mappedIngredient = {
          id: b.id,
          name: b.name,
          protein: b.protein ?? 0,
          carbs: b.carbs ?? 0,
          fat: b.fat ?? 0,
          calories: b.calories ?? 0,
          isGlobal: b.isGlobal ?? false,
          isDeleted: b.isDeleted ?? false,
          createdAt: b.createdAt ?? 0,
          updatedAt: b.updatedAt ?? 0,
        };
        await tx
          .insert(ingredients)
          .values(mappedIngredient)
          .onConflictDoUpdate({ target: ingredients.id, set: mappedIngredient });
      }

      for (const r of recipesData) {
        const mappedRecipe = {
          id: r.id,
          userId: (r as any).user_id ?? r.userId ?? null,
          title: r.title,
          description: r.description ?? null,
          instructions: r.instructions ?? null,
          imageUrl: (r as any).image_url ?? (r as any).imageUrl ?? null,
          isGlobal: r.isGlobal ?? false,
          isDeleted: r.isDeleted ?? false,
          createdAt: r.createdAt ?? 0,
          updatedAt: r.updatedAt ?? 0,
        };
        await tx
          .insert(recipes)
          .values(mappedRecipe)
          .onConflictDoUpdate({ target: recipes.id, set: mappedRecipe });
      }

      for (const ri of recipeIngredientsData) {
        // Map Supabase snake_case columns to local Drizzle camelCase schema
        const mapped = {
          id: ri.id,
          recipeId: (ri as any).recipe_id,
          ingredientId: (ri as any).ingredient_id,
          userId: (ri as any).user_id ?? null,
          amount: ri.amount ?? 0,
          unit: ri.unit ?? '',
          isGlobal: (ri as any).isGlobal ?? false,
          isDeleted: (ri as any).isDeleted ?? false,
          // These columns don't exist in Supabase, default to 0 locally
          createdAt: 0,
          updatedAt: 0,
        };
        await tx
          .insert(recipeIngredients)
          .values(mapped)
          .onConflictDoUpdate({ target: recipeIngredients.id, set: mapped });
      }
    });

    // 3. Update high-water mark (only for timestamped tables)
    const now = Date.now();
    await SecureStore.setItemAsync(LAST_SYNC_KEY, now.toString());

    console.log(
      `[Sync] Done — ingredients: ${ingredientsData.length}, ` +
      `recipes: ${recipesData.length}, ` +
      `recipeIngredients: ${recipeIngredientsData.length}`
    );
  } catch (err: any) {
    console.error('Sync Engine Error:', err);
    setError(err.message || 'Unknown sync error');
    throw err;
  } finally {
    setSyncing(false);
  }
}
