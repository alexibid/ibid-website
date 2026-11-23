import { vi } from 'vitest';
import {
  findJoinedRow,
  getCountKey,
  type JoinClause,
  makeThenable,
  matchesRow,
  matchesRowMap,
  projectSelectRow,
  resolveTableName,
  type TableRow
} from './drizzle-mock-helpers';

export interface MockPoolResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
}

export interface MockPool {
  query: ReturnType<typeof vi.fn<(sqlText: string) => Promise<MockPoolResult>>>;
  end: ReturnType<typeof vi.fn<() => Promise<void>>>;
  setShouldFail: (fail: boolean) => void;
}

export function createMockPool(): MockPool {
  let shouldFail = false;
  return {
    query: vi.fn(async (sqlText: string): Promise<MockPoolResult> => {
      if (shouldFail) throw new Error('Database connection failed');
      return { rows: [{ ok: 1 }], rowCount: 1, command: sqlText };
    }),
    end: vi.fn(async (): Promise<void> => undefined),
    setShouldFail: (fail: boolean): void => {
      shouldFail = fail;
    }
  };
}

export function createMockDrizzleDb() {
  const store = new Map<string, TableRow[]>([
    ['pages', []],
    ['urls', []],
    ['media', []]
  ]);
  let shouldFail = false;
  let seq = 1;

  const ensureTable = (name: string): TableRow[] => {
    let rows = store.get(name);
    if (!rows) {
      rows = [];
      store.set(name, rows);
    }
    return rows;
  };

  const assertHealthy = (): void => {
    if (shouldFail) throw new Error('Mock database operation failed');
  };

  const select = vi.fn((selection?: Record<string, unknown>) => {
    let tableName = 'unknown';
    let whereExpr: unknown;
    let rowLimit: number | undefined;
    let rowOffset = 0;
    const joins: JoinClause[] = [];

    const chain = {
      from: (table: unknown) => ((tableName = resolveTableName(table)), chain),
      leftJoin: (table: unknown, on: unknown) => {
        joins.push({ tableName: resolveTableName(table), on });
        return chain;
      },
      where: (condition: unknown) => ((whereExpr = condition), chain),
      orderBy: () => chain,
      limit: (count: number) => ((rowLimit = count), chain),
      offset: (count: number) => ((rowOffset = count), chain),
      ...makeThenable(async (): Promise<TableRow[]> => {
        assertHealthy();
        const baseRows = ensureTable(tableName);
        const joinedMaps: Array<Map<string, TableRow | null>> = baseRows.map((baseRow) => {
          const map = new Map<string, TableRow | null>([[tableName, { ...baseRow }]]);
          for (const join of joins) {
            const matched = findJoinedRow({
              rowsByTable: map,
              baseTable: tableName,
              joinedTable: join.tableName,
              candidates: ensureTable(join.tableName),
              onExpr: join.on,
            });
            map.set(join.tableName, matched);
          }
          return map;
        });

        const matchedMaps = joinedMaps.filter((map) => matchesRowMap(map, tableName, whereExpr));
        const countKey = getCountKey(selection);
        if (countKey) return [{ [countKey]: matchedMaps.length }];

        const sliced =
          rowLimit !== undefined
            ? matchedMaps.slice(rowOffset, rowOffset + rowLimit)
            : matchedMaps.slice(rowOffset);
        return sliced.map((map) =>
          projectSelectRow({
            selection,
            rowsByTable: map,
            baseTable: tableName,
            joins,
          }),
        );
      })
    };
    return chain;
  });

  const insert = (table: unknown) => {
    const tableName = resolveTableName(table);
    let pending: TableRow[] = [];
    let ignoreConflict = false;
    const chain = {
      values: (input: TableRow | TableRow[]) => ((pending = Array.isArray(input) ? input : [input]), chain),
      onConflictDoNothing: () => ((ignoreConflict = true), chain),
      onConflictDoUpdate: () => chain,
      returning: () => chain,
      ...makeThenable(async (): Promise<TableRow[]> => {
        assertHealthy();
        const rows = ensureTable(tableName);
        const inserted: TableRow[] = [];
        for (const item of pending) {
          const clone: TableRow = { ...item };
          if (clone['id'] === undefined) clone['id'] = `mock-${tableName}-${seq++}`;
          if (ignoreConflict && rows.some((r) => r['id'] === clone['id'])) continue;
          rows.push(clone);
          inserted.push({ ...clone });
        }
        return inserted;
      })
    };
    return chain;
  };

  const update = (table: unknown) => {
    const tableName = resolveTableName(table);
    let patch: TableRow = {};
    let whereExpr: unknown;
    const chain = {
      set: (values: TableRow) => ((patch = values), chain),
      where: (condition: unknown) => ((whereExpr = condition), chain),
      returning: () => chain,
      ...makeThenable(async (): Promise<TableRow[]> => {
        assertHealthy();
        const rows = ensureTable(tableName);
        const updated: TableRow[] = [];
        for (let i = 0; i < rows.length; i++) {
          if (matchesRow(rows[i], whereExpr)) {
            rows[i] = { ...rows[i], ...patch };
            updated.push({ ...rows[i] });
          }
        }
        return updated;
      })
    };
    return chain;
  };

  const del = (table: unknown) => {
    const tableName = resolveTableName(table);
    let whereExpr: unknown;
    const chain = {
      where: (condition: unknown) => ((whereExpr = condition), chain),
      returning: () => chain,
      ...makeThenable(async (): Promise<TableRow[]> => {
        assertHealthy();
        const rows = ensureTable(tableName);
        const removed: TableRow[] = [];
        const kept: TableRow[] = [];
        for (const row of rows) {
          (matchesRow(row, whereExpr) ? removed : kept).push(row);
        }
        store.set(tableName, kept);
        return removed.map((r) => ({ ...r }));
      })
    };
    return chain;
  };

  const query = new Proxy<Record<string, unknown>>(
    {},
    {
      get: (_t, prop) =>
        typeof prop === 'string'
          ? {
              findMany: async (opts?: { where?: unknown; limit?: number; offset?: number }): Promise<TableRow[]> => {
                assertHealthy();
                const rows = ensureTable(prop).filter((r) => matchesRow(r, opts?.where));
                const start = opts?.offset ?? 0;
                const end = opts?.limit !== undefined ? start + opts.limit : undefined;
                return rows.slice(start, end).map((r) => ({ ...r }));
              },
              findFirst: async (opts?: { where?: unknown }): Promise<TableRow | undefined> => {
                assertHealthy();
                const found = ensureTable(prop).find((r) => matchesRow(r, opts?.where));
                return found ? { ...found } : undefined;
              }
            }
          : undefined
    }
  );

  const db = {
    select,
    insert,
    update,
    delete: del,
    query,
    transaction: async <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => {
      assertHealthy();
      const backup = new Map<string, TableRow[]>();
      for (const [name, rows] of store.entries()) backup.set(name, rows.map((r) => ({ ...r })));
      try {
        return await callback(db);
      } catch (error) {
        store.clear();
        for (const [name, rows] of backup.entries()) store.set(name, rows);
        throw error;
      }
    },
    getTableRows: (name: string): TableRow[] => ensureTable(name).map((r) => ({ ...r })),
    seedTableRows: (name: string, rows: TableRow[]): void => {
      store.set(name, rows.map((r) => ({ ...r })));
    },
    clear: (): void => {
      for (const key of store.keys()) store.set(key, []);
    },
    setShouldFail: (fail: boolean): void => {
      shouldFail = fail;
    }
  };

  return db;
}
