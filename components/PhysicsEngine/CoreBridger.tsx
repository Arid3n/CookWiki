import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { usePhysicsStore } from '@/store/physicsStore';
import { ViewStyle, StyleProp } from 'react-native';
import { useDraggablePhysics } from '@/hooks/useDraggablePhysics';

interface CoreBridgerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CoreBridger({ children, style }: CoreBridgerProps) {
  // Directly bind internal 120hz native interaction physics natively on the UI thread
  const { panGesture, translateX, translateY } = useDraggablePhysics();

  useEffect(() => {
    /** 
     * @architecture_constraint
     * WARNING: This unidirectional Zustand-to-Reanimated bridge isolates float updates from React rendering,
     * but fires native React-Native mappings over the JavaScript thread!
     * 
     * It is designed EXCLUSIVELY for low-frequency programmatic snapping targets (e.g., Center Frame on Tap).
     * DO NOT pipe raw 120hz user drag `onUpdate` matrices into the physicsStore—doing so will 
     * saturate the JS bridge and trigger UI stuttering. Real-time physical Touch Pan events must remain
     * encapsulated tightly inside Reanimated UI Worklets locally!
     */
    const unsubscribe = usePhysicsStore.subscribe(
      (state) => state.activePan,
      (pan) => {
        translateX.value = withSpring(pan.x, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(pan.y, { damping: 15, stiffness: 200 });
      }
    );
    return () => unsubscribe();
  }, [translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value }
      ]
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
