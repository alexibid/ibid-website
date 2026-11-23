export type TableRow = Record<string, unknown>;

export interface JoinClause {
  tableName: string;
  on: unknown;
}

export interface FindJoinedRowOptions {
  readonly rowsByTable: ReadonlyMap<string, TableRow | null>;
  readonly baseTable: string;
  readonly joinedTable: string;
  readonly candidates: readonly TableRow[];
  readonly onExpr: unknown;
}

export interface ProjectSelectRowOptions {
  readonly selection: Record<string, unknown> | undefined;
  readonly rowsByTable: ReadonlyMap<string, TableRow | null>;
  readonly baseTable: string;
  readonly joins: readonly JoinClause[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

export function resolveTableName(table: unknown): string {
  if (typeof table === 'string') return table;
  if (!isRecord(table)) return 'unknown';
  const symName: unknown =
    Object.getOwnPropertyDescriptor(table, Symbol.for('drizzle:Name'))?.value ??
    Object.getOwnPropertyDescriptor(table, Symbol.for('drizzle:BaseName'))?.value;
  if (typeof symName === 'string') return symName;
  if (typeof table['tableName'] === 'string') return table['tableName'];
  return typeof table['name'] === 'string' ? table['name'] : 'unknown';
}

function isColumnNode(value: unknown): value is Record<string, unknown> & { name: string } {
  return isRecord(value) && typeof value['name'] === 'string' && 'columnType' in value;
}

function readRowField(row: TableRow, columnName: string): unknown {
  if (columnName in row) return row[columnName];
  const camel = toCamelCase(columnName);
  return row[camel];
}

export function extractPredicates(
  expr: unknown
): { mode: 'and' | 'or'; items: Array<{ key: string; value: unknown; tableName?: string }> } {
  const items: Array<{ key: string; value: unknown; tableName?: string }> = [];
  let mode: 'and' | 'or' = 'and';
  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;
    const rawChunks: unknown = node['queryChunks'];
    if (!Array.isArray(rawChunks)) return;
    for (let i = 0; i < rawChunks.length; i++) {
      const chunk: unknown = rawChunks[i];
      if (isRecord(chunk) && Array.isArray(chunk['value']) && chunk['value'].join('').toLowerCase().includes(' or ')) {
        mode = 'or';
      }
      if (isColumnNode(chunk)) {
        const param = rawChunks.slice(i + 1).find((c) => isRecord(c) && 'value' in c && 'encoder' in c);
        if (isRecord(param)) {
          const tableName = 'table' in chunk ? resolveTableName(chunk['table']) : undefined;
          items.push({ key: chunk['name'], value: param['value'], tableName });
        }
      } else if (isRecord(chunk) && Array.isArray(chunk['queryChunks'])) {
        walk(chunk);
      }
    }
  };
  walk(expr);
  return { mode, items };
}

export function matchesRow(row: TableRow, condition: unknown): boolean {
  if (condition === undefined || condition === null) return true;
  const { mode, items } = extractPredicates(condition);
  if (items.length === 0) return true;
  const check = (p: { key: string; value: unknown }): boolean => readRowField(row, p.key) === p.value;
  return mode === 'or' ? items.some(check) : items.every(check);
}

export function matchesRowMap(
  rowsByTable: ReadonlyMap<string, TableRow | null>,
  baseTable: string,
  condition: unknown
): boolean {
  if (condition === undefined || condition === null) return true;
  const { mode, items } = extractPredicates(condition);
  if (items.length === 0) return true;
  const check = (p: { key: string; value: unknown; tableName?: string }): boolean => {
    const target = p.tableName ? rowsByTable.get(p.tableName) : rowsByTable.get(baseTable);
    if (!target) return false;
    return readRowField(target, p.key) === p.value;
  };
  return mode === 'or' ? items.some(check) : items.every(check);
}

export function getCountKey(selection: Record<string, unknown> | undefined): string | undefined {
  if (!selection) return undefined;
  for (const [key, value] of Object.entries(selection)) {
    if (key.toLowerCase().includes('count')) return key;
    if (
      isRecord(value) &&
      Array.isArray(value['queryChunks']) &&
      JSON.stringify(value['queryChunks']).toLowerCase().includes('count(')
    ) {
      return key;
    }
  }
  return undefined;
}

export function extractJoinColumns(
  onExpr: unknown
): Array<{ columnName: string; tableName: string }> {
  const cols: Array<{ columnName: string; tableName: string }> = [];
  const walk = (node: unknown): void => {
    if (!isRecord(node) || !Array.isArray(node['queryChunks'])) return;
    for (const chunk of node['queryChunks']) {
      if (isColumnNode(chunk)) {
        const tableName = 'table' in chunk ? resolveTableName(chunk['table']) : 'unknown';
        cols.push({ columnName: chunk['name'], tableName });
      } else if (isRecord(chunk) && Array.isArray(chunk['queryChunks'])) {
        walk(chunk);
      }
    }
  };
  walk(onExpr);
  return cols;
}

export function findJoinedRow(options: FindJoinedRowOptions): TableRow | null {
  const { rowsByTable, baseTable, joinedTable, candidates, onExpr } = options;
  const cols = extractJoinColumns(onExpr);
  if (cols.length < 2) return null;
  const rightCol = cols.find((c) => c.tableName === joinedTable) ?? cols[1];
  const leftCol = cols.find((c) => c.tableName !== joinedTable) ?? cols[0];
  const leftRow = rowsByTable.get(leftCol.tableName) ?? rowsByTable.get(baseTable);
  if (!leftRow) return null;
  const leftVal = readRowField(leftRow, leftCol.columnName);
  if (leftVal === undefined || leftVal === null) return null;
  const found = candidates.find((row) => readRowField(row, rightCol.columnName) === leftVal);
  return found ? { ...found } : null;
}

function projectNode(
  node: Record<string, unknown>,
  rowsByTable: ReadonlyMap<string, TableRow | null>,
  baseTable: string
): Record<string, unknown> | null {
  const output: Record<string, unknown> = {};
  const referencedJoinedTables = new Set<string>();
  let hasAnyColumn = false;

  for (const [key, spec] of Object.entries(node)) {
    if (isColumnNode(spec)) {
      hasAnyColumn = true;
      const colTable = 'table' in spec ? resolveTableName(spec['table']) : baseTable;
      if (colTable !== baseTable) referencedJoinedTables.add(colTable);
      const row = rowsByTable.get(colTable);
      output[key] = row ? readRowField(row, spec['name']) ?? null : null;
    } else if (isRecord(spec)) {
      output[key] = projectNode(spec, rowsByTable, baseTable);
    }
  }

  if (
    hasAnyColumn &&
    referencedJoinedTables.size > 0 &&
    [...referencedJoinedTables].every((tableName) => rowsByTable.get(tableName) === null)
  ) {
    return null;
  }

  return output;
}

export function projectSelectRow(options: ProjectSelectRowOptions): TableRow {
  const { selection, rowsByTable, baseTable, joins } = options;
  if (!selection) {
    if (joins.length === 0) {
      return { ...(rowsByTable.get(baseTable) ?? {}) };
    }
    const combined: TableRow = { [baseTable]: { ...(rowsByTable.get(baseTable) ?? {}) } };
    for (const join of joins) {
      const joined = rowsByTable.get(join.tableName);
      combined[join.tableName] = joined ? { ...joined } : null;
    }
    return combined;
  }
  return projectNode(selection, rowsByTable, baseTable) ?? {};
}

export function makeThenable<T>(run: () => Promise<T>) {
  return {
    then<R1 = T, R2 = never>(
      onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
      onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
    ): Promise<R1 | R2> {
      return run().then(onfulfilled, onrejected);
    }
  };
}
