import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CalculatorFab from "@/components/CalculatorFab";

export default function RootLayout() {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN') {
        router.replace('/library');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="library" />
        <Stack.Screen name="calculator" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
      <CalculatorFab />
    </GestureHandlerRootView>
  );
}
