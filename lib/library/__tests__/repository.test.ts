/* eslint-disable @typescript-eslint/no-explicit-any */
import { OfflineError } from '../errors';

type Call = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  payload?: any;
  filters: [string, unknown][];
  range?: [number, number];
  single?: boolean;
};

const mockCalls: Call[] = [];
let mockHandler: (c: Call) => any = () => ({ data: null, error: null });

jest.mock('../../supabase', () => {
  const makeBuilder = (table: string) => {
    const c: Call = { table, op: undefined as any, filters: [] };
    const b: any = {
      select() {
        if (!c.op) c.op = 'select';
        return b;
      },
      insert(p: any) {
        c.op = 'insert';
        c.payload = p;
        return b;
      },
      update(p: any) {
        c.op = 'update';
        c.payload = p;
        return b;
      },
      delete() {
        c.op = 'delete';
        return b;
      },
      eq(col: string, v: unknown) {
        c.filters.push([col, v]);
        return b;
      },
      order() {
        return b;
      },
      range(a: number, z: number) {
        c.range = [a, z];
        return b;
      },
      single() {
        c.single = true;
        return b;
      },
      then(res: any, rej: any) {
        mockCalls.push(c);
        return Promise.resolve()
          .then(() => mockHandler(c))
          .then(res, rej);
      },
    };
    return b;
  };
  return {
    supabase: {
      from: (t: string) => makeBuilder(t),
      rpc: (name: string, args: any) => {
        const c: Call = { table: name, op: 'rpc', payload: args, filters: [] };
        mockCalls.push(c);
        return Promise.resolve().then(() => mockHandler(c));
      },
    },
  };
});

jest.mock('expo-sqlite', () => require('../__mocks__/expoSqlite'));

import {
  addVariant,
  createFood,
  deleteFood,
  deleteVariant,
  listFoods,
  setDefaultVariant,
  syncFromSupabase,
  updateFood,
  updateVariant,
} from '../repository';
import { clearLocalLibrary, replaceLocal } from '../localDb';

const sqlite = require('expo-sqlite') as {
  __tables: () => Map<string, any[]>;
  __reset: () => void;
  __failInsertAfter: (n: number) => void;
};

const foodRow = (id: string) => ({ id, kind: 'single', name: id, pinned: false, tags: [], updated_at: 'u' });
const variantRow = (id: string, foodId: string, extra: any = {}) => ({
  id, food_id: foodId, label: 'Normal', is_default: true, kcal: 1, protein: 1, carbs: 1, fat: 1,
  sat_fat: null, sugar: null, fiber: null, sodium_mg: null, kcal_min: null, kcal_max: null,
  confidence: null, ingredients: null, updated_at: 'u', ...extra,
});
const seedServer = (...ids: string[]) => {
  foods = ids.map(foodRow);
  variants = ids.map((id) => variantRow(`v-${id}`, id));
};

// In-memory fake server -------------------------------------------------------
let foods: any[] = [];
let variants: any[] = [];
let n = 0;
let failVariantInsert = false;

