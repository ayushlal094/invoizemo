import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';

type Role = 'owner' | 'admin' | 'member';

const roleHierarchy: Record<Role, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function roleGuard(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const userLevel = roleHierarchy[req.user.role];
    const minRequired = Math.min(...allowedRoles.map((r) => roleHierarchy[r]));

    if (userLevel < minRequired) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }

    next();
  };
}
