import { useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export function useDraggablePhysics() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Scope start positions completely natively preventing JS thread interruptions
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Gesture Handler V2 callbacks run natively on the UI thread automatically — no 'worklet' needed
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Raw 120hz touch offset mutations stay fully on the UI thread; the JS bridge is never touched
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      // Spring recoil back to origin — executed UI-thread side, zero JS bridge round-trip
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  return { panGesture, translateX, translateY };
}
