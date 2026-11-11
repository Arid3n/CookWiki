# Story 2.2: The Core Bridger & Spring Physics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I need a foundational physics engine isolated to the UI thread,
So that touch events natively translate into mathematically precise spring offsets.

## Acceptance Criteria

1. **Given** the isolated `PhysicsEngine`,
2. **When** a user drags a layout node,
3. **Then** the transformation floats are handled purely within a custom Reanimated UI Worklet without ever bouncing back over the JavaScript bridge (NFR1).

## Tasks / Subtasks

- [x] Task 1: Reanimated Gesture Logic
  - [x] Subtask 1.1: Build `hooks/useDraggablePhysics.ts` hooking directly into `react-native-gesture-handler` via `Gesture.Pan()`.
- [x] Task 2: UI Thread Encapsulation
  - [x] Subtask 2.1: Enforce Reanimated `"worklet"` strings or UI-thread scoped modifiers on all internal gesture functions to trap the coordinate mutations.
  - [x] Subtask 2.2: Extract exact Pan `translationX` and `translationY` limits, bouncing the `useSharedValue` offsets dynamically with fluid `withSpring` recoveries natively on the UI layer when the gesture ends.
- [x] Task 3: Component Mapping integrations 
  - [x] Subtask 3.1: Apply the gesture bindings onto `<CoreBridger />` directly.

## Dev Notes

- **The UI Isolate:** The physics store created in 2.1 is strictly for programmatic programmatic layout snapping (JS Thread). **Story 2.2 focuses exclusively on 120hz native Touch Drag events.**
- **Gesture Handler V2:** Utilize `Gesture.Pan()` from `react-native-gesture-handler` inside a `GestureDetector` instead of legacy `<PanGestureHandler>`.
- **Constraint Bounding:** The `useDraggablePhysics` hook must trap Reanimated's UI loop natively, using purely `useSharedValue` variants decoupled from React.

### References

- [Source: planning-artifacts/epics.md#Story 2.2]
- [Previous: implementation-artifacts/2-1-mathematical-ui-isolate.md]

### Completion Notes List

- ✅ Applied `<GestureHandlerRootView>` entirely around the global layout boundary.
- ✅ `<CoreBridger />` now integrates `<GestureDetector>` natively handling Pan translations locally over 120hz physics scopes.
- ✅ `hooks/useDraggablePhysics.ts` handles Spring physics recoils natively on the UI thread without dropping bridge loops to JS!

### File List

- Mixed: `app/_layout.tsx`
- Mixed: `components/PhysicsEngine/CoreBridger.tsx`
- Added: `hooks/useDraggablePhysics.ts`

### Senior Developer Review (AI)

#### Action Items
- [x] [Review][Patch] Redundant `'worklet'` directives — `Gesture.Pan()` callbacks in Gesture Handler V2 run on the UI thread automatically. The explicit `'worklet'` string directives were misleading no-ops. Replaced with accurate clarifying comments to protect future engineers from confusion. Location: `hooks/useDraggablePhysics.ts`
