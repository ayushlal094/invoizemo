import type { ErrorCode } from '../utils/appError.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
