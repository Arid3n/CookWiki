import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { colors } from '@/lib/ui/theme';

/**
 * Wraps every screen except the calculator. While the calculator sheet is open, this draws the dim over the
 * screen (and the shared header behind it) instantly, so the dim does not ride along with the sheet's slide.
 */
export default function DimmedScreen({ children }: { children: ReactNode }) {
  const dimmed = usePathname() === '/calculator';
  return (
    <View style={styles.fill}>
      {children}
      {dimmed && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dim: { backgroundColor: colors.backdrop },
});
