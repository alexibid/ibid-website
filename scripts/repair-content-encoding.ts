import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeStoredContent } from '../src/app/domain/utils/content-encoding.utils';

interface SnapshotPage {
  readonly id: string;
  readonly content: string;
  readonly [field: string]: unknown;
}

interface Snapshot {
  readonly pages: readonly SnapshotPage[];
  readonly [field: string]: unknown;
}

interface RepairResult {
  readonly snapshot: Snapshot;
  readonly repairedIds: readonly string[];
}

const SNAPSHOT_PATH = resolve('src/content/content.snapshot.json');
const TEMPORARY_PATH = `${SNAPSHOT_PATH}.tmp`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSnapshotPage(value: unknown): value is SnapshotPage {
  return isRecord(value) && typeof value['id'] === 'string' && typeof value['content'] === 'string';
}

function isSnapshot(value: unknown): value is Snapshot {
  return isRecord(value) && Array.isArray(value['pages']) && value['pages'].every(isSnapshotPage);
}

function serialiseSnapshot(snapshot: Snapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function readSnapshot(): Snapshot {
  const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isSnapshot(parsed)) {
    throw new Error(`Unexpected snapshot shape in ${SNAPSHOT_PATH}`);
  }
  if (serialiseSnapshot(parsed) !== raw) {
    throw new Error('Snapshot formatting does not round-trip; refusing to rewrite it');
  }
  return parsed;
}

function repairSnapshot(snapshot: Snapshot): RepairResult {
  const repairedIds: string[] = [];
  const pages = snapshot.pages.map((page) => {
    const content = decodeStoredContent(page.content);
    if (content === page.content) {
      return page;
    }
    repairedIds.push(page.id);
    return { ...page, content };
  });
  return { snapshot: { ...snapshot, pages }, repairedIds };
}

function writeSnapshot(snapshot: Snapshot): void {
  writeFileSync(TEMPORARY_PATH, serialiseSnapshot(snapshot), 'utf8');
  renameSync(TEMPORARY_PATH, SNAPSHOT_PATH);
}

function reportRepair(repairedIds: readonly string[]): void {
  for (const id of repairedIds) {
    console.log(`repaired ${id}`);
  }
  console.log(`Repaired pages: ${repairedIds.length}`);
}

function runRepair(): void {
  const { snapshot, repairedIds } = repairSnapshot(readSnapshot());
  if (repairedIds.length > 0) {
    writeSnapshot(snapshot);
  }
  reportRepair(repairedIds);
}

runRepair();
