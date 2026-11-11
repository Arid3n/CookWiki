import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Library() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push("/settings")}
        style={{ position: "absolute", top: 56, right: 20 }}
      >
        <Text style={{ color: "#10B981", fontSize: 16 }}>Settings</Text>
      </Pressable>
      <Text style={{ color: "#F1F5F9", fontSize: 22, fontWeight: "bold" }}>Library</Text>
    </View>
  );
}
