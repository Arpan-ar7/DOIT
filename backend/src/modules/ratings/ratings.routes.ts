import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validateRequest.js';
import { submitRatingSchema } from './ratings.types.js';
import * as ratingsController from './ratings.controller.js';

export const ratingsRouter = Router();

ratingsRouter.use(authenticate);


ratingsRouter.post('/', validateBody(submitRatingSchema), ratingsController.submit);
ratingsRouter.get('/mine', ratingsController.getMine);
ratingsRouter.get('/request/:requestId', ratingsController.getForRequest);
ratingsRouter.get('/user/:userId', ratingsController.getForUser);