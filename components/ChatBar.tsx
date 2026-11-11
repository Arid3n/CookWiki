import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/ui/Icon';
import RingButton from '@/components/ui/RingButton';
import { useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import { colors, fonts, sizes, space } from '@/lib/ui/theme';

/** Layout: 56 (dock) + 8 below = 64pt, plus the bottom safe-area inset. */
export const CHAT_BAR_HEIGHT = 64;

export default function ChatBar() {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState('');

  const open = () => {
    const q = text.trim();
    setText('');
    router.push({ pathname: '/chat', params: q ? { q } : {} });
  };

  return (
    <View style={[styles.bar, { paddingBottom: 8 + (keyboardHeight > 0 ? keyboardHeight : insets.bottom) }]}>
      <View style={styles.dock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan nutrition label"
          onPress={() => router.push('/scan')}
          hitSlop={4}
          style={({ pressed }) => [styles.scan, pressed && styles.pressed]}
        >
          <Icon name="camera" size={18} color={colors.peach} />
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
        <RingButton kind="send" size={sizes.send} icon="send" accessibilityLabel="Send to chat" onPress={open} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: space.gutter,
    backgroundColor: colors.bg,
  },
  dock: {
    height: sizes.dock,
    borderRadius: sizes.dock / 2,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 5,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
  },
  scan: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 6,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
});
