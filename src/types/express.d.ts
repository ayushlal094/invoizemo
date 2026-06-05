import type { AccessTokenPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    // Extend Express.User (used by passport) to match our token payload
    interface User extends AccessTokenPayload {}

    // Also type req.user directly
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
