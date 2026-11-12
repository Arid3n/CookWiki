import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  /** Height below the status bar; the top safe-area inset is added on top. Must match heroHeightFor(route). */
  height: number;
  children?: ReactNode;
}

/** Space and layout for a screen's header content. The orange background itself is HeroBackdrop, behind all screens. */
export default function Hero({ height, children }: Props) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.hero, { height: height + insets.top, paddingTop: insets.top }]}>{children}</View>;
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
});
