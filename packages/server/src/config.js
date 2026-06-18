import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadConfig as loadAgnesConfig } from '@agnes/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

export function loadServerConfig() {
  const port = Number(process.env.PORT) || 3100;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET || 'agnes-server-secret-change-in-production';
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim());
  // NOTE: @agnes/core's loadConfig() does not accept options — it searches
  // process.cwd() for agnes.config.json. chdir to the monorepo root so the
  // lookup hits the project's config file. Side effect: changes process.cwd().
  process.chdir(ROOT);
  const agnesConfig = loadAgnesConfig();
  const dbPath = path.join(__dirname, '../data/agnes.db');
  return { port, nodeEnv, jwtSecret, frontendUrl, agnesConfig, dbPath, rootDir: ROOT };
}
