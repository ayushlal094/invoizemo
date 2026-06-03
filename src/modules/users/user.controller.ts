import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';
import { AppError } from '../../utils/appError.js';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateMe(req.user!.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.body.confirmText !== 'DELETE MY ACCOUNT') {
      throw new AppError(400, 'CONFIRM_TEXT_MISMATCH', 'Confirmation text does not match');
    }
    await userService.deleteMe(req.user!.id);
    res.json({ success: true, data: { message: 'Account deleted' } });
  } catch (error) {
    next(error);
  }
}

export async function exportMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userService.exportMe(req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await userService.listSessions(req.user!.id);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.revokeSession(req.user!.id, req.params.id as string);
    res.json({ success: true, data: { message: 'Session revoked' } });
  } catch (error) {
    next(error);
  }
}
