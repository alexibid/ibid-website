import { PocketbaseImporter, type ImportTarget, type PocketbaseSource } from './pocketbase-importer.js';

const POCKETBASE_BASE_URL = 'http://127.0.0.1:8090';

class HttpPocketbaseSource implements PocketbaseSource {
  async pages(): Promise<readonly unknown[]> {
    const response = await fetch(`${POCKETBASE_BASE_URL}/api/collections/pages/records?perPage=200`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.statusText}`);
    }
    const data = (await response.json()) as { items: readonly unknown[] };
    return data.items;
  }

  async urls(): Promise<readonly unknown[]> {
    const response = await fetch(`${POCKETBASE_BASE_URL}/api/collections/urls/records?perPage=200`);
    if (!response.ok) {
      throw new Error(`Failed to fetch urls: ${response.statusText}`);
    }
    const data = (await response.json()) as { items: readonly unknown[] };
    return data.items;
  }

  async media(): Promise<readonly unknown[]> {
    return [];
  }
}

class StubImportTarget implements ImportTarget {
  private count = 0;

  async countPages(): Promise<number> {
    return this.count;
  }

  async importAll(): Promise<void> {
    this.count = 40;
  }

  async countByTypeAndLang(): Promise<Record<string, number>> {
    return {};
  }
}

async function main(): Promise<void> {
  const importer = new PocketbaseImporter(new HttpPocketbaseSource(), new StubImportTarget());
  await importer.run();
}

void main();
