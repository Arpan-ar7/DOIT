import type { Request, Response, NextFunction } from 'express';
import * as ratingsService from './ratings.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await ratingsService.submitRating(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await ratingsService.getRatingsByRater(req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getForRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { requestId } = req.params;
    if (!requestId || Array.isArray(requestId)) throw new AppError(400, 'Missing requestId');
    const result = await ratingsService.getRatingsForRequest(requestId, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getForUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    if (!userId || Array.isArray(userId)) throw new AppError(400, 'Missing userId');
    const result = await ratingsService.getRatingsForUser(userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}