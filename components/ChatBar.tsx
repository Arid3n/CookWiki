import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Layout: 8 + 48 (scan/input/send) + 8 = 64pt, plus the bottom safe-area inset. */
export const CHAT_BAR_HEIGHT = 64;

export default function ChatBar() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const open = () => {
    const q = text.trim();
    setText('');
    router.push({ pathname: '/chat', params: q ? { q } : {} });
  };

  return (
    <KeyboardAvoidingView behavior="padding">
      <View style={[styles.bar, { paddingBottom: 8 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan nutrition label"
          onPress={() => router.push('/scan')}
          style={styles.scan}
        >
          <Ionicons name="camera" size={22} color="#10B981" />
        </Pressable>
        <TextInput
          accessibilityLabel="Ask the chat"
          style={styles.input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={open}
          placeholder="Ask about a food..."
          placeholderTextColor="#94A3B8"
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send to chat"
          onPress={open}
          style={styles.send}
        >
          <Ionicons name="send" size={20} color="#0F172A" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    fontSize: 16,
  },
  scan: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
