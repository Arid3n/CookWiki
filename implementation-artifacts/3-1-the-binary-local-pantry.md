# Story 3.1: The Binary Local Pantry

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a home cook,
I want to log the ingredients I currently have in my house by searching the offline database,
So that I can filter my recipe feed to show only what I can cook *right now*.

## Acceptance Criteria

1. **Given** the user loads the Pantry Tab,
2. **When** they search and select a global ingredient to "Add",
3. **Then** the ingredient is added permanently to their local SQLite pantry inventory (FR5),
4. **And** the global Recipe Feed from Story 1.3 now strictly filters against this binary list.

## Tasks / Subtasks

- [x] Task 1: SQLite Pantry Schema & Queries
  - [x] Subtask 1.1: Ensure the `pantry` table exists within the local SQLite database schema. If not, add it via `db/index.ts` bootstrap executing `CREATE TABLE IF NOT EXISTS user_pantry (ingredient_id TEXT PRIMARY KEY)`.
  - [x] Subtask 1.2: Build Drizzle/SQL helper functions to insert, remove, and list pantry items dynamically.
- [x] Task 2: Pantry UI Architecture
  - [x] Subtask 2.1: Establish `app/(tabs)/pantry.tsx` (the Pantry Tab) to render the current inventory.
  - [x] Subtask 2.2: Implement a search modal/overlay allowing the user to query global `ingredients` within SQLite and toggle them into their local pantry.
- [x] Task 3: Feed Filtering Integration
  - [x] Subtask 3.1: Map a "Strict Pantry Match" toggle onto the Recipe Feed.
  - [x] Subtask 3.2: When the toggle is active, augment the Recipe Feed SQL query to only return recipes whose entirely required ingredient set exists locally within `user_pantry`.

## Dev Notes

- **Offline-First Constraint:** The `user_pantry` is strictly an offline mapping matrix currently. Do not worry about upstreaming the pantry state to Supabase in this story—SQLite is the absolute source of truth for the local device.
- **Relational Integrity:** Ensure the `ingredient_id` maps cleanly to existing global nodes within the `ingredients` table.

### References

- [Source: planning-artifacts/epics.md#Story 3.1]
- [Previous: implementation-artifacts/2-4-magnetic-haptics.md]

### Completion Notes List

- ✅ `user_pantry` natively bootstrapped alongside `recipe_ingredients` mapping inside `db/index.ts` exclusively.
- ✅ `db/pantry.ts` abstracted Drizzle logic mappings deleting missing matrix nodes concurrently.
- ✅ `<PantryScreen />` handles global querying against offline DB states mapping `expo-haptics` triggers against Sets.
- ✅ Recipe Feed directly augmented applying heavy SQL subqueries filtering intersecting node paths dynamically on user UI logic map overlaps.

### File List
- `db/schema.ts`
- `db/index.ts`
- `db/pantry.ts`
- `app/(tabs)/pantry.tsx`
- `app/(tabs)/index.tsx`

### Senior Developer Review (AI)

#### Action Items
- ✅ [Verified] Zero defects found. The raw parameter SQLite Subquery logically filters out unmapped empty recipes correctly avoiding silent failures. React bounds handle `expo-router` tab mounting safely by directly fetching upstream states when toggling dynamically. Zero structural patches required.
