import { describe, expect, it, vi } from 'vitest';
import { SnapshotPublisher } from './snapshot.publisher.js';
import { MOCK_SNAPSHOT } from './snapshot.mock.js';

function setUp() {
  const builder = { build: vi.fn().mockResolvedValue(MOCK_SNAPSHOT) };
  const writer = { write: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn<(message: string) => void>() };
  return { builder, writer, logger, publisher: new SnapshotPublisher(builder, writer, logger) };
}


describe('SnapshotPublisher', () => {
  it('should build and write the snapshot', async () => {
    const { builder, writer, publisher } = setUp();

    await publisher.publish();

    expect(builder.build).toHaveBeenCalledTimes(1);
    expect(writer.write).toHaveBeenCalledWith(MOCK_SNAPSHOT);
  });

  it('should write saves made at the same time one after the other, never interleaved', async () => {
    const { writer, publisher } = setUp();
    const events: string[] = [];
    writer.write.mockImplementation(async () => {
      events.push('start');
      await Promise.resolve();
      events.push('end');
    });

    await Promise.all([publisher.publish(), publisher.publish(), publisher.publish()]);

    expect(events).toEqual(['start', 'end', 'start', 'end', 'start', 'end']);
  });

  it('should log a failed snapshot without failing the save that triggered it', async () => {
    const { writer, logger, publisher } = setUp();
    writer.write.mockRejectedValueOnce(new Error('disk full'));

    await expect(publisher.publish()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should keep publishing after one snapshot failed', async () => {
    const { writer, publisher } = setUp();
    writer.write.mockRejectedValueOnce(new Error('disk full'));

    await publisher.publish();
    await publisher.publish();

    expect(writer.write).toHaveBeenCalledTimes(2);
  });
});
