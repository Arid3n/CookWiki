---
stepsCompleted: [1, 2, 3]
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md']
---

# CookWiki - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CookWiki, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can create an account and authenticate securely to establish a private data scope.
FR2: Users can manage their profile and session state.
FR3: Users can filter recipes by specific macronutrient and caloric targets.
FR4: Users can search for recipes via standard keyword queries.
FR5: Users can specify available pantry ingredients to constrain recipe discovery.
FR6: Users can view a list of recipes matching their constraints.
FR7: Users can view a unified, sequentially ordered recipe document.
FR8: Users can advance through recipe steps without requiring precision interaction.
FR9: Users can create private recipes by selecting curated global ingredients.
FR10: Users can assign quantitative values to selected ingredients.
FR11: Users can edit and delete their privately created recipes.
FR12: The system can automatically calculate total recipe macros based on ingredient quantities.
FR13: The system can dynamically calculate required portion adjustments to meet user macro constraints.
FR14: The system can identify and suggest a single missing ingredient to fulfill a near-match recipe requirement.
FR15: Administrators can create, edit, and publish global core ingredients.
FR16: Administrators can create, edit, and publish curated recipes to the global database.
FR17: The system can securely store user private recipes and global ingredients locally for offline access.
FR18: The system can synchronize local data updates with the central cloud database.
FR19: Users can visually determine the current network synchronization state.
FR20: The system can safely propagate global ingredient macro updates downstream to recalculate affected private recipes.
FR21: The system must provide a dedicated web-based or desktop Admin portal optimized for rapid bulk ingredient and recipe publishing.

### NonFunctional Requirements

NFR1: The dynamic macro-filtering sliders must maintain 60 frames-per-second (FPS) during real-time interaction on standard mid-tier mobile devices.
NFR2: Local database search queries (keyword and slider) must return and render results in under 200 milliseconds.
NFR3: All private user recipes must be isolated via strict Row Level Security (RLS) policies in Supabase, preventing cross-account data leakage.
NFR4: User auto-tokens must be stored securely using native device encryptions (Keychain/Keystore).
NFR5: All interactive elements within the Active Cooking Mode must have a minimum touch target size of 60x60dp.
NFR6: Core typography contrast ratios must meet standard WCAG AA (4.5:1) minimums for high-glare lighting.
NFR7: The application must cache 100% of user private data locally, ensuring zero-latency retrieval regardless of network connectivity.
NFR8: The complete local offline database (including 500+ anticipated global recipes and assets) must maintain an application footprint of under 100MB to respect limited local device storage.

### Additional Requirements

- **[Starter Template]**: Initialize using `npx create-expo-app@latest CookWiki_app --template blank-typescript`
- Local Database implementation using Drizzle ORM paired with `expo-sqlite`
- Cloud Database and Authentication integration using Supabase PostgreSQL
- State Management synchronization loop utilizing Zustand
- Performance protection isolating math algorithms and complex Reanimated gestures into pure functions and UI thread Worklets
- Delta Sync payload schemas must utilize internal sync status columns rather than physical deletes
- Central infrastructure configured for Expo Application Services (EAS)

### UX Design Requirements

UX-DR1: Implement "Split Deck" mobile layout with top 45% immersive media and bottom 55% solid Control Deck.
UX-DR2: Implement the custom `<MacroSlider>` component natively tied to `PanGestureHandler` and Reanimated `SharedValue` physics to replicate iOS control physics.
UX-DR3: Implement the numeric `<TabularText>` engine utilizing `Reanimated.Text` and strict `fontVariant: ['tabular-nums']` to eliminate jitter.
UX-DR4: Implement the Pure Action Button library (`<PrimaryButton>`, `<SecondaryButton>`, `<TertiaryButton>`) restricted to 60x60dp minimal hit radiuses.
UX-DR5: Enforce Dual High-Contrast styling schema, utilizing Deep Slate (`#0F172A`) for dark mode and Neon Green (`#10B981`)/Amber semantic statuses for bridging feedback.
UX-DR6: Integrate physical, magnetic haptic 'THUD' feedback strictly triggering when target macros cross the exact Zero alignment.
UX-DR7: Provide a "Long-Press" manual override flow transitioning numeric labels into a strict OS `decimal-pad` keyboard for outlier gram inputs.
UX-DR8: Configure the Flat Bottom-Tab navigation (Feed, Pantry, Profile) containing max 1-depth levels and "Gesture Back" screen swiping.
UX-DR9: Implement and clamp dynamic text scaling at `maxFontSizeMultiplier={1.5}` protecting the visual integrity of mathematical rigid layouts.

