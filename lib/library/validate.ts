/** Parses a user-typed non-negative number ("12,5" or "12.5"). Returns null when invalid; 0 is allowed. */
export function parseMacroValue(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MAX_TAGS = 12;
const MAX_TAG_LEN = 24;

/** Trim, lowercase, dedupe, cap length and count. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase().slice(0, MAX_TAG_LEN).trim();
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** When a macro edit changes kcal, the saved kcal range no longer applies: clear it. */
export function withRangeReset<T extends { kcal?: number }>(
  patch: T,
  initialKcal: number,
): T & { kcalMin?: null; kcalMax?: null } {
  if (patch.kcal === undefined || patch.kcal === initialKcal) return patch;
  return { ...patch, kcalMin: null, kcalMax: null };
}
