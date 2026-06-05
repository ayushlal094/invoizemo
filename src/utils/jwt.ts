import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  userId: string;  // used by controllers
  sub: string;     // used by sockets and passport
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'sub'>): string {
  // Always set sub = userId for compatibility
  const full: AccessTokenPayload = { ...payload, sub: payload.userId };
  return jwt.sign(full as object, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload as object, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  // Normalise: ensure userId is always set even if token was signed with only sub
  if (!p.userId && p.sub) p.userId = p.sub;
  if (!p.sub && p.userId) p.sub = p.userId;
  return p;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
