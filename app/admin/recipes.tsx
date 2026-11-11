import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Alert, Platform } from 'react-native';
import { db, expoDb } from '@/db';
import { recipes } from '@/db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

export default function AdminRecipes() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const [globalList, setGlobalList] = useState<any[]>([]);

  const fetchRecipes = async () => {
    try {
      const records = await expoDb.getAllAsync(`SELECT id, title, description FROM recipes WHERE isGlobal = 1 AND isDeleted = 0 ORDER BY createdAt DESC LIMIT 50`);
      setGlobalList(records);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchRecipes(); }, [])
  );

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Invalid Mapping', 'Title cannot be omitted.');
    try {
      const result = await db.insert(recipes).values({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        isGlobal: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }).returning({ id: recipes.id });
      
      setTitle(''); setDescription(''); setInstructions('');
      
      if (result && result.length > 0) {
        router.push(`/recipe/${result[0].id}` as any);
      } else {
        fetchRecipes();
      }
    } catch (e) {
      console.error(e);
      if (Platform.OS === 'web') alert('Database constraint formally rejected.');
      else Alert.alert('Injection Failure', 'Database constraint formally rejected.');
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Global Overarching Recipe Limits</Text>
      </View>

      <View style={[styles.mainLayout, isWeb && { flexDirection: 'row', maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
        <ScrollView style={styles.formPanel}>
          <Text style={styles.panelTitle}>Constructor Bounds</Text>

          <Text style={styles.label}>Standard Nomenclature</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Traditional Bolognese" placeholderTextColor="#64748B" />

          <Text style={styles.label}>Abstract Outline</Text>
          <TextInput 
             style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} 
             value={description} 
             onChangeText={setDescription} 
             multiline 
             placeholder="Short macro-level summary..." 
             placeholderTextColor="#64748B" 
          />

          <Text style={styles.label}>Execution Pipeline</Text>
          <TextInput 
             style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} 
             value={instructions} 
             onChangeText={setInstructions} 
             multiline 
             placeholder="1. Step one\n2. Step two" 
             placeholderTextColor="#64748B" 
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
            <Text style={styles.saveBtnText}>LOCK ROOT & ADD INGREDIENTS</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.listPanel}>
          <Text style={styles.panelTitle}>Verified Standard Catalog</Text>
          <FlatList
             data={globalList}
             keyExtractor={i => i.id}
             style={{ width: '100%' }}
             contentContainerStyle={{ paddingBottom: 40 }}
             renderItem={({item}) => (
               <TouchableOpacity style={styles.itemRow} onPress={() => router.push(`/recipe/${item.id}` as any)}>
                  <Text style={styles.itemName}>{item.title}</Text>
                  <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
               </TouchableOpacity>
             )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  navBar: { padding: 20, paddingTop: Platform.OS !== 'web' ? 50 : 20, backgroundColor: '#1E293B', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155' },
  backButton: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  mainLayout: { flex: 1, padding: 24, gap: 24 },
  formPanel: { flex: 1, backgroundColor: '#1E293B', padding: 24, borderRadius: 16, elevation: 4 },
  listPanel: { flex: 1, backgroundColor: '#1E293B', padding: 24, borderRadius: 16, elevation: 4 },
  panelTitle: { color: '#3B82F6', fontSize: 18, fontWeight: 'bold', marginBottom: 24, letterSpacing: 1 },
  label: { color: '#94A3B8', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#0F172A', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  saveBtn: { backgroundColor: '#3B82F6', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  itemRow: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 16 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemDesc: { color: '#64748B', fontSize: 14, marginTop: 4 }
});
