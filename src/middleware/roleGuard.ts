import type { Request, Response, NextFunction } from 'express';

type Role = 'member' | 'admin' | 'owner';

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

function getRank(role: string): number {
  return ROLE_RANK[role as Role] ?? 0;
}

export function roleGuard(minimumRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role ?? 'member';
    if (getRank(userRole) >= getRank(minimumRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
  };
}
