import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PagesController } from './pages.controller.js';
import type { PagesRepository } from './pages.repository.js';
import type { SnapshotPublisher } from '../snapshot/snapshot.publisher.js';
import { MOCK_INVALID_PAGE_BODIES, MOCK_PAGE, MOCK_PAGE_ID, MOCK_PAGE_INPUTS, MOCK_PAGE_PATCHES } from './content.mock.js';

function mockRepository() {
  return {
    list: vi.fn<PagesRepository['list']>().mockResolvedValue([MOCK_PAGE]),
    get: vi.fn<PagesRepository['get']>().mockResolvedValue(MOCK_PAGE),
    create: vi.fn<PagesRepository['create']>().mockResolvedValue(MOCK_PAGE),
    update: vi.fn<PagesRepository['update']>().mockResolvedValue({ ...MOCK_PAGE, title: MOCK_PAGE_PATCHES.title.title }),
    remove: vi.fn<PagesRepository['remove']>().mockResolvedValue(undefined),
  } satisfies PagesRepository;
}

function mockPublisher() {
  return { publish: vi.fn<SnapshotPublisher['publish']>().mockResolvedValue(undefined) } satisfies Pick<SnapshotPublisher, 'publish'>;
}

let repository: ReturnType<typeof mockRepository>;
let publisher: ReturnType<typeof mockPublisher>;
let controller: PagesController;

beforeEach(() => {
  repository = mockRepository();
  publisher = mockPublisher();
  controller = new PagesController(repository, publisher);
});

describe('PagesController', () => {
  it('should prove with login, an edited page is saved and the content snapshot is regenerated', async () => {
    const saved = await controller.update(MOCK_PAGE_ID, MOCK_PAGE_PATCHES.title);

    expect(repository.update).toHaveBeenCalledWith(MOCK_PAGE_ID, MOCK_PAGE_PATCHES.title);
    expect(saved.title).toBe(MOCK_PAGE_PATCHES.title.title);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish.mock.invocationCallOrder[0]).toBeGreaterThan(repository.update.mock.invocationCallOrder[0] ?? 0);
  });

  it('should generate the snapshot again after creating and after deleting a page', async () => {
    await controller.create(MOCK_PAGE_INPUTS.valid);
    await controller.remove(MOCK_PAGE_ID);

    expect(publisher.publish).toHaveBeenCalledTimes(2);
  });

  it.each(MOCK_INVALID_PAGE_BODIES)('should refuse the body %j and change nothing', async (body) => {
    await expect(controller.create(body)).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('should refuse an empty change and change nothing', async () => {
    await expect(controller.update(MOCK_PAGE_ID, {})).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.update).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('should not generate the snapshot when saving fails', async () => {
    repository.update.mockRejectedValue(new NotFoundException());

    await expect(controller.update(MOCK_PAGE_ID, MOCK_PAGE_PATCHES.content)).rejects.toBeInstanceOf(NotFoundException);
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('should list pages filtered by type and language', async () => {
    await controller.list({ type: 'chapter', lang: 'pt' });

    expect(repository.list).toHaveBeenCalledWith({ type: 'chapter', lang: 'pt' });
  });

  it('should refuse an unknown filter instead of querying with it', async () => {
    await expect(controller.list({ type: "chapter' OR 1=1 --" })).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.list).not.toHaveBeenCalled();
  });

  it('should not generate the snapshot when only reading', async () => {
    await controller.list({});
    await controller.get(MOCK_PAGE_ID);

    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
