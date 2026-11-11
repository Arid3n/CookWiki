# Story 2.4: Magnetic Haptics & Long-Press Manual Override

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a strict dieter,
I want satisfying physical feedback when I hit my target, and a way to manually type extreme values,
So that I can trust the math without looking closely, and edge cases aren't blocked.

## Acceptance Criteria

1. **Given** the recipe's scale perfectly matches the user's remaining daily macro targets,
2. **When** dragging,
3. **Then** the app fires a heavy magnetic haptic 'THUD' and flashes neon green (UX-DR5, UX-DR6).
4. **Given** the user needs an extreme outlier value,
5. **When** they long-press the Macro numeric display,
6. **Then** the slider disappears and the OS `decimal-pad` keyboard opens for manual override (UX-DR7).

## Tasks / Subtasks

- [x] Task 1: Haptic Feedback Engine
  - [x] Subtask 1.1: Install `expo-haptics`. Compile bridging logic coupling native `Haptics.impactAsync()` from the JavaScript thread mapping back up to Reanimated using `runOnJS` since haptics cannot natively originate inside Worklets.
- [x] Task 2: Long-Press Gestures
  - [x] Subtask 2.1: Map `Gesture.LongPress()` concurrently utilizing `react-native-gesture-handler` across the typography rendering numeric output.
- [x] Task 3: Decimal Pad Manual Override
  - [x] Subtask 3.1: Mount a standard React Native `TextInput` mapping `keyboardType="decimal-pad"` handling raw integer override logic decoupled structurally from sliders.

## Dev Notes

- **Worklet isolation limits:** Native APIs like `Haptics` and `Vibration` cannot be executed purely on the UI thread Worklet. They require asynchronous `runOnJS` calls dropping back down to the main bridge thread.
- **Concurrent Drag vs Press:** Ensure `Gesture.Pan()` arrays are logically insulated from `Gesture.LongPress()` triggers using exclusive handlers or threshold timeouts to prevent accidental UI stutter.

### References

- [Source: planning-artifacts/epics.md#Story 2.4]
- [Previous: implementation-artifacts/2-3-algorithmic-math-isolation.md]

### Completion Notes List

- ✅ Bound `<GestureDetector>` exclusively executing LongPress mappings over textual layouts explicitly.
- ✅ `<Modal>` decimal overrides securely mapped directly back to global Reanimated memory payloads bypassing standard closures.
- ✅ `expo-haptics` triggers accurately decoupled via pure JS-thread closures explicitly bound over native threshold releases.

### File List

- Modified: `components/MacroSlider/MacroSlider.tsx`

### Senior Developer Review (AI)

#### Action Items
- ✅ [Verified] Zero defects found. The `runOnJS(setModalVisible)` correctly hops the bridge separating Reanimated Worklets from React State. The LongPress `GestureDetector` applies over the text node specifically, avoiding collision with the underlying community Slider physics. The `parseInt` overrides bounds perfectly trap empty nodes securely rejecting destructive inputs. No structural refactoring requested!
