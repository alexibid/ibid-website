import type { ContentSnapshot } from './content-snapshot.js';

export interface SnapshotBuilderPort {
  build(): Promise<ContentSnapshot>;
}

export interface SnapshotWriterPort {
  write(snapshot: ContentSnapshot): Promise<void>;
}

export interface LoggerPort {
  error(message: string): void;
}

export const SNAPSHOT_PUBLISHER = Symbol('SNAPSHOT_PUBLISHER');

export class SnapshotPublisher {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly builder: SnapshotBuilderPort,
    private readonly writer: SnapshotWriterPort,
    private readonly logger: LoggerPort = console,
  ) {}

  async publish(): Promise<void> {
    const nextOperation = async (): Promise<void> => {
      try {
        const snapshot = await this.builder.build();
        await this.writer.write(snapshot);
      } catch (error) {
        this.logger.error(error instanceof Error ? error.message : String(error));
      }
    };

    const current = this.queue.then(nextOperation, nextOperation);
    this.queue = current;
    return current;
  }
}