function server(c: Call) {
  const rows = c.table === 'foods' ? foods : variants;
  const match = (r: any) => c.filters.every(([k, v]) => r[k] === v);
  if (c.op === 'rpc') {
    const { p_food_id, p_variant_id } = c.payload;
    variants.forEach((v) => {
      if (v.food_id === p_food_id) v.is_default = v.id === p_variant_id;
    });
    return { data: null, error: null };
  }
  if (c.op === 'select') {
    const [a, z] = c.range ?? [0, rows.length];
    return { data: rows.slice(a, z + 1), error: null };
  }
  if (c.op === 'insert') {
    if (c.table === 'food_variants' && failVariantInsert) {
      return { data: null, error: { message: 'check violation', code: '23514' } };
    }
    const row =
      c.table === 'foods'
        ? { pinned: false, tags: [], updated_at: 't0', ...c.payload, id: `f${++n}` }
        : {
            label: 'Normal',
            is_default: false,
            sat_fat: null,
            sugar: null,
            fiber: null,
            sodium_mg: null,
            kcal_min: null,
            kcal_max: null,
            confidence: null,
            ingredients: null,
            updated_at: 't0',
            ...c.payload,
            id: `v${++n}`,
          };
    rows.push(row);
    return { data: row, error: null };
  }
  if (c.op === 'update') {
    rows.filter(match).forEach((r) => Object.assign(r, c.payload));
    return { data: null, error: null };
  }
  if (c.op === 'delete') {
    const keep = rows.filter((r) => !match(r));
    rows.length = 0;
    rows.push(...keep);
    if (c.table === 'foods') variants = variants.filter((v) => foods.some((f) => f.id === v.food_id));
    return { data: null, error: null };
  }
  throw new Error('unhandled');
}

const newVariant = { kcal: 100, protein: 10, carbs: 5, fat: 2 };

beforeEach(() => {
  mockCalls.length = 0;
  foods = [];
  variants = [];
  n = 0;
  failVariantInsert = false;
  mockHandler = server;
  sqlite.__reset();
});

const writes = () => mockCalls.filter((c) => c.op !== 'select');

describe('createFood', () => {
  it('rejects with OfflineError on fetch failure and writes nothing locally', async () => {
    mockHandler = () => {
      throw new TypeError('Network request failed');
    };
    await expect(
      createFood({ kind: 'single', name: 'Rice', variant: newVariant }),
    ).rejects.toBeInstanceOf(OfflineError);
    await expect(
      createFood({ kind: 'single', name: 'Rice', variant: newVariant }),
    ).rejects.toThrow('You need internet to change the library.');
    expect(mockCalls.every((c) => c.op === 'insert' && c.table === 'foods')).toBe(true);
    const t = sqlite.__tables();
    expect([...t.values()].every((rows) => rows.length === 0)).toBe(true);
    expect(await listFoods()).toEqual([]);
  });

  it('treats a supabase error without status or code as offline', async () => {
    mockHandler = () => ({ data: null, error: { message: 'TypeError: Failed to fetch' } });
    await expect(
      createFood({ kind: 'dish', name: 'Soup', variant: newVariant }),
    ).rejects.toBeInstanceOf(OfflineError);
  });

  it('rethrows non-network errors as-is', async () => {
    const err = { message: 'new row violates row-level security policy', code: '42501' };
    mockHandler = () => ({ data: null, error: err });
    await expect(
      createFood({ kind: 'dish', name: 'Soup', variant: newVariant }),
    ).rejects.not.toBeInstanceOf(OfflineError);
  });

  it('inserts food, then default variant, then refreshes local', async () => {
    const food = await createFood({
      kind: 'single',
      name: 'Rice',
      tags: ['grain'],
      variant: { ...newVariant, satFat: 1, kcalMin: 90, ingredients: [{ name: 'rice', grams: 100 }] },
    });
    const w = writes();
    expect(w.map((c) => `${c.op}:${c.table}`)).toEqual(['insert:foods', 'insert:food_variants']);
    expect(w[0].payload).toEqual({ kind: 'single', name: 'Rice', tags: ['grain'] });
    expect(w[1].payload).toMatchObject({
      food_id: 'f1',
      is_default: true,
      kcal: 100,
      sat_fat: 1,
      kcal_min: 90,
      label: 'Normal',
    });
    // refresh (select) calls happen after the writes
    const lastWrite = mockCalls.lastIndexOf(w[1]);
    expect(mockCalls.slice(lastWrite + 1).some((c) => c.op === 'select')).toBe(true);
    expect(food.variants[0]).toMatchObject({ isDefault: true, foodId: 'f1', satFat: 1, kcalMin: 90 });
    const local = await listFoods();
    expect(local).toHaveLength(1);
    expect(local[0].name).toBe('Rice');
    expect(local[0].variants[0].ingredients).toEqual([{ name: 'rice', grams: 100 }]);
  });

  it('deletes the food when the variant insert fails, and rethrows', async () => {
    failVariantInsert = true;
    await expect(
      createFood({ kind: 'single', name: 'Rice', variant: newVariant }),
    ).rejects.toMatchObject({ code: '23514' });
    const del = mockCalls.find((c) => c.op === 'delete');
    expect(del).toMatchObject({ table: 'foods', filters: [['id', 'f1']] });
    expect(foods).toHaveLength(0);
    expect(await listFoods()).toEqual([]);
  });
});

