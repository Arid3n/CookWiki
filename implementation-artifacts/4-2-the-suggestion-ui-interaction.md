# Story 4.2: The Suggestion UI Interaction

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a home cook,
I want to visually see exactly what 1 ingredient I would need to buy to cook a meal I otherwise couldn't,
So that I can make quick grocery decisions.

## Acceptance Criteria

1. **Given** the user views the "Missing Link" tab or feed overlay,
2. **When** the Math Engine resolves matching recipes missing 1 node,
3. **Then** the UI displays the recipe alongside the specific single ingredient needed to unlock it,
4. **And** users can click the recipe to view its full details.

## Tasks / Subtasks

- [x] Task 1: Discovery Tab Architecture
  - [x] Subtask 1.1: Generate `app/(tabs)/discovery.tsx` cleanly formalizing a new root navigation space natively isolating suggestion interactions.
  - [x] Subtask 1.2: Bind the foundational mathematics structurally calling `findMissingLinkRecipes()` iteratively passing the secure `session.user.id` scopes natively.
- [x] Task 2: Visual Node Mappings
  - [x] Subtask 2.1: Construct `FlatList` elements exposing explicitly interactive cards.
  - [x] Subtask 2.2: Map the inner UX natively generating explicit language limits dynamically: *"You only need `[missing_ingredient_name]` to physically unlock `[recipe_title]`!"*.
- [x] Task 3: Execution Routing
  - [x] Subtask 3.1: Enforce `<TouchableOpacity>` bounds linking visually clicking the missing-link card formally pushing dynamically into `router.push('/recipe/[id]')`.

## Dev Notes

- **Algorithmic Limits:** In Story 4.1 we executed the core algorithm securely. It returns pure arrays shaped functionally `{ recipe_id, recipe_title, missing_ingredient_id, missing_ingredient_name }`. This execution maps those data limits purely visually without making any manual SQLite mutations.

### References

- [Source: planning-artifacts/epics.md#Story 4.2]
- [Previous: implementation-artifacts/4-1-missing-node-algorithmic-discovery.md]

### Completion Notes List

- ✅ Generates explicit `Missing Node` UI Tabs iteratively routing directly to explicit recipes mapping cleanly to Drizzle states.
- ✅ Successfully parses algorithmic parameters displaying dynamic strings visually: *"You only need X to unlock Y!"*.

### File List
- `app/(tabs)/discovery.tsx`
- `app/(tabs)/_layout.tsx`
