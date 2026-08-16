import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validateRequest.js';
import { createReportSchema } from './reports.types.js';
import * as reportsController from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.post('/', validateBody(createReportSchema), reportsController.create);
reportsRouter.get('/mine', reportsController.getMine);