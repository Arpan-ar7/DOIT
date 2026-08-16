import type { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await reportsService.createReport(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await reportsService.getMyReports(req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}