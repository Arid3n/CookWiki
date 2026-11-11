# CookWiki Advanced Feature Implementation Plan

This plan outlines the sequential rollout of the curated brainstorming features. As requested, the implementation is structured one phase at a time to allow for thorough testing and validation between each major addition. 

## User Review Required
Please review the order of operations below. Once you approve this plan, I will immediately execute **Phase 0** and **Phase 1**, and then pause for you to test them.

## Proposed Changes

### Phase 0: Immediate Polish (Haptics & Default Images)
Before adding new features, we will clean up the existing UI:
- **Remove Haptics:** Strip all `expo-haptics` imports and calls from the entire codebase to ensure a completely silent interaction model.
- **Default Recipe Images:** Modify the placeholder for recipes without photos in `app/(tabs)/index.tsx` and `app/recipe/[id].tsx`. It will use a background color slightly darker than the app's base background (achieved via a semi-transparent black overlay) and center the existing `food-variant` icon.

### Phase 1: Seamless Ingredient Creation
- **Inline Creation Modal:** Instead of navigating away to a different screen (which would erase the recipe you are currently writing), we will render an inline Modal inside `app/recipe/create.tsx`.
- **Search Fallback:** When a user searches for an ingredient and gets zero results, a `+ Add "[Query]"` button will appear. Clicking it opens the modal with the name pre-filled. Once saved, the modal closes and the new ingredient is instantly added to the recipe draft.

### Phase 2: Dynamic Portion Scaling
- **Schema Update:** Add a `servings` integer field to the `recipes` table in `schema.ts`.
- **Chatbot Integration:** Update the AI Sous-Chef prompt in `app/chat.tsx` to automatically generate and save a base serving size for AI-generated recipes.
- **Creation UI:** Add a "Servings" number input in `app/recipe/create.tsx`.
- **Scaling UI:** In `app/recipe/[id].tsx`, add a dynamic `+` / `-` stepper that visually scales all ingredient amounts up or down based on the desired servings versus the base servings.

### Phase 3: Recipe Forking
- **Fork Action:** Add a "Fork Recipe" button in the navigation bar of `app/recipe/[id].tsx`.
- **Draft Pre-loading:** Modifying `app/recipe/create.tsx` to accept a `forkId` parameter. When present, it will fetch the target recipe and its ingredients from the database and populate the draft state, allowing the user to tweak and save it as a brand new, personalized recipe.

### Phase 4: Step-by-Step "Story Mode"
- **Dependency:** Install `expo-keep-awake` to prevent the screen from turning off while cooking.
- **Cooking Interface:** Add a "Start Cooking" button in `app/recipe/[id].tsx` that opens a full-screen, immersive modal. This modal will use a horizontally paginated `FlatList` to display a single instruction step per screen in very large, easily readable typography.

### Phase 5: Macro Contribution Visualizer
- **Visual Breakdown:** In `app/recipe/[id].tsx`, beneath the total recipe macros, we will add horizontal stacked-bar charts built using native `View` flex properties (no heavy chart libraries required).
- **Data Mapping:** This will visually demonstrate exactly which ingredients in the list are responsible for the majority of the fat, protein, and carbs in the dish.

### Phase 6: Smart Ingredient Substitutor
- **Interactive Ingredients:** Make the ingredients list in `app/recipe/[id].tsx` clickable.
- **AI Engine:** Tapping an ingredient opens a quick prompt triggering the AI. The AI will scan the user's local `userPantry` and suggest the best substitute using *only* what the user actually owns.
- **Dynamic Override:** The app will temporarily override the recipe state in memory, replacing the missing ingredient with the substitute and recalculating the total macros.

### Phase 7: Recipe Playlists (Cookbooks)
- **Schema Update:** `playlists` and `playlist_recipes` tables have been added to the local database schema.
- **Recipe Action:** Add a "Bookmark / Add to Playlist" button (using a bookmark icon) to the top navigation bar of `app/recipe/[id].tsx`.
- **Bottom-Sheet UI:** Tapping the bookmark opens a slide-up modal where the user can:
  - See all their existing playlists.
  - Check/uncheck the current recipe into multiple playlists.
  - Create a new playlist on the fly (with a custom name and emoji).
- **Playlists Tab:** We will add a new dedicated tab to the app navigation (`app/(tabs)/playlists.tsx`) that displays all user playlists as beautiful horizontal cards. Clicking a playlist opens a list of saved recipes within it.

## Verification Plan

### Automated/Manual Testing Cadence
Since the goal is to test *between* each implementation:
1. I will execute Phase 0 and Phase 1 together.
2. I will pause and ask you to manually test creating a recipe, searching for a non-existent ingredient, adding it via the new inline modal, and ensuring it successfully drops into your recipe draft.
3. Upon your confirmation, we will proceed to Phase 2 (Portion Scaling), and repeat the verification cycle.
