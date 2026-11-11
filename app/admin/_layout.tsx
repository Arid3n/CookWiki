import { Stack, Redirect } from 'expo-router';
import { useAdmin } from '@/hooks/useAdmin';
import { ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)/" />;
  }

  return (
    <Stack screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: '#1E293B' },
      headerTintColor: '#fff',
    }} />
  );
}