### FR Coverage Map

FR1: Epic 1 - Account & Auth setup
FR2: Epic 1 - Profile & state management
FR3: Epic 2 - Macro/Caloric filtering (Bridger)
FR4: Epic 1 - Standard Keyword search
FR5: Epic 3 - Specify pantry limits
FR6: Epic 1 - View matched recipes
FR7: Epic 1 - View chronological recipe steps
FR8: Epic 1 - Advance recipe steps without precision
FR9: Epic 3 - Create private recipe
FR10: Epic 3 - Quantify ingredients
FR11: Epic 3 - Edit/Delete private recipes
FR12: Epic 2 - Auto-calculate total macros
FR13: Epic 2 - Dynamically calculate portions (Bridger)
FR14: Epic 4 - Identify missing piece
FR15: Epic 5 - Admin create core ingredients
FR16: Epic 5 - Admin create global recipes
FR17: Epic 1 - Offline local cache setup
FR18: Epic 1 - Cloud synchronization loop
FR19: Epic 1 - Visual sync status indicators
FR20: Epic 3 - Global propagation downstream
FR21: Epic 5 - Dedicated Admin portal

## Epic List

### Epic 1: Foundation & The Core Feed (Offline Discovery)
[Users can install the app, authenticate, sync the global recipe catalog to their device for zero-latency offline use, and securely browse/view standard recipes using the "Split Deck" UI]
**FRs covered:** FR1, FR2, FR4, FR6, FR7, FR8, FR17, FR18, FR19

### Story 1.1: Project Initialization & Local Database Setup
As a mobile user,
I want the application to load instantly from a local cache,
So that I can use the app with zero internet latency in my kitchen.

**Acceptance Criteria:**
**Given** the user launches CookWiki,
**When** the app mounts,
**Then** the Expo Blank TypeScript template and Drizzle ORM (`expo-sqlite`) must successfully initialize.

### Story 1.2: Cloud Authentication & Background Sync Loop
As a mobile user,
I want to securely log in and have global recipes sync to my device,
So that my offline database is populated with the latest recipes.

**Acceptance Criteria:**
**Given** the user authenticates via Supabase Auth (FR1, FR2),
**When** successful login occurs,
**Then** the background sync engine (`db/sync.ts`) pulls down un-synced global recipes (FR17, FR18),
**And** a discrete visual sync status indicator displays state (FR19).

### Story 1.3: Responsive "Split Deck" Discovery Feed
As an active home cook,
I want to view a full-screen feed of recipes using the Split Deck layout and execute lightning-fast offline searches,
So that I can effortlessly browse content without waiting for network calls.

**Acceptance Criteria:**
**Given** the user is viewing the primary tab (UX-DR8),
**When** recipes are loaded from the local SQLite cache,
**Then** they render using the 45% media / 55% Control Deck layout (UX-DR1),
**And** the user can filter the list via keyword search executing under 200ms (FR4, FR6, NFR2).

### Story 1.4: Chronological Recipe Viewing
As an active cook,
I want to swipe through recipe steps sequentially,
So that I can follow instructions without needing precise taps with messy hands.

**Acceptance Criteria:**
**Given** the user selects a recipe from the 1.3 Feed,
**When** they enter the active Cook view,
**Then** the recipe instructions are presented sequentially (FR7),
**And** steps can be advanced using large, precision-free gestures complying with 60x60dp minimums (FR8, NFR5).

