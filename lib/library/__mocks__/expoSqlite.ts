// Tiny in-memory fake of the expo-sqlite async API. Supports only the SQL that
// lib/library/localDb.ts issues: CREATE TABLE IF NOT EXISTS, DELETE FROM,
// INSERT [OR REPLACE] INTO t (cols) VALUES (...), SELECT * FROM.
type Row = Record<string, unknown>;

const tables = new Map<string, Row[]>();

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
    statement(sql, params.flat());
    return { changes: 0, lastInsertRowId: 0 };
  },
  async getAllAsync(sql: string) {
    return statement(sql);
  },
  async withTransactionAsync(task: () => Promise<void>) {
    const snapshot = new Map([...tables].map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
    try {
      await task();
    } catch (e) {
      tables.clear();
      snapshot.forEach((v, k) => tables.set(k, v));
      throw e;
    }
  },
};

export async function openDatabaseAsync() {
  return db;
}

export function __tables() {
  return tables;
}

export function __reset() {
  tables.forEach((_, k) => tables.set(k, []));
}
