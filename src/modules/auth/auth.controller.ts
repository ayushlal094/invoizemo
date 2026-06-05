import type { Request, Response, NextFunction } from 'express';
import passport from '../../config/passport.js';
import * as authService from './auth.service.js';
import { env } from '../../config/env.js';
import type { UserDocument } from '../users/user.model.js';

function getMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip ?? req.socket.remoteAddress,
  };
}

// POST /auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerUser(req.body, getMeta(req));
    res
      .cookie(result.cookieName, result.refreshToken, result.cookieOptions)
      .status(201)
      .json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
}

// POST /auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body, getMeta(req));
    res
      .cookie(result.cookieName, result.refreshToken, result.cookieOptions)
      .json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
}

// POST /auth/refresh
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.refreshToken as string | undefined;
    const result = await authService.refreshTokens(rawToken, getMeta(req));
    res
      .cookie(result.cookieName, result.refreshToken, result.cookieOptions)
      .json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
}

// POST /auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.refreshToken as string | undefined;
    await authService.logoutUser(rawToken);
    res
      .clearCookie('refreshToken', { httpOnly: true, path: '/' })
      .json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) { next(err); }
}

// POST /auth/forgot-password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email);
    // Always respond with success — never leak if email exists
    res.json({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent.' },
    });
  } catch (err) { next(err); }
}

// POST /auth/reset-password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, data: { message: 'Password reset successfully. Please sign in.' } });
  } catch (err) { next(err); }
}

// GET /auth/google  — redirects to Google consent screen
export function googleAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
}

// GET /auth/google/callback  — Google redirects here
export function googleCallback(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', { session: false }, async (err: Error, user: UserDocument) => {
    if (err || !user) {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }
    try {
      const result = await authService.handleGoogleUser(user, getMeta(req));
      res
        .cookie(result.cookieName, result.refreshToken, result.cookieOptions)
        .redirect(`${env.CLIENT_URL}/oauth/callback?token=${result.accessToken}`);
    } catch (error) { next(error); }
  })(req, res, next);
}
