// src/app.ts

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

// ------------------------------
// Core middleware
// ------------------------------
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(pinoHttp({ logger }));

// ------------------------------
// Health check
// Every hosting platform (Render/Railway/Fly) pings this
// to confirm the service is alive after deploy.
// ------------------------------
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ------------------------------
// Routes will be mounted here as modules are built, e.g:
// import { requestsRouter } from './modules/requests/requests.routes.js';
// app.use('/api/v1/requests', requestsRouter);
// ------------------------------

// ------------------------------
// Error handling — MUST be mounted last, after all routes.
// notFoundHandler catches unmatched routes,
// errorHandler is the final catch-all for anything thrown/passed via next(err).
// ------------------------------
app.use(notFoundHandler);
app.use(errorHandler);