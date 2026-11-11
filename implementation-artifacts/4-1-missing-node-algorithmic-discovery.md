# Story 4.1: Missing Node Algorithmic Discovery

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer/system execution context,
I need a pure function algorithm to identify single missing bridge ingredients,
So that it can execute rapidly over thousands of recipes against the user's pantry.

## Acceptance Criteria

1. **Given** the user triggers a "What am I missing?" check,
2. **When** their pantry query executes,
3. **Then** the Math Engine isolates recipes missing exactly 1 ingredient to be structurally complete (FR14),
4. **And** it outputs the generic global identifier matching the gap.

## Tasks / Subtasks

- [x] Task 1: Algorithmic SQL Generation
  - [x] Subtask 1.1: Construct a highly optimized advanced SQL query utilizing `HAVING COUNT(missing_nodes) = 1` executing locally natively.
  - [x] Subtask 1.2: The algorithm must map `recipes` iteratively against `recipe_ingredients` exclusively tracking `ingredient_id NOT IN user_pantry`.
- [x] Task 2: Architecture Encapsulation
  - [x] Subtask 2.1: Create a dedicated `db/discovery.ts` module to store pure execution functions cleanly decoupling SQLite Discovery logic from the general feed arrays.
  - [x] Subtask 2.2: Export an asynchronous mapping method (e.g. `findMissingLinkRecipes()`) natively returning `{ recipe_id, title, missing_ingredient_id }` arrays strictly enforcing the mathematical purity bounds.

## Dev Notes

- **Pure SQL Performance Limits:** Given thousands of records natively, iterating via JavaScript `.filter()` over the entire database is structurally invalid. We MUST deploy raw `COUNT` grouping filters executing exclusively at the SQLite C-level layer!
- **Data Primitives:** The query physically mathematically maps as:
  `SELECT r.id, r.title, MIN(ri.ingredient_id) as missing_ingredient_id ... WHERE ri.ingredient_id NOT IN user_pantry GROUP BY r.id HAVING COUNT(ri.ingredient_id) = 1`

### References

- [Source: planning-artifacts/epics.md#Story 4.1]
- [Previous: implementation-artifacts/3-4-downstream-macro-propagation.md]

### Completion Notes List

- ✅ Structured explicitly isolated pure mathematical functions statically nested over `db/discovery.ts` mapping global exports optimally.
- ✅ Bypassed logical constraints by chaining `HAVING COUNT` algorithms scaling uniformly natively without mapping O(n^2) Javascript loops.

### File List
- `db/discovery.ts`