describe('sync and listFoods', () => {
  it('assembles variants and parses tags/ingredients JSON, coercing numerics', async () => {
    foods = [{ id: 'a', kind: 'dish', name: 'Stew', pinned: true, tags: ['x', 'y'], updated_at: 'u1' }];
    variants = [
      {
        id: 'v1',
        food_id: 'a',
        label: 'Big',
        is_default: true,
        kcal: '250.5',
        protein: '12',
        carbs: 3,
        fat: 4,
        sat_fat: '1.5',
        sugar: null,
        fiber: null,
        sodium_mg: null,
        kcal_min: null,
        kcal_max: null,
        confidence: 'high',
        ingredients: [{ name: 'beef', grams: 200 }],
        updated_at: 'u2',
      },
    ];
    await syncFromSupabase();
    const list = await listFoods();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'a', pinned: true, tags: ['x', 'y'], updatedAt: 'u1' });
    const v = list[0].variants[0];
    expect(v).toMatchObject({
      id: 'v1',
      foodId: 'a',
      isDefault: true,
      kcal: 250.5,
      protein: 12,
      satFat: 1.5,
      confidence: 'high',
      ingredients: [{ name: 'beef', grams: 200 }],
    });
    expect(v.sugar).toBeUndefined();
    expect(typeof (sqlite.__tables().get('foods')![0] as any).tags).toBe('string');
  });

  it('pages 1000 rows at a time', async () => {
    foods = Array.from({ length: 1001 }, (_, i) => foodRow(`p${i}`));
    variants = foods.map((f) => variantRow(`v-${f.id}`, f.id));
    await syncFromSupabase();
    const foodSelects = mockCalls.filter((c) => c.table === 'foods' && c.op === 'select');
    expect(foodSelects.map((c) => c.range)).toEqual([[0, 999], [1000, 1999]]);
    expect(await listFoods()).toHaveLength(1001);
  });

  it('failure leaves local data intact', async () => {
    seedServer('a');
    await syncFromSupabase();
    mockHandler = (c) => {
      if (c.table === 'food_variants') throw new TypeError('Network request failed');
      return server(c);
    };
    await expect(syncFromSupabase()).rejects.toBeInstanceOf(Error);
    expect(await listFoods()).toHaveLength(1);
  });

  it('clearLocalLibrary empties local data', async () => {
    seedServer('a');
    await syncFromSupabase();
    await clearLocalLibrary();
    expect(await listFoods()).toEqual([]);
  });
});

