import type { NextFunction, Request, Response } from 'express';

export function noStoreCacheMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
