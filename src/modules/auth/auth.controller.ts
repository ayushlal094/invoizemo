import type { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookieToken,
  createSession,
  findOrCreateGoogleUser,
} from './auth.service.js';
import { env, isGoogleOAuthEnabled } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { generateSecureToken } from '../../utils/encryption.js';

const oauthStates = new Map<string, number>();

function cleanupOAuthStates(): void {
  const now = Date.now();
  for (const [state, expires] of oauthStates) {
    if (expires < now) oauthStates.delete(state);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await registerUser(req.body);
    const { User } = await import('../users/user.model.js');
    const user = await User.findOne({ email: req.body.email.toLowerCase(), isDeleted: false });
    if (!user) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create account');

    const session = await createSession(user, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setRefreshCookie(res, session.refreshToken);
    res.status(201).json({
      success: true,
      data: { user: session.user, accessToken: session.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await loginUser(req.body, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshCookie(res, session.refreshToken);
    res.json({
      success: true,
      data: { user: session.user, accessToken: session.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getRefreshCookieToken(req.cookies as Record<string, string | undefined>);
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token required');
    }

    const session = await refreshSession(token, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setRefreshCookie(res, session.refreshToken);
    res.json({
      success: true,
      data: { accessToken: session.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      const token = getRefreshCookieToken(req.cookies as Record<string, string | undefined>);
      if (token) {
        const { verifyRefreshToken } = await import('../../utils/jwt.js');
        try {
          const payload = verifyRefreshToken(token);
          await logoutUser(req.user.id, payload.sessionId);
        } catch {
          await logoutUser(req.user.id);
        }
      } else {
        await logoutUser(req.user.id);
      }
    }
    clearRefreshCookie(res);
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (error) {
    next(error);
  }
}

export function googleAuth(_req: Request, res: Response, next: NextFunction): void {
  if (!isGoogleOAuthEnabled) {
    next(new AppError(400, 'INVALID_REQUEST', 'Google OAuth is not configured'));
    return;
  }
  cleanupOAuthStates();
  const state = generateSecureToken(16);
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_CALLBACK_URL!,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isGoogleOAuthEnabled) {
      throw new AppError(400, 'INVALID_REQUEST', 'Google OAuth is not configured');
    }

    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      throw new AppError(400, 'INVALID_REQUEST', 'Invalid OAuth callback');
    }

    const stateExpiry = oauthStates.get(state);
    oauthStates.delete(state);
    if (!stateExpiry || stateExpiry < Date.now()) {
      throw new AppError(400, 'INVALID_REQUEST', 'Invalid OAuth state');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_CALLBACK_URL!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new AppError(401, 'UNAUTHORIZED', 'OAuth token exchange failed');

    const tokens = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) throw new AppError(401, 'UNAUTHORIZED', 'Failed to fetch profile');

    const profile = (await profileRes.json()) as { id: string; email: string; name?: string };
    const user = await findOrCreateGoogleUser({
      id: profile.id,
      email: profile.email,
      displayName: profile.name,
    });

    const session = await createSession(user, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setRefreshCookie(res, session.refreshToken);
    res.redirect(`${env.CLIENT_URL}/auth/callback?token=${session.accessToken}`);
  } catch (error) {
    next(error);
  }
}
