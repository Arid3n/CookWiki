# Story 1.3: Responsive "Split Deck" Discovery Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an active home cook,
I want to view a full-screen feed of recipes using the Split Deck layout and execute lightning-fast offline searches,
So that I can effortlessly browse content without waiting for network calls.

## Acceptance Criteria

1. **Given** the user is viewing the primary tab (UX-DR8),
2. **When** recipes are loaded from the local SQLite cache,
3. **Then** they render using the 45% media / 55% Control Deck layout (UX-DR1),
4. **And** the user can filter the list via keyword search executing under 200ms (FR4, FR6, NFR2).

## Tasks / Subtasks

- [x] Task 1: Establish Root Tab Navigation (UX-DR8)
  - [x] Subtask 1.1: Build `app/(tabs)/_layout.tsx` enforcing the Flat Bottom-Tab navigation matrix (Feed, Pantry, Profile) and redirect root `app/index.tsx` connections here.
- [x] Task 2: Implement "Split Deck" Structural Skeleton (UX-DR1)
  - [x] Subtask 2.1: Inside `app/(tabs)/index.tsx` (Feed), implement the baseline split layout: Top 45% for Immersive Media boundaries, bottom 55% for the Control Deck.
  - [x] Subtask 2.2: Color map the application boundaries. Dark Mode background defaults to Deep Slate (`#0F172A`), control surfaces isolated.
- [x] Task 3: Local SQLite Retrieval & Feed Rendering (FR4, NFR2)
  - [x] Subtask 3.1: Hook `drizzle-orm` directly into the Feed component, rendering global recipes pulled natively via `db.select`.
  - [x] Subtask 3.2: Implement lightning-fast `<TextInput>` search natively mapping down to SQLite `like('%...%')` without web debounce delays.
  - [x] Subtask 3.3: Bind 60x60dp minimal hit radii properties (`react-native-gesture-handler` or strict padding) across all Feed card outputs.

## Dev Notes

- **Navigation Flow:** Since we have auth, ensure a user hitting `/` gets routed to `/(tabs)/` automatically if authenticated. 
- **Performance Constraints:** Do not store immense byte loads (Base64 images) directly inside the SQLite text strings unless isolated. Use external URI links mapping the images locally. For this sprint mock, simple placeholder colors mapped into the `45%` media block are fine while the structural schema aligns.
- **Deep Slate Base:** The overarching app container should already hold the generic `#0F172A` Slate.

### Project Structure Notes

- Drizzle ORM sits securely in `db/index.ts`. Consume recipes securely.
- Codebase paths root around `/home/ariden/Projects/CookWiki/CookWiki_app/`.

### References

- [Source: planning-artifacts/epics.md#Story 1.3]
- [Previous: implementation-artifacts/1-2-cloud-authentication-and-background-sync-loop.md]

### Completion Notes List

- ✅ Root Tab navigation explicitly defined for deep-link constraints.
- ✅ The `45%/55%` Split Deck UI rigidly bounded inside the Feed component conforming to Dark Slate layouts.
- ✅ Drizzle SQLite mapping loops established natively to parse extremely lightweight local keyword text searches in milliseconds.
- ✅ All minimum 60x60dp minimal Hit Radiuses explicitly coded via `minHeight` variables protecting UX compliance.

### File List

- Added: `app/(tabs)/_layout.tsx`
- Added: `app/(tabs)/index.tsx`
- Added: `app/(tabs)/pantry.tsx`
- Added: `app/(tabs)/profile.tsx`
- Modified: `app/index.tsx`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] Auth state listener unmounts on tab redirection — The `onAuthStateChange` listener is currently placed in `app/index.tsx`. Because `router.replace` destroys the index layer, clicking "Disconnect Identity" on the Profile tab will sever the session but strand the user in the app as a ghost. The listener MUST be globalized into `app/_layout.tsx`. Location: app/index.tsx
