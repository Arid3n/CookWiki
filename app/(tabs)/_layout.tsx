import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';

export default function TabLayout() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: t.tabBarBg, borderTopColor: t.tabBarBorder, height: 60, paddingBottom: 10 },
      tabBarActiveTintColor: t.accent,
      tabBarInactiveTintColor: t.textSecondary,
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Recipes', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="book-open-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="ingredients"
        options={{ title: 'Ingredients', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="nutrition" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="pantry"
        options={{ title: 'Pantry', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="fridge-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="discovery"
        options={{ title: 'Discovery', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
