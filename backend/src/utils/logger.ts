// src/utils/logger.ts

import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Central logger instance — import this everywhere instead of using console.log.
 *
 * In development: pretty-printed, colorized, human-readable in the terminal.
 * In production: raw structured JSON — easier for hosting platforms
 * (Render/Railway/etc.) to parse, filter, and search.
 */
const isDev = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL ?? 'info',
  // Only include the `transport` key at all when in dev.
  // With `exactOptionalPropertyTypes: true`, assigning `transport: undefined`
  // is a type error — the property must be omitted entirely, not set to undefined.
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});