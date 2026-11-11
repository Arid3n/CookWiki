---
stepsCompleted: [step-01-init, step-02-discovery, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional]
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: 'mobile_app'
  domain: 'general'
  complexity: 'low'
  projectContext: 'greenfield'
---

# Product Requirements Document - CookWiki

**Author:** Ariden
**Date:** 2026-04-01

## Executive Summary

CookWiki is a greenfield, offline-first mobile application functioning as an infinitely expandable intelligent cookbook. Targeting home cooks requiring precise nutritional tracking without data-entry friction, CookWiki dynamically calculates recipe macros based on ingredient combinations. Designed for messy kitchen environments, it utilizes a high-contrast fluid interface that caches private data locally for rapid, offline-first access with background cloud synchronization.

**Differentiator:** CookWiki acts as an active algorithmic kitchen assistant. It replaces navigation menus with a "Sliding Recipe View" and "Dynamic Nutritional Sliders" for instant real-time filtering, eventually expanding into "Smart Nutritional Bridging" to solve macro constraints mathematically bridging ingredient gaps.

## Success Criteria

### Measurable Outcomes
- **User Velocity:** Users can identify 3 viable, macro-compliant recipe options within 30 seconds of app launch.
- **Content Scale:** Reach 500+ global curated recipes within the first 6 months.
- **Feature Velocity:** Modular architecture allows new major functionalities to ship in under a 2-week sprint.

## User Journeys

### Journey 1: The Daily Cook (Recipes Feed)
Alex enters the app directly into the Recipes Page feed. Using dynamic filters, Alex finds a suitable recipe. Tapping the recipe opens the Recipe Details page, revealing the required ingredients, exact quantities, and step-by-step cooking process.

### Journey 2: Ingredient Exploration (Ingredients Page)
Jordan browses the Ingredients Page to understand the nutritional value of different foods. Tapping on "Almonds", Jordan sees a detailed breakdown of its macros and nutritional values.

### Journey 3: The Contributor (Authentication & Creation)
Riley wants to add a new family recipe. From the Recipes Page, Riley taps "Add Recipe". Since Riley isn't logged in, the app redirects to the Login/Register flow on the User Page. After registering and logging in, Riley is redirected back and successfully adds the recipe. Riley can now view their profile on the User Page, toggle dark mode, and manage their account.

## Innovation & Novel Patterns

- **Smart Nutritional Bridging:** Dynamically calculates mathematical bridges (portion adjustments or single ingredient additions) to fit strict macro constraints. Uses Semantic Ingredient Mapping to avoid scaling non-scalable spices.
- **Binary Pantry-Depletion Engine:** Eliminates tedious gram-tracking. Users log binary possession ("I have Chicken").
- **Visual Macro Barcodes:** *(Brainstorming Addition)* Recipe cards prominently feature thick color bars (Green/Protein, Yellow/Carbs, Red/Fats) proportional to macros for instantaneous visual scanning.

## Mobile Application Architecture & Constraints

- **Platform Strategy:** Cross-platform React Native managed via Expo.
- **Data Architecture:** Local SQLite cache-first retrieval for zero-latency offline access. Foreground Hydration immediately syncs Deltas with Supabase PostgreSQL upon app mount.
- **Security & Multi-Tenancy:** Strict Supabase Row Level Security (RLS) isolates global read-only data from private user content.
- **Minimal Footprint:** No restrictive hardware elements (Camera, GPS, Push Notifications) or In-App Purchases designed for MVP.

## Project Scoping & Phased Roadmap

### MVP Feature Set (Phase 1)
**Focus:** Delivering the core experience interaction loop perfectly.
- Offline-first cache initialization via Supabase.
- "Sliding Recipe View" UI for frictionless reading.
- "Dynamic Nutritional Sliders" for real-time filtering.
- Visual Macro Barcodes for rapid scanning.
- Core Admin global ingredient/recipe population.

### Post-MVP Features
**Phase 2 (Growth):** 
- Smart Nutritional Bridging Algorithm.
- Binary Pantry-Depletion Engine.
- Private Recipe Creation (leveraging global ingredients).

**Phase 3 (Expansion):** 
- Automated grocery list exports.
- Calendar-based macro mapping.

## Functional Requirements (Capability Contract)

### User & Identity Management
- **FR1:** Users can access the "User Page" to register or authenticate if they are logged out.
- **FR2:** Authenticated users can view their profile (name, picture), toggle between Light and Dark mode, and log out from the User Page.
- **FR2.1:** Unauthenticated users attempting to add content (recipes/ingredients) must be redirected to the User Page login flow.

### Content Discovery (Recipes & Ingredients)
- **FR3:** The landing page ('Recipes Page') must display a feed of recipes.
- **FR4:** Users can search and filter the recipe feed constraints.
- **FR5:** Selecting a recipe transitions to a 'Recipe Details' view detailing ingredients, quantities, and the cooking process.
- **FR6:** The 'Ingredients Page' must display a list of ingredients. Selecting an ingredient displays its explicit nutritional values.

### Content Creation & Lifecycle
- **FR9:** Authenticated users can add new recipes from the Recipes Page via an 'Add Recipe' button.
- **FR10:** Authenticated users can add new ingredients from the Ingredients Page via an 'Add Ingredient' button.
- **FR11:** Unauthenticated users tapping creation buttons are redirected to authenticate.

### Algorithmic Assistance
- **FR13:** The system can dynamically calculate required portion adjustments to meet user macro constraints.
- **FR14:** The system can identify and suggest a single missing ingredient to fulfill a near-match recipe requirement.

### Global Administration
- **FR15:** Administrators can create, edit, and publish global core ingredients.
- **FR16:** Administrators can create, edit, and publish curated recipes to the global database.
- **FR21:** The system must provide a dedicated web-based or desktop Admin portal optimized for rapid bulk ingredient and recipe publishing.

### Data Sync & System Management
- **FR17:** The system can securely store user private recipes and global ingredients locally for offline access.
- **FR18:** The system can synchronize local data updates with the central cloud database.
- **FR19:** Users can visually determine the current network synchronization state.
- **FR20:** The system can safely propagate global ingredient macro updates downstream to recalculate affected private recipes.

## Non-Functional Requirements

### Performance
- **NFR1:** The dynamic macro-filtering sliders must maintain 60 frames-per-second (FPS) during real-time interaction on standard mid-tier mobile devices.
- **NFR2:** Local database search queries (keyword and slider) must return and render results in under 200 milliseconds.

### Security & Data Privacy
- **NFR3:** All private user recipes must be isolated via strict Row Level Security (RLS) policies in Supabase, preventing cross-account data leakage.
- **NFR4:** User auto-tokens must be stored securely using native device encryptions (Keychain/Keystore).

### Accessibility & Environment
- **NFR5:** All interactive elements within the Active Cooking Mode must have a minimum touch target size of 60x60dp.
- **NFR6:** Core typography contrast ratios must meet standard WCAG AA (4.5:1) minimums for high-glare lighting.

### Reliability & Footprint
- **NFR7:** The application must cache 100% of user private data locally, ensuring zero-latency retrieval regardless of network connectivity.
- **NFR8:** The complete local offline database (including 500+ anticipated global recipes and assets) must maintain an application footprint of under 100MB to respect limited local device storage.
