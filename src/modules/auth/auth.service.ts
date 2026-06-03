import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import { generateSecureToken } from '../../utils/encryption.js';
import { safeCompare } from '../../utils/tokenCompare.js';
import { User } from '../users/user.model.js';
import { LoginAttempt } from './loginAttempt.model.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_COOKIE_NAME = 'refreshToken';

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
  });
}

export function getRefreshCookieToken(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[REFRESH_COOKIE_NAME];
}

async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

async function checkAccountLock(email: string): Promise<void> {
  const attempt = await LoginAttempt.findOne({ email });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Account temporarily locked. Try again later.');
  }
}

async function recordFailedLogin(email: string): Promise<void> {
  const attempt = await LoginAttempt.findOneAndUpdate(
    { email },
    { $inc: { attempts: 1 } },
    { upsert: true, new: true }
  );

  if (attempt && attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    attempt.attempts = 0;
    await attempt.save();
  }
}

async function clearLoginAttempts(email: string): Promise<void> {
  await LoginAttempt.deleteOne({ email });
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase(), isDeleted: false });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Unable to create account');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    name: input.name ?? '',
    role: 'owner',
  });

  return sanitizeUser(user);
}

export async function loginUser(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
) {
  await checkAccountLock(input.email);

  const user = await User.findOne({ email: input.email.toLowerCase(), isDeleted: false });
  if (!user?.passwordHash) {
    await recordFailedLogin(input.email);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(input.email);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  await clearLoginAttempts(input.email);
  return createSession(user, meta);
}

export async function createSession(
  user: InstanceType<typeof User>,
  meta: { userAgent?: string; ipAddress?: string }
) {
  const sessionId = generateSecureToken(16);
  const refreshToken = signRefreshToken({ sub: user._id.toString(), sessionId });
  const tokenHash = await hashToken(refreshToken);

  user.refreshSessions.push({
    sessionId,
    tokenHash,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await user.save();

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    sessionId,
  };
}

export async function refreshSession(
  refreshToken: string,
  meta: { userAgent?: string; ipAddress?: string }
) {
  const { verifyRefreshToken } = await import('../../utils/jwt.js');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
  }

  const user = await User.findOne({ _id: payload.sub, isDeleted: false });
  if (!user) {
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
  }

  const sessionIndex = user.refreshSessions.findIndex((s) => s.sessionId === payload.sessionId);
  if (sessionIndex === -1) {
    user.refreshSessions = [];
    await user.save();
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
  }

  const session = user.refreshSessions[sessionIndex];
  if (!session) {
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
  }

  const tokenMatches = await bcrypt.compare(refreshToken, session.tokenHash);
  if (!tokenMatches) {
    user.refreshSessions = [];
    await user.save();
    throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token reuse detected');
  }

  user.refreshSessions.splice(sessionIndex, 1);
  await user.save();

  return createSession(user, meta);
}

export async function logoutUser(userId: string, sessionId?: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  if (sessionId) {
    user.refreshSessions = user.refreshSessions.filter((s) => s.sessionId !== sessionId);
  } else {
    user.refreshSessions = [];
  }
  await user.save();
}

export async function findOrCreateGoogleUser(profile: {
  id: string;
  email: string;
  displayName?: string;
}) {
  let user = await User.findOne({
    $or: [{ googleId: profile.id }, { email: profile.email.toLowerCase() }],
    isDeleted: false,
  });

  if (user) {
    if (!user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }
  } else {
    user = await User.create({
      email: profile.email.toLowerCase(),
      googleId: profile.id,
      name: profile.displayName ?? '',
      role: 'owner',
    });
  }

  return user;
}

export function sanitizeUser(user: InstanceType<typeof User>) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    defaultCurrency: user.defaultCurrency,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function revokeSession(userId: string, sessionObjectId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Session not found');

  const before = user.refreshSessions.length;
  user.refreshSessions = user.refreshSessions.filter(
    (s) => s._id?.toString() !== sessionObjectId
  );

  if (user.refreshSessions.length === before) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }

  await user.save();
}

export async function listSessions(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  return user.refreshSessions.map((s) => ({
    _id: s._id,
    sessionId: s.sessionId,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
}
