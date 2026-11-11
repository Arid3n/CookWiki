# Story 1.1: Project Initialization & Local Database Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile user,
I want the application to load instantly from a local cache,
so that I can use the app with zero internet latency in my kitchen.

## Acceptance Criteria

1. **Given** the user launches CookWiki,
2. **When** the app mounts,
3. **Then** the Expo Blank TypeScript template and Drizzle ORM (`expo-sqlite`) must successfully initialize.

## Tasks / Subtasks

- [x] Task 1: Initialize Expo Project (AC: 1, 2)
  - [x] Subtask 1.1: Run `npx create-expo-app@latest CookWiki_app --template blank-typescript`
  - [x] Subtask 1.2: Set up base `app/` folder (Expo Router setup) and configure `tsconfig.json` path aliases.
- [x] Task 2: Configure Drizzle ORM & SQLite (AC: 3)
  - [x] Subtask 2.1: Install `drizzle-orm`, `expo-sqlite`, `drizzle-kit` and babel plugins.
  - [x] Subtask 2.2: Establish `/db/schema.ts` building the `recipes` and `ingredients` baseline schema.
  - [x] Subtask 2.3: Configure the central database singleton `db/index.ts` hooked up natively to Expo SQLite.

## Dev Notes

- **CLI Generation Rule:** You MUST initialize using the exact command: `npx create-expo-app@latest CookWiki_app --template blank-typescript`. Do not default to the tabs template or the generic template. We are building the `Split Deck` layout later cleanly from a blank plate.
- **ORM Sync:** Do NOT construct physical foreign key cascades for deleted recipes. The architecture dictates Delta Sync via internal deleted columns, so use soft-deletes natively in the Drizzle schema.

### Project Structure Notes

- Codebase roots in `/home/ariden/Projects/CookWiki/CookWiki_app/`.
- Ensure everything Drizzle relies on remains totally decoupled from React `components/`. Provide an isolated generic `lib/` endpoint for math.

### References

- [Source: planning-artifacts/architecture.md#Starter Template]
- [Source: planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- ✅ Expo correctly scaffolded using the strict `blank-typescript` template.
- ✅ Overwrote `react-native` peer resolutions to safely support SDK 54 react mismatch issues.
- ✅ Configured Drizzle SQLite table schema natively utilizing the `<isDeleted>` soft-delete constraint from Architecture.
- ✅ Extracted `index.ts` and `App.tsx` artifacts to natively enforce `expo-router`.
- ✅ TypeScript validation compiles smoothly.
- ✅ All story execution conditions satisfied.

### File List

- Added: `db/schema.ts`
- Added: `db/index.ts`
- Added: `app/_layout.tsx`
- Added: `app/index.tsx`
- Added: `babel.config.js`
- Modified: `package.json`
- Modified: `tsconfig.json`
- Deleted: `App.tsx`
- Deleted: `index.ts`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] Missing ID generation strategy on SQL text primary keys — The ID column is text but lacks a `$defaultFn(() => crypto.randomUUID())` or string-based fallback. Update schema to use `expo-crypto` for UUIDv4 generation natively. Location: db/schema.ts
- [x] [Review][Patch] Missing drizzle kit config — `drizzle.config.ts` was not established, which will cause initialization failures when `drizzle-kit generate` attempts to build the local SQLite cache files. Location: root
