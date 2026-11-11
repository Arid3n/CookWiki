import type { Food } from '../types';

const mockCreateFood = jest.fn();
const mockAddVariant = jest.fn();
jest.mock('../repository', () => ({
  createFood: (...a: unknown[]) => mockCreateFood(...a),
  addVariant: (...a: unknown[]) => mockAddVariant(...a),
}));

import { saveFromChat } from '../saveFromChat';

const food = (id: string, name: string): Food => ({
  id, kind: 'dish', name, pinned: false, tags: [], updatedAt: '',
  variants: [{ id: id + 'v', foodId: id, label: 'Normal', isDefault: true, kcal: 100, protein: 1, carbs: 1, fat: 1 }],
});
const args = { name: 'Tzatziki', kind: 'dish' as const, macros: { kcal: 96, protein: 4, carbs: 4, fat: 7 } };

beforeEach(() => {
  mockCreateFood.mockReset().mockImplementation(async (i) => ({ ...food('new', i.name) }));
  mockAddVariant.mockReset().mockResolvedValue({ id: 'nv' });
});

it('creates a new food with a default variant', async () => {
  const r = await saveFromChat(args, [food('a', 'Rice')]);
  expect(r.type).toBe('created');
  expect(mockCreateFood).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tzatziki', kind: 'dish', variant: expect.objectContaining({ kcal: 96 }) }));
});

it('returns duplicate without writing when no label', async () => {
  const existing = food('t', 'tzatziki');
  const r = await saveFromChat(args, [existing]);
  expect(r).toEqual({ type: 'duplicate', existing });
  expect(mockCreateFood).not.toHaveBeenCalled();
  expect(mockAddVariant).not.toHaveBeenCalled();
});

it('adds a variant when label given and duplicate exists', async () => {
  const r = await saveFromChat({ ...args, variantLabel: 'Low oil' }, [food('t', 'Tzatziki')]);
  expect(r.type).toBe('variant-added');
  expect(mockAddVariant).toHaveBeenCalledWith('t', expect.objectContaining({ label: 'Low oil', kcal: 96 }));
  expect(mockCreateFood).not.toHaveBeenCalled();
});

it('focusFoodId adds a variant regardless of name', async () => {
  const r = await saveFromChat(args, [food('x', 'Hummus'), food('t', 'Tzatziki')], { focusFoodId: 'x' });
  expect(r.type).toBe('variant-added');
  expect(mockAddVariant).toHaveBeenCalledWith('x', expect.any(Object));
});

it('focusFoodId missing from list falls back to normal rules', async () => {
  const r = await saveFromChat(args, [], { focusFoodId: 'gone' });
  expect(r.type).toBe('created');
});