### Epic 2: The Algorithmic Kitchen Bridger (60FPS Dynamic Adjustment)
[Users can instantly scale and slide recipe components to fit targeted macro goals, interacting with satisfying "Messy Kitchen" friendly physics and receiving Haptic Thuds when mathematically aligned]
**FRs covered:** FR3, FR12, FR13

### Story 2.1: Mathematical UI Isolate (`<TabularText>`)
As a mobile user,
I want the numerical macro values to scale smoothly without shaking horizontally,
So that I can read the data easily while the app recalculates it instantly.

**Acceptance Criteria:**
**Given** the numerical macro values change dynamically,
**When** the `<TabularText>` components render,
**Then** they must utilize `Reanimated.Text` and strictly enforce `fontVariant: ['tabular-nums']` to avoid layout jitter (UX-DR3).

### Story 2.2: The Core Bridger (`<MacroSlider>`) & Spring Physics
As an active cook,
I want to use a massive analog slider to scale a recipe's macronutrients,
So I can adjust servings seamlessly through touch physics rather than manual typing.

**Acceptance Criteria:**
**Given** the user interacts with the `<MacroSlider>` component,
**When** the user drags horizontally,
**Then** the gesture utilizes `PanGestureHandler` and Reanimated `SharedValue` natively,
**And** the slider follows realistic spring physics without firing standard React Javascript re-renders until released (UX-DR2).

### Story 2.3: Algorithmic Math Isolation
As a strictly-tracking cook,
I want the portion scaling to happen absolutely perfectly without crashing,
So that the macro targets are bridged properly.

**Acceptance Criteria:**
**Given** the user moves the macro slider,
**When** the macronutrient target updates,
**Then** pure mathematical functions in `lib/algorithms` dynamically calculate the required serving adjustments (FR13),
**And** they automatically recalculate the total overarching recipe macros (FR12) purely on UI thread Worklets.

### Story 2.4: Magnetic Haptics & Long-Press Manual Override
As a strict dieter,
I want satisfying physical feedback when I hit my target, and a way to manually type extreme values,
So that I can trust the math without looking closely, and edge cases aren't blocked.

**Acceptance Criteria:**
**Given** the recipe's scale perfectly matches the user's remaining daily macro targets,
**When** dragging,
**Then** the app fires a heavy magnetic haptic 'THUD' and flashes neon green (UX-DR5, UX-DR6).
**Given** the user needs an extreme outlier value,
**When** they long-press the Macro numeric display,
**Then** the slider disappears and the OS `decimal-pad` keyboard opens for manual override (UX-DR7).

### Epic 3: Personal Pantry & Private Recipe Creation
[Users can aggressively filter recipes by adding items to their pantry, and creatively construct highly personalized, private recipes securely isolated from the public via RLS]
**FRs covered:** FR5, FR9, FR10, FR11, FR20

### Story 3.1: The Binary Local Pantry
As a home cook,
I want to log the ingredients I currently have in my house by searching the offline database,
So that I can filter my recipe feed to show only what I can cook *right now*.

**Acceptance Criteria:**
**Given** the user loads the Pantry Tab,
**When** they search and select a global ingredient to "Add",
**Then** the ingredient is added permanently to their local SQLite pantry inventory (FR5),
**And** the global Recipe Feed from Story 1.3 now strictly filters against this binary list.

### Story 3.2: Private Recipe Creation & Scope Isolation (RLS)
As a home cook,
I want to create my own unique recipes independently from the global catalog,
So that I can use the CookWiki sliding bridging physics on my grandmother's secret spaghetti.

**Acceptance Criteria:**
**Given** the user opens the "Create Recipe" modal,
**When** they save the recipe,
**Then** the recipe is written with a `user_id` constraint isolating it securely in Supabase RLS policies (FR1),
**And** users can view, edit, and delete ONLY their privately created recipes locally and remotely (FR9, FR11).

