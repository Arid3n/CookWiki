import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { colors } from "@/lib/ui/theme";

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        router.replace('/library');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
