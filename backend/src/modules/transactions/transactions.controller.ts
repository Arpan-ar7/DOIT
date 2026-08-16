import type { Request, Response, NextFunction } from 'express';
import * as transactionsService from './transactions.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await transactionsService.createTransaction(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { id } = req.params;
    if (!id) throw new AppError(400, 'Missing transaction id');
    const result = await transactionsService.confirmTransaction(id, req.user.id);
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
    if (!requestId) throw new AppError(400, 'Missing requestId');
    const result = await transactionsService.getTransactionsForRequest(requestId, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await transactionsService.getMyTransactions(req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}