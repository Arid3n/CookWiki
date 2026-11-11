import { normalizeName } from './duplicates';
import { SearchFilters } from './types';

/** One-line description of an interpreted search, e.g. "Min protein 20 g · Max 400 kcal · dinner". */
export function describeFilters(f: SearchFilters): string {
  const parts: string[] = [];
  if (f.text) parts.push(`"${f.text}"`);
  if (f.kind) parts.push(f.kind === 'dish' ? 'dishes' : 'single foods');
  if (f.minProtein !== undefined) parts.push(`Min protein ${f.minProtein} g`);
  if (f.maxKcal !== undefined) parts.push(`Max ${f.maxKcal} kcal`);
  if (f.maxCarbs !== undefined) parts.push(`Max carbs ${f.maxCarbs} g`);
  if (f.maxFat !== undefined) parts.push(`Max fat ${f.maxFat} g`);
  if (f.tags?.length) parts.push(f.tags.join(', '));
  return parts.join(' · ');
}

/** True when the interpretation constrains something beyond plain text. */
export function hasStructure(f: SearchFilters): boolean {
  return (
    f.kind !== undefined || (f.tags?.length ?? 0) > 0 ||
    f.maxKcal !== undefined || f.minProtein !== undefined ||
    f.maxCarbs !== undefined || f.maxFat !== undefined
  );
}

/** Smart search only runs for queries of 3 or more words. */
export function wordCount(query: string): number {
  return query.trim().split(/\s+/).filter(Boolean).length;
}

/** Union of tags (normalized, deduped, first spelling kept). AND semantics come from applyFilters. */
export function mergeTags(a: string[] = [], b: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...a, ...b]) {
    const k = normalizeName(t);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
