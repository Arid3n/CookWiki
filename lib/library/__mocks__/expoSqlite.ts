// Tiny in-memory fake of the expo-sqlite async API. Supports only the SQL that
// lib/library/localDb.ts issues: CREATE TABLE IF NOT EXISTS, DELETE FROM,
// INSERT [OR REPLACE] INTO t (cols) VALUES (...), SELECT * FROM.
type Row = Record<string, unknown>;

const tables = new Map<string, Row[]>();
let inTx = false;
let insertsUntilFail = -1;

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function ensure(name: string): Row[] {
  if (!tables.has(name)) tables.set(name, []);
  return tables.get(name)!;
}

function statement(sql: string, params: unknown[] = []): Row[] {
  let m = /^\s*CREATE TABLE IF NOT EXISTS\s+(\w+)/i.exec(sql);
  if (m) {
    ensure(m[1]);
    return [];
  }
  m = /^\s*DELETE FROM\s+(\w+)/i.exec(sql);
  if (m) {
    tables.set(m[1], []);
    return [];
  }
  m = /^\s*INSERT(?: OR REPLACE)? INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i.exec(sql);
  if (m) {
    if (insertsUntilFail >= 0 && insertsUntilFail-- === 0) {
      insertsUntilFail = -1;
      throw new Error('fake sqlite: injected insert failure');
    }
    const cols = m[2].split(',').map((c) => c.trim());
    const row: Row = {};
    cols.forEach((c, i) => {
      row[c] = params[i] === undefined ? null : params[i];
    });
    ensure(m[1]).push(row);
    return [];
  }
  m = /^\s*SELECT \* FROM\s+(\w+)/i.exec(sql);
  if (m) return ensure(m[1]).map((r) => ({ ...r }));
  throw new Error(`fake sqlite: unsupported SQL: ${sql}`);
}

const db = {
  async execAsync(sql: string) {
    sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => statement(s));
  },
  async runAsync(sql: string, ...params: unknown[]) {
    await tick(); // yield so overlapping callers really interleave
    statement(sql, params.flat());
    return { changes: 0, lastInsertRowId: 0 };
  },
  async getAllAsync(sql: string) {
    return statement(sql);
  },
  async withTransactionAsync(task: () => Promise<void>) {
    // real expo-sqlite: BEGIN inside an open transaction fails
    if (inTx) throw new Error('cannot start a transaction within a transaction');
    inTx = true;
    const snapshot = new Map([...tables].map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
    try {
      await task();
    } catch (e) {
      tables.clear();
      snapshot.forEach((v, k) => tables.set(k, v));
      throw e;
    } finally {
      inTx = false;
    }
  },
};

export async function openDatabaseAsync() {
  return db;
}

export function __tables() {
  return tables;
}

/** Make the (n+1)th INSERT from now on throw (n = 0 fails the next insert). */
export function __failInsertAfter(n: number) {
  insertsUntilFail = n;
}

export function __reset() {
  inTx = false;
  insertsUntilFail = -1;
  tables.forEach((_, k) => tables.set(k, []));
}
