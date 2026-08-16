import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody, validateParams } from '../../middleware/validateRequest.js';
import { sendMessageSchema, requestIdParamSchema } from './messages.types.js';
import * as messagesController from './messages.controller.js';

export const messagesRouter = Router();

messagesRouter.use(authenticate);

// Nested under request id: /api/v1/requests/:requestId/messages
messagesRouter.get(
  '/:requestId/messages',
  validateParams(requestIdParamSchema),
  messagesController.getHistory
);
messagesRouter.post(
  '/:requestId/messages',
  validateParams(requestIdParamSchema),
  validateBody(sendMessageSchema),
  messagesController.send
);