// src/config/env.ts

import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// True ESM (via tsx) has no __dirname global — derive it from import.meta.url instead.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file lives at: backend/src/config/env.ts
// __dirname = backend/src/config
// Two levels up (config -> src -> backend) reaches backend/.env
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  SUPABASE_URL: requiredEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'debug',
} as const;