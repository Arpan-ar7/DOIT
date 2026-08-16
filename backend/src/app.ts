// src/app.ts

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { z } from 'zod';

import { authenticate } from './middleware/authenticate.js';

import { validateBody } from './middleware/validateRequest.js';
import { requestsRouter } from './modules/requests/requests.router.js';
import { ratingsRouter } from './modules/ratings/ratings.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';






export const app = express();


app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(pinoHttp({ logger }));

const testSchema = z.object({ name: z.string().min(1) });

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/test-auth', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

app.post('/test-validate', validateBody(testSchema), (req, res) => {
  res.status(200).json({ received: req.body });
});


app.use('/api/v1/requests', requestsRouter);

app.use('/api/v1/ratings', ratingsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/transactions', transactionsRouter);

// ------------------------------
app.use(notFoundHandler);
app.use(errorHandler);