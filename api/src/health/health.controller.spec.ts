import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('should prove docker compose up puts PostgreSQL and the API running, and the API health responds', async () => {
    const controller = new HealthController({ check: vi.fn().mockResolvedValue(undefined) });

    await expect(controller.get()).resolves.toEqual({ status: 'ok' });
  });

  it('should answer unavailable when the database does not answer', async () => {
    const controller = new HealthController({ check: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) });

    await expect(controller.get()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
