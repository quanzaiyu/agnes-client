/**
 * Core workflow runner. Pure-Node, no React Flow / zustand.
 *
 *   runWorkflow(json, inputs)  →  injects inputs, topologically executes
 *                                 every node via the resolvers map, and
 *                                 collects outputs.
 *
 * Side effects (network calls to apihub.agnes-ai.com) happen in resolvers,
 * which talk to `@agnes/core` (loaded lazily so the module is decoupled).
 */

import { topoSort } from './engine/topoSort';
import { interpolate, findVarRefs } from './engine/interpolate';
import { RESOLVERS } from './resolvers';
import type { Resolver, ResolverContext, PortValue } from './resolvers/types';
import { injectInputs } from './io-binding';
import { extractOutputs } from './io-extract';
import type { ExportedWorkflow, WorkflowNodeLike, WorkflowEdgeLike } from './types';

export interface RunOptions {
  /** Override config (apiKey, baseUrl). Default: load from loadConfig(). */
  config?: { apiKey?: string; baseUrl?: string };
  signal?: AbortSignal;
  onProgress?: (nodeId: string, pct: number) => void;
  onStream?: (nodeId: string, delta: string) => void;
  onLog?: (msg: string) => void;
}

export interface RunResult {
  outputs: Record<string, unknown>;
  logs: string[];
  errors: Record<string, string>;
}

export async function runWorkflow(
  workflow: ExportedWorkflow,
  inputs: Record<string, unknown>,
  opts: RunOptions = {},
): Promise<RunResult> {
  const signal = opts.signal ?? new AbortController().signal;
  const log: string[] = [];
  const errors: Record<string, string> = {};
  const append = (level: 'info' | 'warn' | 'error', msg: string) => {
    const line = `[${level}] ${msg}`;
    log.push(line);
    opts.onLog?.(line);
  };

  // Lazy-load config (avoids hard dep at module-init time)
  const cfg = await loadConfigSafe(opts.config);

  // Wire the API client to use the loaded baseUrl + key. This lets the loader
  // talk directly to apihub.agnes-ai.com without any reverse proxy.
  const { setApiBase, setApiKey } = await import('./api/client');
  setApiBase(cfg.baseUrl);
  setApiKey(cfg.apiKey);

  // 1. Inject external inputs into a deep-cloned nodes array
  const nodes: WorkflowNodeLike[] = injectInputs(workflow, inputs);
  const edges = (workflow.edges || []) as WorkflowEdgeLike[];

  // 2. Topological sort
  let layers: string[][];
  try {
    layers = topoSort(nodes as never[], edges as never[]);
  } catch (e) {
    throw new Error(`拓扑排序失败: ${(e as Error).message}`);
  }

  append('info', `拓扑分层完成: ${layers.length} 层, ${nodes.length} 个节点`);

  // 3. Execute layer by layer
  for (const layer of layers) {
    if (signal.aborted) { append('warn', '执行已中止'); break; }
    await Promise.allSettled(layer.map(async (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const resolver = RESOLVERS[node.type] as Resolver | undefined;
      if (!resolver) {
        const msg = `未注册 resolver: ${node.type}`;
        errors[nodeId] = msg;
        append('error', `[${nodeId}] ${msg}`);
        throw new Error(msg);
      }
      if (!node.data) node.data = {};
      if (!node.data.outputs) node.data.outputs = {};
      node.data.status = 'running';
      append('info', `[${nodeId}] 开始 ${node.type}`);
      const ctx: ResolverContext = {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        signal,
        onProgress: (pct) => {
          if (node.data) node.data.progress = pct;
          opts.onProgress?.(nodeId, pct);
        },
        onStream: (delta) => {
          if (node.data) node.data.streamText = ((node.data.streamText as string | undefined) || '') + delta;
          opts.onStream?.(nodeId, delta);
        },
        resolvePort: (nid, pid) => resolvePortValue(nid, pid, nodes, edges),
        resolveAll: (nid, pid) => resolveAllUpstream(nid, pid, nodes, edges),
        interpolate: (t) => t,
        variables: {},
      };
      ctx.variables = collectVariables(nodeId, nodes, edges);
      ctx.interpolate = (t) => interpolate(t, ctx.variables);
      try {
        const outputs = await resolver(node as never, ctx);
        node.data.outputs = outputs as never;
        node.data.status = 'success';
        append('info', `[${nodeId}] 完成`);
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError') {
          node.data.status = 'idle';
          append('warn', `[${nodeId}] 已取消`);
        } else {
          node.data.status = 'error';
          node.data.error = err.message;
          errors[nodeId] = err.message;
          append('error', `[${nodeId}] 失败: ${err.message}`);
          throw e;
        }
      }
    }));
  }

  // 4. Collect outputs
  const outputs = extractOutputs(workflow, nodes);
  return { outputs, logs: log, errors };
}

