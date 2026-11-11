---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
status: 'complete'
lastStep: 8
completedAt: '2026-04-01'
project_name: 'CookWiki'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The application relies heavily on local search and categorization, requiring a robust client-side relational database mechanism. The defining feature is real-time macro algorithmic processing (Smart Bridging), dictating that data retrieval and calculations must occur entirely offline against the local cache.

**Non-Functional Requirements:**
Architecture must support 60FPS UI rendering, <200ms search latency, comprehensive offline caching limits (<100MB), and absolute data privacy isolated via Row Level Security (RLS).

**Scale & Complexity:**
- Primary domain: Mobile App (React Native) + BaaS (Supabase)
- Complexity level: Medium
- Estimated architectural components: 4 (UI/Presentation, Local Data Layer, Sync Engine, Cloud DB/Auth)

### Technical Constraints & Dependencies
- Strict dependency on Expo for cross-platform deployment.
- Strict dependence on Supabase PostgreSQL for remote state and Auth.
- Limited local device storage requiring aggressive media/asset management.

### Cross-Cutting Concerns Identified
- **State Synchronization:** Handling the complex Delta-Sync loop between SQLite and Supabase on foreground mounts.
- **Performance:** Ensuring the heavy JavaScript math (Bridging Algorithm) does not block the 60fps React Native UI thread (e.g., using Reanimated or background web-workers).
- **Security:** RLS to separate Global vs Private Data scopes cleanly.

## Starter Template Evaluation

### Primary Technology Domain
Mobile Application (React Native / Expo) utilizing Offline-First patterns.

### Starter Options Considered
1. **Expo with-sqlite Template** (`npx create-expo-app -e with-sqlite`): Pre-wired for basic SQLite, but forces specific file structures.
2. **Expo Blank TypeScript** (`npx create-expo-app --template blank-typescript`): A clean slate providing maximum architectural control.

### Selected Starter: Expo Blank TypeScript
**Rationale for Selection:**
CookWiki's mathematical macro algorithms (Smart Bridging) and Delta Syncs strictly require bespoke logic. A clean TypeScript Expo template provides the safest foundation to cleanly layer `expo-sqlite`, `drizzle-orm` (for type-safe local Db), and `@supabase/supabase-js` without fighting generic boilerplate code. 

**Initialization Command:**
```bash
npx create-expo-app@latest CookWiki_app --template blank-typescript
```

**Architectural Decisions Provided by Starter:**
- **Language & Runtime:** TypeScript strictly enforced on React Native.
- **Routing & Organization:** Expo Router (File-based navigation inside `app/`).
- **Build Tooling:** Expo Metro Bundler and EAS (Expo Application Services).
- **Development Experience:** Fast Refresh, physical device testing via Expo Go, and Drizzle Studio network inspection for local SQLite monitoring.

**Note:** Project initialization using this command will be our absolute first Implementation Story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Starter Template: Expo Blank TypeScript
- Data Architecture (Local): Drizzle ORM (v0.45.2) with `expo-sqlite`
- Backend Data/Auth: Supabase PostgreSQL
- State Management: Zustand (v5.0.12)

**Important Decisions (Shape Architecture):**
- UI Thread Performance: React Native Reanimated (for 60FPS fluid sliders/macro filtering)

### Data Architecture

**Drizzle ORM + expo-sqlite:**
- *Rationale:* Provides 100% type-safety for the complex algorithmic macro-bridging queries offline without heavy native dependencies. Ensures the "Smart Bridging" logic remains maintainable and type-checked against Supabase schema drifts.
- *Affects:* All local Search, Discover, and dynamic calculation mechanics.

### Authentication & Security

**Supabase + Row Level Security (RLS):**
- *Rationale:* Secure isolation of global un-editable reference ingredients from private user-crafted recipe data natively at the database level.
- *Affects:* Entire Delta Sync mechanism and identity tracking.

### Frontend Architecture

**Zustand + Expo Router:**
- *Rationale:* Zero-boilerplate reactive state synchronization. Perfectly suited for tying SQLite cache updates directly to isolated Reanimated UI components without triggering massive parent re-renders.
- *Constraint:* **Zustand state mutations and Drizzle macro recalculations must only trigger on `onSlidingComplete` to protect the Reanimated 60FPS UI thread.**
- *Affects:* Global state hooks and interaction loops.

### Infrastructure & Deployment

**Expo Application Services (EAS):**
- *Rationale:* Rapid OTA (Over The Air) updates and compiled native mobile binaries with zero Xcode or Android Studio overhead.
- *Affects:* CI/CD, production deployment, and testing.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize Expo Starter with Drizzle ORM and basic Zustand store.
2. Define identical schema in Supabase (PostgreSQL) and Drizzle (SQLite).
3. Implement the Delta Sync engine and Auth loop.
4. Implement the offline Smart Bridging formulas and 60FPS filters.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined
**Critical Conflict Points Identified:** 
4 core areas where AI developers could inadvertently break the Sync engine or the 60FPS UI if they make uncoordinated decisions.

### Naming Patterns

**Database Naming Conventions:**
- Tables (Supabase AND SQLite): `snake_case` (e.g., `user_recipes`, `macro_targets`).
- TypeScript Types/Interfaces: `PascalCase` (e.g., `UserRecipe`, `MacroTarget`).
- Drizzle Schemas: `camelCase` appended with 'Schema' (e.g., `userRecipesSchema`).

**Code Naming Conventions:**
- React Components: `PascalCase` files (e.g., `SlidingRecipeCard.tsx`).
- React Hooks: `camelCase` prefixed with `use` (e.g., `useMacroStore()`, `useLocalSync()`).

