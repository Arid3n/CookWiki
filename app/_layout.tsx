import { Stack, router } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { useSyncStore } from "@/store/syncStore";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { runBackgroundSync } from "@/db/sync";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastError = useSyncStore((state) => state.lastError);

  useEffect(() => {
    // Sync on every app open if the user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        runBackgroundSync();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN') {
        runBackgroundSync();
        router.replace('/(tabs)/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {isSyncing && (
        <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 100, flexDirection: 'row', alignItems: 'center' }}>
           <ActivityIndicator color="#10B981" />
           <Text style={{ color: '#10B981', marginLeft: 8, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>SYNCING</Text>
        </View>
      )}
      {!isSyncing && lastError && (
        <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 100, backgroundColor: '#ef4444', padding: 8, borderRadius: 8 }}>
           <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>SYNC ERROR: {lastError}</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
      </Stack>
    </GestureHandlerRootView>
  );
}
