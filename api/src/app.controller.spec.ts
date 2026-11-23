import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';
import { createMockPool } from './mocks/drizzle-db.mock';

describe('AppController', () => {
  it('should return ok status and database up when pool query succeeds', async () => {
    const pool = createMockPool();
    const controller = new AppController(pool);

    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.timestamp).toBe('string');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('should throw 503 ServiceUnavailableException when pool query fails', async () => {
    const pool = createMockPool();
    pool.setShouldFail(true);
    const controller = new AppController(pool);

    await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw 503 ServiceUnavailableException without leaking internal details on unexpected rejection', async () => {
    const pool = createMockPool();
    pool.query.mockRejectedValueOnce('raw socket failure');
    const controller = new AppController(pool);

    await expect(controller.getHealth()).rejects.toMatchObject({
      status: 503
    });
  });
});
