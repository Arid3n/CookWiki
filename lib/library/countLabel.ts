const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function libraryCountLabel(foods: number, dishes: number): string {
  return `${plural(foods, 'food', 'foods')} · ${plural(dishes, 'dish', 'dishes')}`;
}
