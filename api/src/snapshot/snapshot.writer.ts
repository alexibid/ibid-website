import type { ContentSnapshot } from './content-snapshot.js';
import type { FileSystemPort } from './file-system.port.js';

export class SnapshotWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotWriteError';
  }
}

export interface SnapshotDirs {
  readonly contentDir: string;
  readonly publicMediaDir: string;
  readonly mediaDir: string;
}

const SAFE_MEDIA_NAME = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/;

export class SnapshotWriter {
  constructor(
    private readonly dirs: SnapshotDirs,
    private readonly files: FileSystemPort,
  ) {}

  async write(snapshot: ContentSnapshot): Promise<void> {
    if (snapshot.pages.length === 0 && snapshot.urls.length === 0) {
      throw new SnapshotWriteError('Content export failed: Cannot reach API or content database is empty');
    }

    for (const name of snapshot.media) {
      if (typeof name !== 'string' || !SAFE_MEDIA_NAME.test(name) || name.includes('..')) {
        throw new SnapshotWriteError(`Unsafe media filename: ${name}`);
      }
    }

    const tempPath = `${this.dirs.contentDir}/content.snapshot.json.tmp`;
    const targetPath = `${this.dirs.contentDir}/content.snapshot.json`;

    try {
      await this.files.mkdir(this.dirs.contentDir, { recursive: true });
      await this.files.mkdir(this.dirs.publicMediaDir, { recursive: true });
      await this.files.writeFile(tempPath, JSON.stringify(snapshot, null, 2));

      for (const name of snapshot.media) {
        await this.files.copyFile(
          `${this.dirs.mediaDir}/${name}`,
          `${this.dirs.publicMediaDir}/${name}`,
        );
      }

      await this.files.rename(tempPath, targetPath);
    } catch (error) {
      if (error instanceof SnapshotWriteError) {
        throw error;
      }
      throw new SnapshotWriteError(error instanceof Error ? error.message : String(error));
    }
  }
}
