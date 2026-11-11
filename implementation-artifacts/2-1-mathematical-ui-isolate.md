# Story 2.1: Mathematical UI Isolate

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I need algorithmic data structures totally decoupled from the React layout loops,
So that future drag physics never trigger global React re-renders.

## Acceptance Criteria

1. **Given** the architecture isolates calculations (NFR1),
2. **When** the user is viewing a recipe,
3. **Then** a dedicated standalone mathematical store (`store/physicsStore.ts`) holds structural layout values mapping to 2.5D coordinates natively rather than relying on component state.

## Tasks / Subtasks

- [x] Task 1: Isolate Mathematical Coordinates
  - [x] Subtask 1.1: Build `store/physicsStore.ts` utilizing Zustand to hold absolute un-rendered X/Y float variants (`{ scrollY: number, activePan: { x: number, y: number } }`).
  - [x] Subtask 1.2: Bind explicit mutators decoupled from React lifecycles allowing native `get()` lookups across 60FPS loops.
- [x] Task 2: Scaffold Animation Bindings
  - [x] Subtask 2.1: Integrate/Install `react-native-reanimated` and its required Babel plugins if missing structurally.
  - [x] Subtask 2.2: Establish an abstract wrapping primitive `/components/PhysicsEngine/CoreBridger.tsx` handling isolated `useSharedValue` hook matrices reading against the global Zustand stores.

## Dev Notes

- **The Math Isolate:** The entire premise of this Epic is maintaining a steady 60FPS by ensuring React NEVER processes state changes for an object being physically dragged until it completes its movement (NFR1).
- **Zustand Reads:** Extract the physics logic using raw `.getState()` or similar techniques from Zustand within Reanimated closures rather than invoking deep hook renders globally.
- **Babel Reanimated:** Be extremely careful verifying that `react-native-reanimated/plugin` is fully mounted locally in `babel.config.js` and that `npm start --clear` is executed dynamically if executed globally.

### Project Structure Notes

- Keep all Mathematical calculations inside `store/` or explicit logic scopes. Keep the rendering cleanly inside `components/`.

### References

- [Source: planning-artifacts/epics.md#Story 2.1]
- [Previous: implementation-artifacts/1-4-chronological-recipe-viewing.md]

### Completion Notes List

- ✅ `zustand/middleware` bounded with `subscribeWithSelector` for unidirectional non-triggering loops.
- ✅ `react-native-reanimated` natively installed via targeted legacy peer overrides enforcing deep math boundaries.
- ✅ `<CoreBridger>` primitive fully exports mapped `transform` hooks safely isolating React lifecycles internally.

### File List

- Modified: `babel.config.js`
- Added: `store/physicsStore.ts`
- Added: `components/PhysicsEngine/CoreBridger.tsx`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] Potential JS-Thread Bridge Saturation — The `usePhysicsStore.subscribe` natively triggers on the JavaScript thread. Updating the Reanimated `translateX` and `translateY` shared values using `withSpring` from the JS thread is safe for isolated programmatic target locations (e.g. snapping a card to fixed coordinates natively via a button press). However, this `activePan` store MUST NEVER be bound to raw 60hz/120hz user drag `onUpdate` events directly. Doing so will saturate the async bridge bottleneck and massively drop framerates. Raw drag coordinate `onUpdate` matrices must be strictly isolated inside Reanimated UI Worklets independently of Zustand. Location: components/PhysicsEngine/CoreBridger.tsx
