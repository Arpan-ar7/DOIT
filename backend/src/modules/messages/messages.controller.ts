import type { Request, Response, NextFunction } from 'express';
import * as messagesService from './messages.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { requestId } = req.params;
    if (!requestId || Array.isArray(requestId)) throw new AppError(400, 'Missing requestId');
    const result = await messagesService.sendMessage(requestId, req.user.id, req.body.content);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { requestId } = req.params;
    if (!requestId || Array.isArray(requestId)) throw new AppError(400, 'Missing requestId');
    const result = await messagesService.getMessageHistory(requestId, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}