function resolvePortValue(
  targetNodeId: string, portId: string,
  nodes: WorkflowNodeLike[], edges: WorkflowEdgeLike[],
): PortValue {
  for (const e of edges) {
    if (e.target !== targetNodeId) continue;
    if ((e.targetHandle || '') !== portId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (!src?.data?.outputs) return undefined;
    return ((src.data.outputs as Record<string, unknown>)[e.sourceHandle || ''] as PortValue) ?? undefined;
  }
  return undefined;
}

function resolveAllUpstream(
  targetNodeId: string, portId: string,
  nodes: WorkflowNodeLike[], edges: WorkflowEdgeLike[],
): PortValue[] {
  const out: PortValue[] = [];
  for (const e of edges) {
    if (e.target !== targetNodeId) continue;
    if ((e.targetHandle || '') !== portId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (!src?.data?.outputs) continue;
    const v = ((src.data.outputs as Record<string, unknown>)[e.sourceHandle || ''] as PortValue) ?? undefined;
    if (v !== undefined) out.push(v);
  }
  return out;
}

function collectVariables(
  nodeId: string,
  nodes: WorkflowNodeLike[], edges: WorkflowEdgeLike[],
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (!src) continue;
    if (src.type === 'variableInput') {
      const pairs = ((src.data as { varPairs?: Array<{ id: string; name: string; value: string }> }).varPairs) || [];
      const srcHandle = e.sourceHandle || '';
      if (srcHandle.startsWith('var:')) {
        const p = pairs.find((p) => p.id === srcHandle.slice(4));
        if (p?.name) vars[p.name] = p.value ?? '';
      } else if (pairs[0]?.name) {
        vars[pairs[0].name] = pairs[0].value ?? '';
      }
    }
  }
  // Also pre-register ${refs} from any upstream promptInput's text
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (src?.type === 'promptInput' && src.data?.outputs) {
      const txt = (src.data.outputs as Record<string, unknown>).text as string | undefined;
      if (txt) for (const ref of findVarRefs(txt)) if (!(ref in vars)) vars[ref] = '';
    }
  }
  return vars;
}

async function loadConfigSafe(override?: { apiKey?: string; baseUrl?: string }): Promise<{ apiKey: string; baseUrl: string }> {
  // 1. CLI / env override wins
  if (override?.apiKey || override?.baseUrl) {
    return {
      apiKey: override?.apiKey || process.env.AGNES_API_KEY || '',
      baseUrl: override?.baseUrl || process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    };
  }
  // 2. Try @agnes/core.loadConfig (reads CWD's agnes.config.json)
  try {
    const core = await import('@agnes/core');
    const cfg = core.loadConfig();
    if (cfg.apiKey) {
      return { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl || 'https://apihub.agnes-ai.com/v1' };
    }
  } catch { /* ignore */ }
  // 3. Walk up from CWD to find an agnes.config.json (so loader works when
  //    invoked from any subdirectory inside the monorepo).
  const found = findConfigUpward(process.cwd());
  if (found) {
    return {
      apiKey: found.apiKey || process.env.AGNES_API_KEY || '',
      baseUrl: found.baseUrl || process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    };
  }
  // 4. Env or default
  return {
    apiKey: process.env.AGNES_API_KEY || '',
    baseUrl: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
  };
}

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function findConfigUpward(start: string): { apiKey: string; baseUrl: string } | null {
  let dir = start;
  while (true) {
    const candidate = resolve(dir, 'agnes.config.json');
    if (existsSync(candidate)) {
      try {
        const j = JSON.parse(readFileSync(candidate, 'utf-8')) as { apiKey?: string; baseUrl?: string };
        return { apiKey: j.apiKey || '', baseUrl: j.baseUrl || 'https://apihub.agnes-ai.com/v1' };
      } catch { /* ignore */ }
    }
    const parent = dirname(dir);
    if (parent === dir) return null; // reached root
    dir = parent;
  }
}
