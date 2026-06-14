import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/appError.js';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_root';
        if (!fields[key]) fields[key] = [];
        fields[key].push(issue.message);
      }
      next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed', fields));
      return;
    }

    // req.query is read-only in Express — use Object.assign instead
    if (part === 'query') {
      Object.assign(req.query, result.data);
    } else {
      req[part] = result.data as never;
    }
    next();
  };
}