import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody, validateParams } from '../../middleware/validateRequest.js';
import { createRequestSchema, cancelRequestSchema, idParamSchema } from './requests.type.js';
import * as requestsController from './requests.controller.js';

export const requestsRouter = Router();

// Applies to EVERY route below — no route in this module can be
// hit without a valid Supabase JWT.
requestsRouter.use(authenticate);

requestsRouter.post('/', validateBody(createRequestSchema), requestsController.create);
requestsRouter.get('/', requestsController.getFeed);
requestsRouter.get('/mine', requestsController.getUserRequests);
requestsRouter.get('/:id', validateParams(idParamSchema), requestsController.getById);
requestsRouter.post('/:id/accept', validateParams(idParamSchema), requestsController.accept);
requestsRouter.post(
  '/:id/cancel',
  validateParams(idParamSchema),
  validateBody(cancelRequestSchema),
  requestsController.cancel
);
requestsRouter.post(
  '/:id/confirm-complete',
  validateParams(idParamSchema),
  requestsController.confirmComplete
);