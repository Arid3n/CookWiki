import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Macros } from '@/lib/library/types';
import { normalizeTags, parseMacroValue, withRangeReset } from '@/lib/library/validate';

interface Common { busy: boolean; onCancel: () => void }

function Buttons({ busy, onCancel, onSave }: Common & { onSave: () => void }) {
  return (
    <View style={s.buttons}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={s.btn}>
        <Text style={s.btnText}>Cancel</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button" accessibilityLabel="Save" disabled={busy} onPress={onSave}
        style={[s.btn, s.primary, busy && s.disabled]}
      >
        <Text style={s.primaryText}>Save</Text>
      </Pressable>
    </View>
  );
}

export function NameEditor({ initial, busy, onCancel, onSave }: Common & { initial: string; onSave: (name: string) => void }) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const name = text.trim();
    if (!name) return setError('Name cannot be empty.');
    setError(null);
    onSave(name);
  };
  return (
    <View style={s.box}>
      <TextInput
        accessibilityLabel="Food name" style={s.input} value={text} onChangeText={setText}
        autoFocus placeholderTextColor="#94A3B8"
      />
      {error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
      <Buttons busy={busy} onCancel={onCancel} onSave={save} />
    </View>
  );
}

export function TagEditor({ initial, busy, onCancel, onSave }: Common & { initial: string[]; onSave: (tags: string[]) => void }) {
  const [tags, setTags] = useState(initial);
  const [text, setText] = useState('');
  const add = () => {
    setTags(normalizeTags([...tags, text]));
    setText('');
  };
  return (
    <View style={s.box}>
      <View style={s.chips}>
        {tags.map((t) => (
          <Pressable
            key={t} accessibilityRole="button" accessibilityLabel={`Remove tag ${t}`}
            onPress={() => setTags(tags.filter((x) => x !== t))} style={s.tag}
          >
            <Text style={s.tagText}>{t}  ✕</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.addRow}>
        <TextInput
          accessibilityLabel="New tag" style={[s.input, { flex: 1 }]} value={text} onChangeText={setText}
          onSubmitEditing={add} placeholder="Add tag (max 12)" placeholderTextColor="#94A3B8"
          autoCapitalize="none" maxLength={24}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add tag" onPress={add} style={[s.btn, s.primary]}>
          <Text style={s.primaryText}>Add</Text>
        </Pressable>
      </View>
      <Buttons busy={busy} onCancel={onCancel} onSave={() => onSave(normalizeTags(tags))} />
    </View>
  );
}

const FIELDS: { key: keyof Macros; label: string; required: boolean }[] = [
  { key: 'kcal', label: 'Calories (kcal)', required: true },
  { key: 'protein', label: 'Protein (g)', required: true },
  { key: 'carbs', label: 'Carbs (g)', required: true },
  { key: 'fat', label: 'Fat (g)', required: true },
  { key: 'satFat', label: 'Saturated fat (g)', required: false },
  { key: 'sugar', label: 'Sugar (g)', required: false },
  { key: 'fiber', label: 'Fiber (g)', required: false },
  { key: 'sodiumMg', label: 'Sodium (mg)', required: false },
];

export function MacroEditor({ initial, busy, onCancel, onSave }: Common & { initial: Macros; onSave: (patch: Partial<Macros> & { kcalMin?: null; kcalMax?: null }) => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, initial[f.key] === undefined ? '' : String(initial[f.key])])),
  );
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const patch: Partial<Macros> = {};
    for (const f of FIELDS) {
      const raw = vals[f.key];
      if (raw.trim() === '' && !f.required) continue; // optional, left empty: unchanged
      const n = parseMacroValue(raw);
      if (n === null) return setError(`${f.label}: enter a number of 0 or more.`);
      patch[f.key] = n;
    }
    setError(null);
    onSave(withRangeReset(patch, initial.kcal));
  };
  return (
    <View style={s.box}>
      <Text style={s.hint}>Values per 100 g.</Text>
      {FIELDS.map((f) => (
        <View key={f.key} style={s.field}>
          <Text style={s.fieldLabel}>{f.label}</Text>
          <TextInput
            accessibilityLabel={f.label} style={[s.input, s.num]} keyboardType="decimal-pad"
            value={vals[f.key]} onChangeText={(t) => setVals({ ...vals, [f.key]: t })}
          />
        </View>
      ))}
      {error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
      <Buttons busy={busy} onCancel={onCancel} onSave={save} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginTop: 12, gap: 8 },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: 16 },
  num: { width: 110, textAlign: 'right' },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { color: '#F1F5F9', fontSize: 15, flex: 1 },
  hint: { color: '#94A3B8', fontSize: 13 },
  error: { color: '#F87171', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, backgroundColor: '#0F172A' },
  tagText: { color: '#F1F5F9', fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: '#94A3B8', fontSize: 15 },
  primary: { backgroundColor: '#10B981' },
  primaryText: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
