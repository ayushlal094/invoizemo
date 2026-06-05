import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.userId);
    res.json({ success: true, data: userService.safeUser(user) });
  } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(req.user!.userId, req.body);
    res.json({ success: true, data: userService.safeUser(user) });
  } catch (err) { next(err); }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.deleteUser(req.user!.userId);
    res
      .clearCookie('refreshToken', { httpOnly: true, path: '/' })
      .json({ success: true, data: { message: 'Account deleted' } });
  } catch (err) { next(err); }
}

export async function exportMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.exportUser(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await userService.getSessions(req.user!.userId);
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.revokeSession(req.user!.userId, req.params.id);
    res.json({ success: true, data: { message: 'Session revoked' } });
  } catch (err) { next(err); }
}
  