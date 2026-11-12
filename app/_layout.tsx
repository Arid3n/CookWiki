import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CalculatorFab from "@/components/CalculatorFab";
import DimmedScreen from "@/components/ui/DimmedScreen";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { syncFromSupabase } from "@/lib/library/repository";
import { clearLocalLibrary } from "@/lib/library/localDb";
import * as SplashScreen from "expo-splash-screen";
import AppStatusBar from "@/components/ui/AppStatusBar";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";
import { colors } from "@/lib/ui/theme";
import { useAppFonts } from "@/lib/ui/useAppFonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

// A failed sync is silent: the library keeps showing the local copy.
const syncQuietly = () => {
  syncFromSupabase().catch(() => {});
};

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const reduceMotion = useReducedMotion();
  // Router calls before the Stack mounts (font gate) would throw; set once mounted.
  const navReady = useRef(false);

  useEffect(() => {
    if (fontsReady) {
      navReady.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncQuietly();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearLocalLibrary().catch(() =>
          clearLocalLibrary().catch((e) =>
            console.warn('Failed to clear local library on sign-out', e),
          ),
        );
        // Drop the previous user's screens so back-navigation cannot reach them.
        if (navReady.current) {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/login');
        }
      } else if (event === 'SIGNED_IN') {
        syncQuietly();
        if (navReady.current) router.replace('/library');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeroBackdrop />
      <Stack
        screenLayout={({ route, children }) => (route.name === 'calculator' ? children : <DimmedScreen>{children}</DimmedScreen>)}
        screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade', animationDuration: 180, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="library" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="calculator" options={{ presentation: "transparentModal", headerShown: false, animation: "slide_from_bottom", contentStyle: { backgroundColor: "transparent" } }} />
      </Stack>
      <CalculatorFab />
      <AppStatusBar />
    </GestureHandlerRootView>
  );
}
