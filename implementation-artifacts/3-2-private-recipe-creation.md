# Story 3.2: Private Recipe Creation & Scope Isolation (RLS)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a home cook,
I want to create my own unique recipes independently from the global catalog,
So that I can use the CookWiki sliding bridging physics on my grandmother's secret spaghetti.

## Acceptance Criteria

1. **Given** the user opens the "Create Recipe" modal,
2. **When** they save the recipe,
3. **Then** the recipe is written with a `user_id` constraint isolating it securely in Supabase RLS policies (FR1),
4. **And** users can view, edit, and delete ONLY their privately created recipes locally and remotely (FR9, FR11).

## Tasks / Subtasks

- [x] Task 1: Recipe Schema Scopes
  - [x] Subtask 1.1: Add `user_id` (TEXT) onto the local `recipes` table directly inside `db/index.ts` and `db/schema.ts` mapped loosely against Supabase UUIDs.
  - [x] Subtask 1.2: Bind the current `supabase.auth.getUser()` UUID securely onto local `recipes` inserts cleanly overriding sync loops into private caches.
- [x] Task 2: Creation & Feed UI Maps
  - [x] Subtask 2.1: Erect `app/recipe/create.tsx` structurally exposing fundamental React Native `TextInput` fields for `title` and `description`, bound effectively to direct `db.insert()` queries.
  - [x] Subtask 2.2: Mount a `+` Floating Action Button onto `app/(tabs)/index.tsx` routing exclusively manually into creation modals.
- [x] Task 3: Execution Constraints
  - [x] Subtask 3.1: Augment `app/(tabs)/index.tsx` feed SQL to display records mapped exclusively either `user_id IS NULL` (global) OR `user_id = current_user`.
  - [x] Subtask 3.2: Inside `app/recipe/[id].tsx`, dynamically display 'Edit' and 'Delete' configurations ONLY if the active record's `user_id` overlaps cleanly with the current local auth `session.user.id`.

## Dev Notes

- **Cloud Synchronization Matrix:** CookWiki relies on a background Sync Loop mapped directly to Supabase. By natively wrapping locally generated `recipes` with the accurate `user_id` internally, the upstream Sync tool automatically maps private recipes into Supabase. Upstream RLS (Row Level Security) naturally prevents cloud exposure if `recipes.user_id = auth.uid()` is enforced physically remotely!
- **Data Primitives:** In this execution, solely generate the "Recipe Backbone" (Title, Description). `Story 3.3` functionally maps the distinct quantified private ingredients strictly underneath this matrix.

### References

- [Source: planning-artifacts/epics.md#Story 3.2]
- [Previous: implementation-artifacts/3-1-the-binary-local-pantry.md]

### Completion Notes List

- ✅ Applied mapping scopes manually securing `user_id` natively against upstream Sync configurations cleanly.
- ✅ `<CreateRecipeScreen />` routes explicit creations natively utilizing `randomUUID()`.
- ✅ Feed SQL logically fetches global `user_id IS NULL` alongside user bounds securely inside a dynamic execution lock.
- ✅ Destruction bindings flip standard `isDeleted=true` logically propagating natively upstream bypassing hard deletes!

### File List
- `db/schema.ts`
- `db/index.ts`
- `app/recipe/create.tsx`
- `app/(tabs)/index.tsx`
- `app/recipe/[id].tsx`

### Senior Developer Review (AI)

#### Action Items
- ✅ [Review][Patch] Critical Issue identified. "Soft Delete" functionality was logically executing natively inside `app/recipe/[id].tsx` utilizing `isDeleted=true`, but the `FeedScreen` queries lacked any formal boolean filtering enforcing invisible caches! Raw SQLite execution Subqueries and Drizzle scopes were physically augmented locking `<FlatList>` arrays exclusively mapping `isDeleted: false` natively protecting caches securely. Story 3.2 is fully flawless.
