import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, type UserDocument } from '../users/user.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { env } from '../../config/env.js';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../../services/email.service.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAppError(message: string, statusCode: number, code: string) {
  const err = new Error(message) as Error & { statusCode: number; code: string };
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function buildTokens(user: UserDocument, sessionId: string) {
  const accessToken = signAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), sessionId });
  return { accessToken, refreshToken };
}

export function safeUserResponse(user: UserDocument) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    defaultCurrency: user.defaultCurrency,
    timezone: user.timezone,
  };
}

async function createSession(
  user: UserDocument,
  refreshToken: string,
  meta: { userAgent?: string; ip?: string }
) {
  const sessionId = crypto.randomUUID();
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  // Cap at 5 active sessions
  if (user.refreshSessions.length >= 5) user.refreshSessions.shift();

  user.refreshSessions.push({
    sessionId,
    tokenHash,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save();
  return sessionId;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
  meta: { userAgent?: string; ip?: string }
) {
  const existing = await User.findOne({ email: input.email, isDeleted: false });
  if (existing) throw makeAppError('Email already in use', 409, 'CONFLICT');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    email: input.email,
    passwordHash,
    name: input.name ?? input.email.split('@')[0],
    role: 'owner',
  }) as UserDocument;

  const sessionId = crypto.randomUUID();
  const { accessToken, refreshToken } = buildTokens(user, sessionId);
  await createSession(user, refreshToken, meta);

  // Send welcome email — fire and forget (don't block response)
  sendWelcomeEmail(user.email, user.name).catch((e) =>
    console.error('Welcome email failed:', e)
  );

  return {
    accessToken, refreshToken,
    user: safeUserResponse(user),
    cookieOptions: COOKIE_OPTIONS, cookieName: REFRESH_TOKEN_COOKIE,
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(
  input: LoginInput,
  meta: { userAgent?: string; ip?: string }
) {
  const user = await User.findOne({ email: input.email, isDeleted: false }) as UserDocument | null;

  // Always run bcrypt even when user not found — prevents timing attacks
  const dummyHash = '$2b$12$invalidhashtopreventtimingattackspadding';
  const hashToCheck = user?.passwordHash ?? dummyHash;
  const passwordMatch = await bcrypt.compare(input.password, hashToCheck);

  if (!user || !passwordMatch) {
    throw makeAppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  if (!user.passwordHash) {
    throw makeAppError(
      'This account uses Google Sign-In. Please click "Continue with Google".',
      401, 'UNAUTHORIZED'
    );
  }

  const sessionId = crypto.randomUUID();
  const { accessToken, refreshToken } = buildTokens(user, sessionId);
  await createSession(user, refreshToken, meta);

  return {
    accessToken, refreshToken,
    user: safeUserResponse(user),
    cookieOptions: COOKIE_OPTIONS, cookieName: REFRESH_TOKEN_COOKIE,
  };
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshTokens(
  rawRefreshToken: string | undefined,
  meta: { userAgent?: string; ip?: string }
) {
  if (!rawRefreshToken)
    throw makeAppError('No refresh token', 401, 'REFRESH_TOKEN_INVALID');

  let payload: { userId: string; sessionId: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw makeAppError('Invalid refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  const user = await User.findById(payload.userId) as UserDocument | null;
  if (!user || user.isDeleted)
    throw makeAppError('User not found', 401, 'REFRESH_TOKEN_INVALID');

  const session = user.refreshSessions.find((s) => s.sessionId === payload.sessionId);
  if (!session) {
    // Token reuse — revoke all sessions
    user.refreshSessions = [];
    await user.save();
    throw makeAppError('Refresh token reuse detected', 401, 'REFRESH_TOKEN_INVALID');
  }

  const isValid = await bcrypt.compare(rawRefreshToken, session.tokenHash);
  if (!isValid) {
    user.refreshSessions = [];
    await user.save();
    throw makeAppError('Refresh token invalid', 401, 'REFRESH_TOKEN_INVALID');
  }

  // Rotate session
  user.refreshSessions = user.refreshSessions.filter(
    (s) => s.sessionId !== payload.sessionId
  );

  const newSessionId = crypto.randomUUID();
  const { accessToken, refreshToken: newRefreshToken } = buildTokens(user, newSessionId);
  await createSession(user, newRefreshToken, meta);

  return {
    accessToken, refreshToken: newRefreshToken,
    cookieOptions: COOKIE_OPTIONS, cookieName: REFRESH_TOKEN_COOKIE,
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutUser(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) return;
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    const user = await User.findById(payload.userId) as UserDocument | null;
    if (user) {
      user.refreshSessions = user.refreshSessions.filter(
        (s) => s.sessionId !== payload.sessionId
      );
      await user.save();
    }
  } catch {
    // Best effort — always clear cookie
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

export async function handleGoogleUser(
  user: UserDocument,
  meta: { userAgent?: string; ip?: string }
) {
  const sessionId = crypto.randomUUID();
  const { accessToken, refreshToken } = buildTokens(user, sessionId);
  await createSession(user, refreshToken, meta);
  return { accessToken, refreshToken, cookieOptions: COOKIE_OPTIONS, cookieName: REFRESH_TOKEN_COOKIE };
}

// ── Forgot password ───────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email, isDeleted: false }) as UserDocument | null;

  // Always respond with success — never reveal if email exists (prevents enumeration)
  if (!user || !user.passwordHash) return;

  // Generate secure random token, hash it before storing
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send email with the RAW token (user never sees the hash)
  sendPasswordResetEmail(email, rawToken).catch((e) =>
    console.error('Reset email failed:', e)
  );
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(rawToken: string, newPassword: string) {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
    isDeleted: false,
  }) as UserDocument | null;

  if (!user) {
    throw makeAppError('Invalid or expired reset token', 400, 'INVALID_REQUEST');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Revoke all sessions — force re-login on all devices
  user.refreshSessions = [];
  await user.save();

  sendPasswordChangedEmail(user.email).catch((e) =>
    console.error('Password changed email failed:', e)
  );
}
