#!/usr/bin/env node
/**
 * agnes-flow CLI
 *
 *   agnes-flow run <file.flow.json> --input prompt="A cat"
 *   agnes-flow run <file.flow.json> --stdin
 *   agnes-flow serve [--port 4500] [--workflow <file>] [--watch <dir>]
 *
 * Reads API key from ~/.agnes/config.json (or CWD) by default; override with
 *   --api-key sk-xxx
 *   --base-url https://...
 */

import { Command } from 'commander';
import { readFile, watch } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { loadWorkflow, runWorkflow, type ExportedWorkflow } from './index';
import { startServer } from './http';

async function readFileMaybe(p: string): Promise<string | null> {
  if (!existsSync(p)) return null;
  return readFile(p, 'utf-8');
}

function parseInputPairs(pairs: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of pairs) {
    const idx = p.indexOf('=');
    if (idx < 0) {
      console.error(`[warn] --input 格式应为 key=value, 跳过: ${p}`);
      continue;
    }
    const key = p.slice(0, idx);
    const value = p.slice(idx + 1);
    // Try JSON parse (number, bool, object), else string
    try {
      out[key] = JSON.parse(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

const program = new Command();
program
  .name('agnes-flow')
  .description('Agnes AI workflow loader — run exported workflows from CLI or HTTP')
  .version('1.0.0');

program
  .command('run')
  .description('Run a workflow from a .flow.json file')
  .argument('<file>', 'workflow JSON file')
  .option('--input <k=v>', 'input parameter (repeatable)', collect, [])
  .option('--stdin', 'read inputs as JSON from stdin', false)
  .option('--api-key <key>', 'override API key')
  .option('--base-url <url>', 'override Base URL')
  .option('--verbose', 'print logs to stderr', false)
  .action(async (file: string, opts: {
    input: string[]; stdin: boolean; apiKey?: string; baseUrl?: string; verbose: boolean;
  }) => {
    const path = resolve(file);
    if (!existsSync(path)) { console.error(`File not found: ${path}`); process.exit(2); }
    const text = await readFile(path, 'utf-8');
    const workflow = loadWorkflow(text);

    let inputs: Record<string, unknown> = {};
    if (opts.stdin) {
      const stdinText = await readStdin();
      try { inputs = JSON.parse(stdinText); }
      catch (e) { console.error(`Invalid stdin JSON: ${(e as Error).message}`); process.exit(2); }
    } else {
      inputs = parseInputPairs(opts.input);
    }

    const result = await runWorkflow(workflow, inputs, {
      config: { apiKey: opts.apiKey, baseUrl: opts.baseUrl },
      onLog: (l) => { if (opts.verbose) console.error(l); },
    });
    console.log(JSON.stringify(result, null, 2));
    if (Object.keys(result.errors).length > 0) process.exit(1);
  });

program
  .command('serve')
  .description('Start an HTTP server that exposes /run endpoints')
  .option('--port <n>', 'listen port', '4500')
  .option('--host <addr>', 'bind host', '0.0.0.0')
  .option('--workflow <file>', 'default workflow to use for POST /run')
  .option('--watch <dir>', 'directory of .flow.json files to expose as /workflows/:name/run')
  .option('--api-key <key>', 'default API key for all requests')
  .option('--base-url <url>', 'default Base URL')
  .action(async (opts: {
    port: string; host: string; workflow?: string; watch?: string;
    apiKey?: string; baseUrl?: string;
  }) => {
    const wfPath = opts.workflow ? resolve(opts.workflow) : undefined;
    const watchDir = opts.watch ? resolve(opts.watch) : undefined;
    const port = parseInt(opts.port, 10);
    if (Number.isNaN(port)) { console.error('Invalid port'); process.exit(2); }
    await startServer({
      port, host: opts.host, workflowPath: wfPath, watchDir,
      defaultConfig: { apiKey: opts.apiKey, baseUrl: opts.baseUrl },
    });
  });

program
  .command('validate')
  .description('Validate a workflow JSON file')
  .argument('<file>', 'workflow JSON file')
  .action((file: string) => {
    const path = resolve(file);
    if (!existsSync(path)) { console.error(`File not found: ${path}`); process.exit(2); }
    try {
      const wf = loadWorkflow(readFileSync(path, 'utf-8'));
      console.log(`✓ Valid workflow: ${wf.name || '(unnamed)'}`);
      console.log(`  Nodes: ${wf.nodes.length}, Edges: ${wf.edges.length}`);
      console.log(`  Inputs: ${(wf.apiInputs || []).length}, Outputs: ${(wf.apiOutputs || []).length}`);
    } catch (e) {
      console.error(`✗ Invalid: ${(e as Error).message}`);
      process.exit(1);
    }
  });

function collect(value: string, prev: string[]) { return prev.concat([value]); }

async function readStdin(): Promise<string> {
  return new Promise((resolveStdin) => {
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => { buf += c; });
    process.stdin.on('end', () => resolveStdin(buf));
  });
}

program.parseAsync(process.argv).catch((e) => {
  console.error('Fatal:', e?.message || e);
  process.exit(1);
});
