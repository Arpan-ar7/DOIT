import type { Request, Response, NextFunction } from 'express';
import * as requestsService from './requests.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await requestsService.createRequest(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const result = await requestsService.getFeedForUser(req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) throw new AppError(400, 'Missing request id');
    const result = await requestsService.getRequestById(id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { id } = req.params;
    if (!id || Array.isArray(id)) throw new AppError(400, 'Missing request id');
    const result = await requestsService.acceptRequest(id, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { id } = req.params;
    if (!id || Array.isArray(id)) throw new AppError(400, 'Missing request id');
    const result = await requestsService.cancelRequest(id, req.user.id, req.body?.reason);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function confirmComplete(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { id } = req.params;
    if (!id || Array.isArray(id)) throw new AppError(400, 'Missing request id');
    const result = await requestsService.confirmCompletion(id, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getUserRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const role = (req.query.role as 'requester' | 'deliverer') ?? 'requester';
    const result = await requestsService.getUserRequests(req.user.id, role);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}