describe('variants and defaults', () => {
  async function seed() {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    const v2 = await addVariant(f.id, { ...newVariant, label: 'Large', kcal: 200 });
    return { f, v1: f.variants[0], v2 };
  }

  it('addVariant inserts a non-default variant', async () => {
    const { f, v2 } = await seed();
    const call = writes().find((c) => c.table === 'food_variants' && c.payload.label === 'Large')!;
    expect(call.payload).toMatchObject({ food_id: f.id, is_default: false, kcal: 200 });
    expect(v2).toMatchObject({ label: 'Large', isDefault: false });
  });

  it('setDefaultVariant calls the RPC with exact args', async () => {
    const { f, v1, v2 } = await seed();
    mockCalls.length = 0;
    await setDefaultVariant(f.id, v2.id);
    expect(mockCalls[0]).toMatchObject({
      op: 'rpc',
      table: 'set_default_variant',
      payload: { p_food_id: f.id, p_variant_id: v2.id },
    });
    const local = (await listFoods())[0];
    expect(local.variants.find((v) => v.id === v2.id)!.isDefault).toBe(true);
    expect(local.variants.find((v) => v.id === v1.id)!.isDefault).toBe(false);
  });

  it('deleteVariant on the default promotes another via RPC', async () => {
    const { f, v1, v2 } = await seed();
    mockCalls.length = 0;
    await deleteVariant(v1.id);
    const ops = writes().map((c) => `${c.op}:${c.table}`);
    expect(ops).toEqual(['rpc:set_default_variant', 'delete:food_variants']);
    expect(mockCalls.find((c) => c.op === 'rpc')!.payload).toEqual({
      p_food_id: f.id,
      p_variant_id: v2.id,
    });
    const local = (await listFoods())[0];
    expect(local.variants).toHaveLength(1);
    expect(local.variants[0].isDefault).toBe(true);
  });

  it('deleteVariant on a non-default does not call the RPC', async () => {
    const { v2 } = await seed();
    mockCalls.length = 0;
    await deleteVariant(v2.id);
    expect(mockCalls.some((c) => c.op === 'rpc')).toBe(false);
  });

  it('deleteVariant on the only variant throws before any network write', async () => {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    mockCalls.length = 0;
    await expect(deleteVariant(f.variants[0].id)).rejects.toThrow('A food needs at least one variant');
    expect(mockCalls).toHaveLength(0);
  });

  it('updateVariant maps camelCase to snake_case and sends only given keys', async () => {
    const { v1 } = await seed();
    mockCalls.length = 0;
    await updateVariant(v1.id, { sodiumMg: 50, label: 'Cooked' });
    expect(mockCalls[0]).toMatchObject({
      op: 'update',
      table: 'food_variants',
      payload: { sodium_mg: 50, label: 'Cooked' },
      filters: [['id', v1.id]],
    });
  });
});

describe('updateFood / deleteFood', () => {
  it('updateFood with kind changes only the kind', async () => {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    mockCalls.length = 0;
    await updateFood(f.id, { kind: 'dish' });
    expect(mockCalls[0]).toMatchObject({
      op: 'update',
      table: 'foods',
      payload: { kind: 'dish' },
      filters: [['id', f.id]],
    });
    const local = (await listFoods())[0];
    expect(local.kind).toBe('dish');
    expect(local.name).toBe('Rice');
  });

  it('deleteFood removes remote and local', async () => {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    await deleteFood(f.id);
    expect(await listFoods()).toEqual([]);
  });

  it('offline update writes nothing locally', async () => {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    mockHandler = () => {
      throw new TypeError('Network request failed');
    };
    await expect(updateFood(f.id, { name: 'X' })).rejects.toBeInstanceOf(OfflineError);
    expect((await listFoods())[0].name).toBe('Rice');
  });
});

describe('deleteVariant partial failure', () => {
  it('promote ok, delete fails: one default remotely and local refreshed', async () => {
    const f = await createFood({ kind: 'single', name: 'Rice', variant: newVariant });
    const v2 = await addVariant(f.id, { ...newVariant, label: 'Large' });
    const v1 = f.variants[0];
    mockHandler = (c) => {
      if (c.op === 'delete') throw new TypeError('Network request failed');
      return server(c);
    };
    await expect(deleteVariant(v1.id)).rejects.toBeInstanceOf(OfflineError);
    expect(variants.filter((v) => v.food_id === f.id && v.is_default).map((v) => v.id)).toEqual([v2.id]);
    const local = (await listFoods())[0];
    expect(local.variants.find((v) => v.id === v2.id)!.isDefault).toBe(true);
    expect(local.variants.find((v) => v.id === v1.id)!.isDefault).toBe(false);
  });

  it('picks most recent updated_at, tie broken by smallest id', async () => {
    seedServer('a');
    variants.push(
      variantRow('v-b', 'a', { is_default: false, updated_at: 'u5' }),
      variantRow('v-d', 'a', { is_default: false, updated_at: 'u9' }),
      variantRow('v-c', 'a', { is_default: false, updated_at: 'u9' }),
    );
    await syncFromSupabase();
    mockCalls.length = 0;
    await deleteVariant('v-a');
    expect(mockCalls.find((c) => c.op === 'rpc')!.payload.p_variant_id).toBe('v-c');
  });
});

