# Story 3.3: Quantifying Custom Ingredients

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a home recipe creator,
I want to add verified global ingredients to my private recipe,
So that my recipe automatically calculates its total macros using verified data.

## Acceptance Criteria

1. **Given** the user is viewing/editing their private recipe,
2. **When** they add a global ingredient,
3. **Then** they can assign specific quantitative values to it via the standard numeric keyboard override (FR10),
4. **And** the overarching recipe's total macros auto-calculate identically to a global recipe.

## Tasks / Subtasks

- [x] Task 1: UI Ingredient Additive Boundaries
  - [x] Subtask 1.1: Embed an "Add Ingredients" module explicitly inside `app/recipe/[id].tsx` (only visible to recipe owners if we enforce owner constraints, but any local user can logically view local macros).
  - [x] Subtask 1.2: Connect a global `ingredients` search map (similar to `app/(tabs)/pantry.tsx`) allowing users to physically select a verified node.
- [x] Task 2: Quantitative Data Prompts
  - [x] Subtask 2.1: On selection, expose a Modal/Overlay prompting the user for `amount` (using the numeric `decimal-pad` keyboard established in Epic 2 overrides) and `unit` (temporarily defaulting strings like "grams").
  - [x] Subtask 2.2: Map `drizzle-orm` insert mappings directly into the local `recipe_ingredients` junction table cleanly associating the `recipe_id`, `ingredient_id`, `amount`, and `unit`.
- [x] Task 3: Algorithmic Recipe Map Hooks
  - [x] Subtask 3.1: Execute a comprehensive SQL inner join natively joining `recipe_ingredients` to `ingredients` mapping active quantitative data directly against base values dynamically.
  - [x] Subtask 3.2: Export these pure mathematical macro arrays directly onto `app/recipe/[id].tsx`, displaying Total Calories, Protein, Carbs, and Fat algebraically!

## Dev Notes

- **Pre-Existing Architecture:** The `recipe_ingredients` SQLite junction table was proactively scaffolded and structurally verified natively during `Story 3.1`. We are strictly leveraging existing native joins avoiding DDL boots.
- **Pure Algebra Limits:** The global verified `ingredients` map base macros uniformly (i.e. per 100g, or per serving). We will utilize quantitative multipliers directly (e.g. `(baseMacro / baseAmount) * recipeAmount`).

### References

- [Source: planning-artifacts/epics.md#Story 3.3]
- [Previous: implementation-artifacts/3-2-private-recipe-creation.md]

### Completion Notes List

- ✅ Integrated modal UI dynamically mapping numeric `decimal-pad` input cleanly triggering database injections onto `recipe_ingredients`.
- ✅ Algorithmic Array Mapping: `.reduce()` naturally calculates macro totals directly scaling values locally multiplying `amount` algebraically!
- ✅ Zero TypeScript configuration errors generated explicitly utilizing `expoDb.getAllAsync` across dynamic Subquery joins safely defining schema boundaries.

### File List
- `app/recipe/[id].tsx`

### Senior Developer Review (AI)

#### Action Items
- ✅ [Review][Patch] SQLite Composite Key Collision: The execution layers lacked an active physical `try...catch` mapping back onto the React UI natively. Attempting to inject identical ingredients caused silent database rejections (violating the `PRIMARY KEY(recipe_id, ingredient_id)` DDL). Patched React `Alert.alert` intercepts gracefully handling the overlap constraints. Story 3.3 effectively structurally sound!
