# Story 1.4: Chronological Recipe Viewing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user exploring the feed,
I want to click on a recipe and view its details in a chronological workflow,
So that I can follow the instructions step-by-step natively.

## Acceptance Criteria

1. **Given** the user is on the Split Deck feed,
2. **When** a recipe card is pressed,
3. **Then** the display navigates structure linearly down via Expo Router pushing a `[id].tsx` modal/page (FR3),
4. **And** the UI maps instruction texts adhering to typography minimums structurally parsed from SQLite caches.

## Tasks / Subtasks

- [x] Task 1: Expo Router Dynamic Layout
  - [x] Subtask 1.1: Create `app/recipe/[id].tsx` file structurally handling parameter extraction mapping `useLocalSearchParams()`.
- [x] Task 2: SQLite Recipe Binding
  - [x] Subtask 2.1: Drizzle `db.select().from(recipes).where(eq(recipes.id, id))` to isolate the physical memory payload natively upon mounting.
- [x] Task 3: Split-Deck Tab Integrations
  - [x] Subtask 3.1: Mount `router.push('/recipe/[id]')` inside `app/(tabs)/index.tsx` `TouchableOpacity` hit zones dynamically utilizing SQLite `item.id`.
  - [x] Subtask 3.2: Format textual instruction outputs utilizing `ScrollView` protecting bounds against the `#0F172A` deep backgrounds. 

## Dev Notes

- **Dynamic Navigation:** Because we want standard linear forward-navigations that escape the Tab-Bar context, place the `recipe` folder out at the root (`app/recipe`) rather than embedding it inside `app/(tabs)`. This ensures viewing a recipe mounts cleanly over the entire page.
- **Drizzle eq:** Ensure you import `eq` from `drizzle-orm` properly against the UUID string parameters.

### Project Structure Notes

- Keep all routing compliant with `expo-router` paradigms. Do not fall back to `react-navigation` raw usages.

### References

- [Source: planning-artifacts/epics.md#Story 1.4]
- [Previous: implementation-artifacts/1-3-responsive-split-deck-discovery-feed.md]

### Completion Notes List

- ✅ Expo Router `app/recipe/[id].tsx` handles all linear navigation contexts decoupled above the Tab bars seamlessly.
- ✅ Drizzle SQLite mapping retrieves instructions using standard UUID `eq` loops asynchronously.
- ✅ Deep interface bounds respect `#0F172A` slate defaults with clear `.toUpperCase()` green visual isolators on reading mappings.

### File List

- Added: `app/recipe/[id].tsx`
- Modified: `app/(tabs)/index.tsx`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] SQLite unhandled promise rejection risk — The asynchronous Database lookup inside `locateRecipe()` relies strictly on `await db.select()`. If local database cache mapping is physically corrupted or locked, the async operation will crash React Native as an Unhandled Promise Rejection without a layout recovery trap. Wrap it inside a `try/catch` and cleanly trip `setLoading(false)`. Location: app/recipe/[id].tsx
