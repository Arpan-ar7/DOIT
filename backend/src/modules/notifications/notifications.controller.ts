import type { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function registerToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await notificationsService.registerDeviceToken(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function unregisterToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    await notificationsService.unregisterDeviceToken(req.user.id, req.body.fcm_token);
    res.status(200).json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await notificationsService.getMyNotifications(req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * TEST-ONLY endpoint: sends yourself a push to confirm the pipeline works.
 */
export async function sendTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { title, body } = req.body;
    const result = await notificationsService.sendPush(req.user.id, 'system', title, body);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}