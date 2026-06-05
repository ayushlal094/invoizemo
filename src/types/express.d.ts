import type { AccessTokenPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    // Extend Express.User so passport + req.user both type correctly
    interface User {
      id: string;
      email: string;
      role: string;
    }

    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
