# Story 1.2: Cloud Authentication & Background Sync Loop

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile user,
I want to securely log in and have global recipes sync to my device,
So that my offline database is populated with the latest recipes.

## Acceptance Criteria

1. **Given** the user authenticates via Supabase Auth (FR1, FR2),
2. **When** successful login occurs,
3. **Then** the background sync engine (`db/sync.ts`) pulls down un-synced global recipes (FR17, FR18),
4. **And** a discrete visual sync status indicator displays state (FR19).

## Tasks / Subtasks

- [x] Task 1: Initialize Supabase Authentication (AC: 1, 2)
  - [x] Subtask 1.1: Install `@supabase/supabase-js` and `expo-secure-store`, then establish the single-instance client in `/lib/supabase.ts` with native persistence.
  - [x] Subtask 1.2: Implement `app/login.tsx` interface capturing Email/Password, binding session cookies, and utilizing `expo-router` redirects back to `app/index.tsx`.
- [x] Task 2: Implement SQLite Delta Sync Engine (AC: 3)
  - [x] Subtask 2.1: Establish `/db/sync.ts` logic querying Supabase for `recipes` and `ingredients` where `updatedAt` > local `lastSyncAt`.
  - [x] Subtask 2.2: Upsert records atomically into `expo-sqlite` utilizing generated `schema.ts`.
- [x] Task 3: Visual Global Sync Indicator (AC: 4)
  - [x] Subtask 3.1: Mount a Zustand store (`/store/syncStore.ts`) tracking `{ isSyncing: boolean, lastError: string | null }`.
  - [x] Subtask 3.2: Hook `syncStore` dynamically into `app/_layout.tsx` rendering a discrete Neon Green (`#10B981`) or equivalent loader across the overarching context.

## Dev Notes

- **Auth Constraints:** You must utilize `expo-secure-store` explicitly for Supabase auto-tokens (NFR4). Do not fallback natively to raw Async Storage unless specifically bridging standard config shapes.
- **Sync Pattern:** Delta pulls! Only query Supabase records modified after the latest timestamp cached in local device storage.
- **Drizzle Safety:** The SQLite operations executing from `/db/sync.ts` should fire outside of standard React rendering lifecycles where possible, dumping results directly into the local SQL Cache layer implicitly managed by the ORM.

### Project Structure Notes

- Previous code is cleanly maintained. Run modifications off the `db` setup and ensure `app/login.tsx` protects its boundaries.
- Codebase paths root around `/home/ariden/Projects/CookWiki/CookWiki_app/`.

### References

- [Source: planning-artifacts/epics.md#Story 1.2]
- [Previous: implementation-artifacts/1-1-project-initialization-and-local-database-setup.md]

### Completion Notes List

- ✅ Expo-Secure-Store cleanly bound to Supabase Client for automatic token lifecycle.
- ✅ Zustand mounted to extract layout loading state structurally from deep SQLite requests.
- ✅ Delta Sync engine utilizes numeric timestamps parsed successfully through Secure Store metrics.
- ✅ Authentication routes bounded against `index.tsx` routing.

### File List

- Modified: `app/_layout.tsx`
- Modified: `app/index.tsx`
- Added: `app/login.tsx`
- Added: `db/sync.ts`
- Added: `lib/supabase.ts`
- Added: `store/syncStore.ts`
- Modified: `package.json`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] Silent failure on sync engine errors — The syncError state exists in Zustand but is not mapped into the UI layout. If Supabase fails or network drops during a pull, it dies silently and drops the neon green indicator without telling the user. Location: app/_layout.tsx
- [x] [Review][Patch] SQLite Sync Upsert loop missing protective transaction boundary — Thousands of iterations awaiting `db.insert` over the JS bridge without a `.transaction()` wrapper will freeze the UI thread and dramatically slow down initial load caches. Location: db/sync.ts
