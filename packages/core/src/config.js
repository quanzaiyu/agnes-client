import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATHS = [
  path.resolve(process.cwd(), 'agnes.config.json'),
  path.resolve(os.homedir(), '.agnes', 'config.json'),
];

const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://apihub.agnes-ai.com/v1',
};

export function loadConfig() {
  for (const p of CONFIG_PATHS) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      } catch (e) {
        // ignore parse errors
      }
    }
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config, location = 'local') {
  const target = location === 'global'
    ? CONFIG_PATHS[1]
    : CONFIG_PATHS[0];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return target;
}

export { CONFIG_PATHS, DEFAULT_CONFIG };