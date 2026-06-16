/**
 * Minimal Express server exposing:
 *   POST /run                → run a workflow (body: { workflow, inputs })
 *   POST /workflows/:name/run → run a named .flow.json (body: { inputs })
 *   GET  /workflows          → list watched workflows
 *   GET  /health             → liveness
 *
 * The watcher hot-reloads .flow.json files from a directory.
 */

import express, { type Request, type Response } from 'express';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, watch as fsWatch } from 'node:fs';
import { resolve, basename, extname, join } from 'node:path';
import { loadWorkflow, runWorkflow } from './index';

interface StartOpts {
  port: number;
  host: string;
  workflowPath?: string;
  watchDir?: string;
  defaultConfig?: { apiKey?: string; baseUrl?: string };
}

export async function startServer(opts: StartOpts): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '200mb' }));

  const cache: Map<string, string> = new Map();
  if (opts.watchDir) await loadDir(opts.watchDir, cache);
  if (opts.watchDir) {
    try { fsWatch(opts.watchDir, { persistent: true }, () => { loadDir(opts.watchDir!, cache).catch(() => {}); }); }
    catch { /* not fatal */ }
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.get('/workflows', async (_req: Request, res: Response) => {
    if (!opts.watchDir) return res.json({ workflows: [] });
    const list = [...cache.keys()].map((name) => ({ name, url: `/workflows/${encodeURIComponent(name)}/run` }));
    res.json({ workflows: list });
  });

  app.post('/workflows/:name/run', async (req: Request, res: Response) => {
    const name = decodeURIComponent(req.params.name);
    const text = cache.get(name);
    if (!text) return res.status(404).json({ error: `workflow not found: ${name}` });
    try {
      const wf = loadWorkflow(text);
      const inputs = (req.body && req.body.inputs) || {};
      const overrides = (req.body && req.body.config) || {};
      const result = await runWorkflow(wf, inputs, {
        config: { ...opts.defaultConfig, ...overrides },
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/run', async (req: Request, res: Response) => {
    try {
      let text: string;
      if (typeof req.body?.workflow === 'string') {
        const p = resolve(req.body.workflow);
        if (!existsSync(p)) return res.status(400).json({ error: `file not found: ${p}` });
        text = await readFile(p, 'utf-8');
      } else if (req.body?.workflow) {
        text = JSON.stringify(req.body.workflow);
      } else if (opts.workflowPath) {
        text = await readFile(opts.workflowPath, 'utf-8');
      } else {
        return res.status(400).json({ error: 'workflow is required (string path or JSON object)' });
      }
      const wf = loadWorkflow(text);
      const inputs = req.body?.inputs || {};
      const overrides = req.body?.config || {};
      const result = await runWorkflow(wf, inputs, {
        config: { ...opts.defaultConfig, ...overrides },
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.listen(opts.port, opts.host, () => {
    console.log(`\n  Agnes workflow server`);
    console.log(`  → http://${opts.host}:${opts.port}/health`);
    console.log(`  → POST http://${opts.host}:${opts.port}/run`);
    if (opts.watchDir) {
      console.log(`  → watching ${cache.size} workflows in ${opts.watchDir}`);
      console.log(`  → POST http://${opts.host}:${opts.port}/workflows/<name>/run`);
    } else if (opts.workflowPath) {
      console.log(`  → default workflow: ${opts.workflowPath}`);
    }
    console.log('');
  });
}

async function loadDir(dir: string, cache: Map<string, string>): Promise<void> {
  try {
    const files = await readdir(dir);
    for (const f of files) {
      if (!['.json', '.flow'].includes(extname(f))) continue;
      const text = await readFile(join(dir, f), 'utf-8');
      cache.set(basename(f, extname(f)), text);
    }
  } catch { /* dir doesn't exist yet */ }
}
