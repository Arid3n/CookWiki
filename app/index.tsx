import { useEffect } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { runBackgroundSync } from "@/db/sync";

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        runBackgroundSync();
        router.replace('/(tabs)/');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#0F172A' }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>CookWiki Booting...</Text>
      <Text style={{ color: '#64748B', fontSize: 14, marginTop: 8 }}>Securing local context bounds.</Text>
    </View>
  );
}