### Structure Patterns

**File Structure Patterns (Expo Router enforced):**
- `/app`: Expo Router pages **ONLY**. Absolutely no business logic.
- `/components`: UI-only presentation components and Reanimated slider shells.
- `/store`: Zustand state slices.
- `/db`: Drizzle schema definitions (`schema.ts`) and Delta-sync engine logic (`sync.ts`).
- `/lib/algorithms`: Pure mathematical functions for Smart Bridging. These must be 100% isolated to allow rapid Jest testing without React dependencies.

### Format Patterns

**Data Exchange Formats:**
- **Delta Sync Payloads:** Every synced SQLite table MUST include `id` (UUIDv4), `updated_at` (ISO 8601 UTC string), and an internal `sync_status` column ('synced', 'pending_insert', 'pending_update', 'pending_delete'). Boolean deleted flags must be used instead of hard drops (`deleted_at`).

### Process Patterns

**Performance Protection (60FPS Enforcement):**
- **Strict Rule:** Complex calculations (like the Smart Bridging Math) MUST NOT execute inside a React Component's render path. They must be calculated in pure functions, or executed natively via `useDerivedValue` in `react-native-reanimated`.
- **Offline Protocol:** All reads and writes happen against the Drizzle local SQLite database. The Supabase sync engine is entirely a background side-effect. UI components never await Supabase.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
CookWiki_app/
├── package.json
├── app.json (Expo config)
├── tsconfig.json
├── drizzle.config.ts
├── .env.local
├── app/
│   ├── _layout.tsx (Global Providers: SQLite Provider, Auth Hook)
│   ├── index.tsx (Home / Discovery Feed)
│   ├── recipe/
│   │   └── [id].tsx (Dynamic Sliding Cook Mode)
│   ├── admin/
│   │   └── index.tsx (Global Reference Ingredient portal)
├── components/
│   ├── ui/ (Generic components: buttons, inputs)
│   ├── sliding/ (Reanimated interactive macro slider shells)
│   └── recipe/ (Cards, steps, ingredients lists)
├── store/
│   └── useMacroStore.ts (Zustand slice for volatile UI filters & sync status)
├── db/
│   ├── schema.ts (Drizzle definitions for SQLite)
│   ├── sync.ts (Delta Sync background engine logic)
│   └── db.ts (SQLite connection wrapper)
├── lib/
│   ├── supabase.ts (Supabase JS client init)
│   └── algorithms/
│       └── smartBridge.ts (Pure mathematical macro calculation functions)
├── assets/
│   └── fonts/ & images/ (Strictly limited to static app icons to respect 100MB limit)
└── tests/
    └── algorithms/
        └── smartBridge.test.ts (Jest tests for pure logic)
```

### Architectural Boundaries

**API / Data Boundaries:**
- The Application NEVER awaits Supabase directly for UX.
- `lib/supabase.ts` is the strict outer boundary for Cloud Auth and delta-fetching.
- `db/sync.ts` is the strict boundary that transforms Supabase payloads into Drizzle `INSERT` or `UPDATE` statements for local storage.

**Component Boundaries:**
- `app/` routes only compose components; they contain zero database queries or math algorithms.
- `components/sliding/` strictly handles `SharedValues` for Reanimated 60fps gestures and only commits to Zustand on gesture completion.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- "Smart Bridging Algorithm" → `lib/algorithms/smartBridge.ts` & `tests/algorithms/smartBridge.test.ts`
- "100MB Offline-First Limit" → Enforced by Image caching strategies in `components/ui/` and schema limits in `db/schema.ts`
- "60FPS Sliding UX" → `components/sliding/` & `store/useMacroStore.ts`
- "Admin Portal" → `app/admin/index.tsx`

### Integration Points

**Data Flow Sequence:**
1. Background mount triggers `db/sync.ts`.
2. Sync fetches delta from Supabase → Writes to local SQLite.
3. Zustand (`useMacroStore`) observes local db update (if active on screen) → Triggers React UI to re-read from SQLite.
4. User slides a Macro filter → UI updates at 60fps via Reanimated. On finger lift, Zustand state updates. SQLite is queried with new filter limits by Drizzle.

## Architecture Validation Results

### Coherence Validation ✅
**Decision Compatibility:**
High. The combination of Expo, `expo-sqlite`, Drizzle ORM, and Supabase JS is the modern standard for offline-first React Native. Zustand pairs perfectly with `react-native-reanimated` for performance isolation.

**Structure Alignment:**
The file tree successfully enforces the separation of Pure Algorithmic Math (`lib/algorithms`), Database sync logic (`db/sync.ts`), and UI Presentation (`app/`).

### Requirements Coverage Validation ✅
**Functional Requirements Coverage:**
100% of the 21 FRs defined in the PRD can be safely mapped to this folder structure.

**Non-Functional Requirements Coverage:**
- *60FPS UI:* Defended by the strict Reanimated + Zustand event-sourcing rule.
- *<100MB Storage:* Defended by strict `assets/` limits and local SQLite control.
- *RLS Security:* Defended by Supabase core design.

### Gap Analysis Results
- **Minor Issue:** The file tree omitted `eas.json` (Expo Application Services config), which will be required for CI/CD cloud builds. I will ensure agents generate this during implementation.

### Architecture Completeness Checklist
**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Process patterns (60FPS limits) documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established

### Architecture Readiness Assessment
**Overall Status:** **READY FOR IMPLEMENTATION**
**Confidence Level:** HIGH

**First Implementation Priority:**
```bash
npx create-expo-app@latest CookWiki_app --template blank-typescript
```
