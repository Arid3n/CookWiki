import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Modal, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { useAnimatedProps, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useMacroSlider } from '@/hooks/useMacroSlider';
import { Macros } from '@/lib/algorithms/macros';

const AnimatedSlider = Animated.createAnimatedComponent(Slider);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface MacroSliderProps {
  baseMacros: Macros;
  maxCalories?: number;
}

export function MacroSlider({ baseMacros, maxCalories = 2000 }: MacroSliderProps) {
  const { targetCalories, dynamicMacros } = useMacroSlider(baseMacros);
  const [modalVisible, setModalVisible] = useState(false);
  const [overrideValue, setOverrideValue] = useState('');

  const animatedSliderProps = useAnimatedProps(() => {
    return {
      value: targetCalories.value,
    };
  });

  const animatedProteinProps = useAnimatedProps(() => {
    return { text: `Protein: ${dynamicMacros.value.protein}g` } as any;
  });

  // Execute haptics strictly on the JS Thread bridged securely from Worklets
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const longPressGesture = Gesture.LongPress()
    .onEnd(() => {
      // Toggle manual override input modal via bridge cleanly without UI-thread drops
      runOnJS(setModalVisible)(true);
    });

  const handleManualOverrideSubmit = () => {
    const num = parseInt(overrideValue, 10);
    if (!isNaN(num) && num >= 0) {
      targetCalories.value = num;
      // Physical reinforcement on mathematical bounds
      triggerHaptic();
    }
    setModalVisible(false);
    setOverrideValue('');
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={longPressGesture}>
        <AnimatedTextInput 
          animatedProps={animatedProteinProps} 
          style={styles.macroText} 
          editable={false} 
        />
      </GestureDetector>
      
      <AnimatedSlider
        style={{ width: '100%', height: 40 }}
        minimumValue={0}
        maximumValue={maxCalories}
        step={10}
        minimumTrackTintColor="#10B981"
        maximumTrackTintColor="#334155"
        animatedProps={animatedSliderProps}
        onValueChange={(val) => {
           targetCalories.value = val;
        }}
        onSlidingComplete={() => {
           // Provide heavy magnetic physics at threshold stops
           triggerHaptic();
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
         <View style={styles.modalBg}>
            <View style={styles.modalCard}>
               <Text style={styles.modalTitle}>Extreme Outlier Override</Text>
               <TextInput 
                 style={styles.decimalInput} 
                 keyboardType="decimal-pad" 
                 value={overrideValue}
                 onChangeText={setOverrideValue}
                 placeholder="0.00"
                 placeholderTextColor="#64748B"
                 autoFocus
               />
               <TouchableOpacity style={styles.modalButton} onPress={handleManualOverrideSubmit}>
                 <Text style={styles.modalButtonText}>LOCK THUD</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginVertical: 16,
  },
  macroText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  decimalInput: {
    backgroundColor: '#0F172A',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#475569'
  },
  modalButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1
  }
});
