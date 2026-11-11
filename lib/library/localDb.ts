import * as SQLite from 'expo-sqlite';

export type FoodRow = {
  id: string;
  kind: string;
  name: string;
  pinned: number;
  tags: string; // JSON text
  updated_at: string | null;
};

export type VariantRow = {
  id: string;
  food_id: string;
  label: string;
  is_default: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sat_fat: number | null;
  sugar: number | null;
  fiber: number | null;
  sodium_mg: number | null;
  kcal_min: number | null;
  kcal_max: number | null;
  confidence: string | null;
  ingredients: string | null; // JSON text
  updated_at: string | null;
};

const FOOD_COLS = ['id', 'kind', 'name', 'pinned', 'tags', 'updated_at'] as const;
const VARIANT_COLS = [
  'id', 'food_id', 'label', 'is_default', 'kcal', 'protein', 'carbs', 'fat', 'sat_fat',
  'sugar', 'fiber', 'sodium_mg', 'kcal_min', 'kcal_max', 'confidence', 'ingredients', 'updated_at',
] as const;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS food_variants (
  id TEXT PRIMARY KEY NOT NULL,
  food_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  sat_fat REAL,
  sugar REAL,
  fiber REAL,
  sodium_mg REAL,
  kcal_min REAL,
  kcal_max REAL,
  confidence TEXT,
  ingredients TEXT,
  updated_at TEXT
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('cookwiki_library.db');
      await db.execAsync(SCHEMA);
      return db;
    })();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function insertSql(table: string, cols: readonly string[]): string {
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
}

/** Replace all local rows in one transaction. */
export async function replaceLocal(foods: FoodRow[], variants: VariantRow[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM food_variants');
    await db.runAsync('DELETE FROM foods');
    for (const f of foods) {
      await db.runAsync(insertSql('foods', FOOD_COLS), FOOD_COLS.map((c) => f[c]));
    }
    for (const v of variants) {
      await db.runAsync(insertSql('food_variants', VARIANT_COLS), VARIANT_COLS.map((c) => v[c]));
    }
  });
}

export async function readLocal(): Promise<{ foods: FoodRow[]; variants: VariantRow[] }> {
  const db = await getDb();
  const foods = await db.getAllAsync<FoodRow>('SELECT * FROM foods');
  const variants = await db.getAllAsync<VariantRow>('SELECT * FROM food_variants');
  return { foods, variants };
}

/** Wipe local library (call on sign-out so another user never sees this data). */
export async function clearLocalLibrary(): Promise<void> {
  await replaceLocal([], []);
}
