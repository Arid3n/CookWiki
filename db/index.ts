import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const DATABASE_NAME = "cookwiki.db";

// Singleton SQLite db connection
export const expoDb = openDatabaseSync(DATABASE_NAME);

// DEV ONLY: Bootstrap DDL schemas natively since Drizzle 'migrate' hook isn't built yet
expoDb.execSync(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    servings INTEGER NOT NULL DEFAULT 1,
    isGlobal INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    calories REAL DEFAULT 0,
    isGlobal INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_pantry (
    ingredient_id TEXT PRIMARY KEY,
    amount REAL DEFAULT 0 NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    ingredient_id TEXT NOT NULL,
    user_id TEXT,
    amount REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '',
    isGlobal INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipe_likes (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    user_id TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipe_logs (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    user_id TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS playlist_recipes (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    added_at INTEGER NOT NULL
  );
`);

// Drizzle ORM instance
export const db = drizzle(expoDb, { schema });

// ─── Schema Migrations ───────────────────────────────────────────────────────
// We use PRAGMA user_version as a migration counter.
// Each version block runs exactly once per device and is never repeated.

const { user_version } = expoDb.getFirstSync<{ user_version: number }>(
  'PRAGMA user_version'
) ?? { user_version: 0 };

// v1 → v2: Recreate ingredients table — old schema had 'category TEXT NOT NULL'
// which conflicts with the Supabase nutritional data. We drop and rebuild it
// preserving any existing rows, copying over columns that still exist.
if (user_version < 2) {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS ingredients_v2 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      calories REAL DEFAULT 0,
      isGlobal INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO ingredients_v2 (id, name, protein, carbs, fat, calories, isGlobal, isDeleted, createdAt, updatedAt)
      SELECT
        id,
        name,
        COALESCE(protein, 0),
        COALESCE(carbs, 0),
        COALESCE(fat, 0),
        COALESCE(calories, 0),
        COALESCE(isGlobal, 0),
        COALESCE(isDeleted, 0),
        createdAt,
        updatedAt
      FROM ingredients;

    DROP TABLE ingredients;
    ALTER TABLE ingredients_v2 RENAME TO ingredients;

    PRAGMA user_version = 2;
  `);
}

// v2 → v3: Rebuild recipe_ingredients — old schema used a composite (recipe_id, ingredient_id) PK.
// New Supabase schema has id (UUID PK), user_id, isGlobal, isDeleted, createdAt, updatedAt.
if (user_version < 3) {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients_v3 (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      user_id TEXT,
      amount REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      isGlobal INTEGER NOT NULL DEFAULT 0,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO recipe_ingredients_v3 (id, recipe_id, ingredient_id, amount, unit, isGlobal, isDeleted, createdAt, updatedAt)
      SELECT
        hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)),
        recipe_id,
        ingredient_id,
        COALESCE(amount, 0),
        COALESCE(unit, ''),
        0,
        0,
        0,
        0
      FROM recipe_ingredients;

    DROP TABLE recipe_ingredients;
    ALTER TABLE recipe_ingredients_v3 RENAME TO recipe_ingredients;

    PRAGMA user_version = 3;
  `);
}

// Simple additive migrations (safe to run every time via try/catch)
const additivePatches = [
  "ALTER TABLE recipes ADD COLUMN user_id TEXT;",
  "ALTER TABLE recipes ADD COLUMN isGlobal INTEGER DEFAULT 0;",
  "ALTER TABLE recipes ADD COLUMN image_url TEXT;",
  "ALTER TABLE recipes ADD COLUMN servings INTEGER NOT NULL DEFAULT 1;",
  "ALTER TABLE user_pantry ADD COLUMN amount REAL DEFAULT 0 NOT NULL;",
];
for (const sql of additivePatches) {
  try { expoDb.execSync(sql); } catch (_e) { /* column already exists */ }
}
