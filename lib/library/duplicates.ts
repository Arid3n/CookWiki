import { Food } from './types';

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a + 's' === b || b + 's' === a || a + 'es' === b || b + 'es' === a) return true;
  const max = a.length >= 5 && b.length >= 5 ? 2 : 1;
  return editDistance(a, b) <= max;
}

export function findDuplicates(name: string, foods: Food[]): Food[] {
  const q = normalizeName(name);
  if (!q) return [];
  return foods.filter(
    (f) => similar(q, normalizeName(f.name)) || f.tags.some((t) => normalizeName(t) === q),
  );
}