### Story 3.3: Quantifying Custom Ingredients
As a home recipe creator,
I want to add verified global ingredients to my private recipe,
So that my recipe automatically calculates its total macros using verified data.

**Acceptance Criteria:**
**Given** the user is editing their private recipe,
**When** they add a global ingredient,
**Then** they can assign specific quantitative values to it via the standard numeric keyboard override (FR10),
**And** the overarching recipe's total macros auto-calculate identically to a global recipe.

### Story 3.4: Downstream Macro Propagation
As a developer/admin,
I want global ingredient macro adjustments to propagate to users' private recipes,
So that if an Admin fixes a typo in global "Chicken Breast" macros, users' personal recipes auto-update securely.

**Acceptance Criteria:**
**Given** the background sync engine pulls a structural change to a referenced global ingredient,
**When** the local app restarts,
**Then** the user's private recipes relying on that ingredient are automatically recalculated based on the new weights without user intervention (FR20).

### Epic 4: Algorithmic Missing Link Detection
[Users are automatically recommended a single missing ingredient (or intelligent swap) when their current pantry restricts them from meeting a recipe's macro target]
**FRs covered:** FR14

### Story 4.1: Missing Node Algorithmic Discovery
As a developer/system execution context,
I need a pure function algorithm to identify single missing bridge ingredients,
So that it can execute rapidly over thousands of recipes against the user's pantry.

**Acceptance Criteria:**
**Given** the user triggers a "What am I missing?" check,
**When** their pantry query executes,
**Then** the Math Engine isolates recipes missing exactly 1 ingredient to be structurally complete (FR14),
**And** it outputs the generic global identifier matching the gap.

### Story 4.2: The Suggestion UI Interaction
As a home cook,
I want to visually see exactly what 1 ingredient I would need to buy to cook a meal I otherwise couldn't,
So that I can make quick grocery decisions.

**Acceptance Criteria:**
**Given** the user is viewing near-miss recipes,
**When** the recipe renders in the Split Deck feed,
**Then** the missing ingredient is highlighted distinctly from available pantry items,
**And** tapping it provides an option to temporarily "mock" it into the inventory so the Macro Bridger feature from Epic 2 can test if it fits their daily goals.

### Epic 5: Global Content Curation (Admin Portal)
[Data administrators can rapidly construct, curate, and blast out mass-verified data nodes (ingredients/recipes) to fuel the offline-first clients]
**FRs covered:** FR15, FR16, FR21

### Story 5.1: The Web Admin Role & Access Control
As an application owner,
I want a dedicated web-based/desktop portal optimized for administration,
So that I can easily type massive amounts of structural data using a physical keyboard and giant screen.

**Acceptance Criteria:**
**Given** the user attempts to access the admin portal (`/admin` in Expo Router),
**When** the routing executes,
**Then** Supabase verifies they carry an `admin` role claim before granting access,
**And** the UI cleanly scales up to fit landscape desktop web browsers natively (FR21).

### Story 5.2: Global Ingredient Provisioning
As a data admin,
I want to bulk upload or manually construct verified baseline ingredients,
So that users' private recipes can rely on perfectly accurate macro references.

**Acceptance Criteria:**
**Given** the admin is authenticated in the web portal,
**When** they create a new ingredient,
**Then** it is saved to the global Supabase space with standard protein, carb, and fat fields strictly enforced (FR15),
**And** active mobile clients automatically pull down the node on their next sync cycle (FR18/FR20).

### Story 5.3: Global Recipe Definition
As a data admin,
I want to combine global ingredients into standard global recipes,
So that new users have a robust catalog of meals waiting for them on day 1.

**Acceptance Criteria:**
**Given** global ingredients exist,
**When** the admin creates a new global recipe,
**Then** they can define the structural portions, steps, and total overarching macros (FR16),
**And** these are securely transmitted to the cloud down to user devices mapped into the Split Deck UI.
