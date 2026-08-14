// src/config/env.ts

import * as dotenv from 'dotenv';
import path from 'node:path';

// __dirname works natively here because this project compiles to CommonJS
// (ts-node / ts-node-dev default). No need for import.meta.url or fileURLToPath.
//
// This file lives at: backend/src/config/env.ts
// __dirname = backend/src/config
// Two levels up (config -> src -> backend) reaches backend/.env
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
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