import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validateRequest.js';
import { createTransactionSchema } from './transactions.types.js';
import * as transactionsController from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);

transactionsRouter.post('/', validateBody(createTransactionSchema), transactionsController.create);
transactionsRouter.post('/:id/confirm', transactionsController.confirm);
transactionsRouter.get('/mine', transactionsController.getMine);
transactionsRouter.get('/request/:requestId', transactionsController.getForRequest);