describe('createFood compensation failure', () => {
  it('still throws the original error when the compensating delete fails', async () => {
    failVariantInsert = true;
    mockHandler = (c) => {
      if (c.op === 'delete') return { data: null, error: { message: 'nope', code: '42501' } };
      return server(c);
    };
    await expect(
      createFood({ kind: 'single', name: 'Rice', variant: newVariant }),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('listFoods', () => {
  it('skips foods with zero variants', async () => {
    seedServer('a', 'b');
    variants = variants.filter((v) => v.food_id === 'a');
    await syncFromSupabase();
    expect((await listFoods()).map((f) => f.id)).toEqual(['a']);
  });
});

describe('local write serialization', () => {
  const gate = () => {
    let release!: () => void;
    const p = new Promise<void>((r) => (release = r));
    return { p, release };
  };

  it('replaceLocal rolls back when an insert throws mid-transaction', async () => {
    seedServer('a');
    await syncFromSupabase();
    sqlite.__failInsertAfter(1);
    await expect(
      replaceLocal([foodRow('x'), foodRow('y')] as any, []),
    ).rejects.toThrow('injected insert failure');
    expect((await listFoods()).map((f) => f.id)).toEqual(['a']);
  });

  it('overlapping local writes run serially without nested transactions', async () => {
    seedServer('a');
    await syncFromSupabase();
    await expect(
      Promise.all([
        replaceLocal([foodRow('p')] as any, [variantRow('v-p', 'p')] as any),
        replaceLocal([foodRow('q')] as any, [variantRow('v-q', 'q')] as any),
        clearLocalLibrary(),
      ]),
    ).resolves.toBeDefined();
    expect(await listFoods()).toEqual([]);
  });

  it('coalesces overlapping syncs into one pull', async () => {
    seedServer('a');
    await Promise.all([syncFromSupabase(), syncFromSupabase()]);
    expect(mockCalls.filter((c) => c.table === 'foods' && c.op === 'select')).toHaveLength(1);
    expect(await listFoods()).toHaveLength(1);
  });

  it('a sync that pulled before sign-out cannot repopulate after the clear', async () => {
    seedServer('a');
    const g = gate();
    mockHandler = async (c) => {
      const r = server(c);
      if (c.table === 'food_variants') await g.p;
      return r;
    };
    const sync = syncFromSupabase();
    await new Promise((r) => setTimeout(r, 5));
    await clearLocalLibrary();
    g.release();
    await sync;
    expect(await listFoods()).toEqual([]);
  });

  it('clear racing a fresh sync ends empty', async () => {
    seedServer('a');
    await Promise.all([syncFromSupabase(), clearLocalLibrary()]);
    expect(await listFoods()).toEqual([]);
  });

  it('a sync started after a clear is not coalesced into the stale one', async () => {
    seedServer('a');
    const g = gate();
    let first = true;
    mockHandler = async (c) => {
      const r = server(c);
      if (first && c.table === 'foods') {
        first = false;
        await g.p;
      }
      return r;
    };
    const stale = syncFromSupabase();
    await clearLocalLibrary();
    const fresh = syncFromSupabase();
    g.release();
    await Promise.all([stale, fresh]);
    expect((await listFoods()).map((f) => f.id)).toEqual(['a']);
  });
});
