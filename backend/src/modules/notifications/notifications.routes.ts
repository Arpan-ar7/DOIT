import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validateRequest.js';
import {
  registerTokenSchema,
  unregisterTokenSchema,
  sendTestPushSchema,
} from './notifications.types.js';
import * as notificationsController from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.post(
  '/register-token',
  validateBody(registerTokenSchema),
  notificationsController.registerToken
);
notificationsRouter.post(
  '/unregister-token',
  validateBody(unregisterTokenSchema),
  notificationsController.unregisterToken
);
notificationsRouter.get('/mine', notificationsController.getMine);
notificationsRouter.post(
  '/test',
  validateBody(sendTestPushSchema),
  notificationsController.sendTest
);