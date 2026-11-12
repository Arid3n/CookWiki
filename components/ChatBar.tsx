import { useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/ui/Icon';
import RoundButton from '@/components/ui/RoundButton';
import { dockRightReserve } from '@/lib/calculator/fabLayout';
import { useKeyboardLift } from '@/lib/ui/useKeyboardHeight';
import { colors, fonts, sizes, space, shape } from '@/lib/ui/theme';

/** Layout: 56 (dock) + 8 below = 64pt, plus the bottom safe-area inset. */
export const CHAT_BAR_HEIGHT = 64;

export default function ChatBar() {
  const insets = useSafeAreaInsets();
  const { style: liftStyle } = useKeyboardLift();
  const [text, setText] = useState('');

  const open = () => {
    const q = text.trim();
    setText('');
    router.push({ pathname: '/chat', params: q ? { q } : {} });
  };

  return (
    <Animated.View style={[styles.bar, { paddingBottom: 8 + insets.bottom }, liftStyle]}>
      <View style={styles.dock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan nutrition label"
          onPress={() => router.push('/scan')}
          hitSlop={4}
          style={({ pressed }) => [styles.scan, pressed && styles.pressed]}
        >
          <Icon name="camera" size={Math.round(sizes.send * 0.44)} color={colors.accent} />
        </Pressable>
        <TextInput
          accessibilityLabel="Ask the chat"
          style={styles.input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={open}
          placeholder="Ask about a food..."
          placeholderTextColor={colors.sub}
          returnKeyType="send"
        />
        <RoundButton size={sizes.send} icon="send" accessibilityLabel="Send to chat" onPress={open} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: space.gutter,
    // The calculator button sits in the bottom right corner beside the dock.
    paddingRight: dockRightReserve(space.gutter, sizes.fab),
    backgroundColor: colors.bg,
  },
  dock: {
    minHeight: sizes.dock,
    borderRadius: shape.bar,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 3,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
  },
  scan: {
    width: sizes.send,
    height: sizes.send,
    borderRadius: shape.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 6,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
});
