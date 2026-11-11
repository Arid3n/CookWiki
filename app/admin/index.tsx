import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AdminDashboard() {
  // Web-First Responsive Boundaries
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={isWeb ? [styles.webContainer, { alignSelf: 'center', maxWidth: 1200, width: '100%' }] : styles.mobileContainer}>
        <Text style={styles.headerTitle}>Global Curation Authority</Text>
        <Text style={styles.headerSubtitle}>Massive parameters verified safely across remote sync domains.</Text>

        <View style={isWeb ? styles.webGrid : styles.mobileGrid}>
            <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/ingredients' as any)}>
                <MaterialCommunityIcons name="food-apple" size={48} color="#10B981" />
                <Text style={styles.cardTitle}>Ingredient Provisioning</Text>
                <Text style={styles.cardDesc}>Upload base nodes enforcing protein, carbs, and fat arrays structurally.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/recipes' as any)}>
                <MaterialCommunityIcons name="format-list-checks" size={48} color="#3B82F6" />
                <Text style={styles.cardTitle}>Recipe Definitions</Text>
                <Text style={styles.cardDesc}>Construct verified standard structural maps pushing downstream natively.</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  webContainer: { padding: 48 },
  mobileContainer: { padding: 24 },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  headerSubtitle: { color: '#94A3B8', fontSize: 16, marginTop: 8, marginBottom: 40 },
  webGrid: { flexDirection: 'row', gap: 24 },
  mobileGrid: { flexDirection: 'column', gap: 16 },
  card: { flex: 1, backgroundColor: '#1E293B', padding: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  cardDesc: { color: '#64748B', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 }
});
