import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    const err = Object.assign(new Error('Authentication required'), {
      statusCode: 401, code: 'UNAUTHORIZED',
    });
    next(err);
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    // Set req.user with 'id' field — matches what all controllers expect
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const err = Object.assign(new Error('Access token expired'), {
        statusCode: 401, code: 'TOKEN_EXPIRED',
      });
      next(err);
      return;
    }
    const err = Object.assign(new Error('Invalid token'), {
      statusCode: 401, code: 'TOKEN_INVALID',
    });
    next(err);
  }
}
