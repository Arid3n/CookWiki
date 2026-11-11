import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import * as crypto from 'expo-crypto';

export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  protein: real('protein').default(0).notNull(),
  carbs: real('carbs').default(0).notNull(),
  fat: real('fat').default(0).notNull(),
  calories: real('calories').default(0).notNull(),
  isGlobal: integer('isGlobal', { mode: 'boolean' }).default(false).notNull(),
  isDeleted: integer('isDeleted', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  title: text('title').notNull(),
  description: text('description'),
  instructions: text('instructions'),
  imageUrl: text('image_url'),
  servings: integer('servings').default(1).notNull(),
  isGlobal: integer('isGlobal', { mode: 'boolean' }).default(false).notNull(),
  isDeleted: integer('isDeleted', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

export const userPantry = sqliteTable('user_pantry', {
  ingredientId: text('ingredient_id').primaryKey(),
  amount: real('amount').default(0).notNull(),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id').notNull(),
  ingredientId: text('ingredient_id').notNull(),
  userId: text('user_id'),
  amount: real('amount').notNull(),
  unit: text('unit').notNull(),
  isGlobal: integer('isGlobal', { mode: 'boolean' }).default(false).notNull(),
  isDeleted: integer('isDeleted', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

export const recipeLikes = sqliteTable('recipe_likes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id').notNull(),
  userId: text('user_id'),
  createdAt: integer('createdAt').notNull(),
});

export const recipeLogs = sqliteTable('recipe_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id').notNull(),
  userId: text('user_id'),
  createdAt: integer('createdAt').notNull(),
});

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});

export const playlistRecipes = sqliteTable('playlist_recipes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  playlistId: text('playlist_id').notNull(),
  recipeId: text('recipe_id').notNull(),
  addedAt: integer('added_at').notNull(),
});
