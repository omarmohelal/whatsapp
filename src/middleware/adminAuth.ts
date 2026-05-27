import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../utils/errors';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function extractApiKey(req: Request): string | undefined {
  const direct = req.header('x-admin-api-key');
  if (direct) {
    return direct;
  }

  const authorization = req.header('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim();
  }

  return undefined;
}

export function adminAuth(expectedApiKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const provided = extractApiKey(req);
    if (!provided || !safeEqual(provided, expectedApiKey)) {
      next(forbidden('Invalid admin API key'));
      return;
    }

    next();
  };
}
