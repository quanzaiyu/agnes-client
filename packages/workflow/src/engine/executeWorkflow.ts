/**
 * Workflow execution engine.
 *
 * Given a graph of nodes + edges, compute a topological layering, then execute
 * each layer in parallel. Within a layer, each node's resolver is called with
 * a context that exposes:
 *   - resolvePort(nodeId, portId) — value of an upstream node's output port
 *   - resolveAll(nodeId, portId)  — array of all upstream values (fan-in)
 *   - interpolate(text)          — ${var} substitution using collected variables
 *   - onProgress(pct), onStream(delta)
 *
 * Variable collection strategy:
 *   - We pre-scan all PromptInput node outputs (after they run) for ${var}
 *     references, then map them to any connected VariableInput node whose
 *     `name` param matches.
 */

import { topoSort } from './topoSort';
import { interpolate } from './interpolate';
import { findVarRefs } from './interpolate';
import { RESOLVERS } from './resolvers';
import type {
  WorkflowNode, WorkflowEdge, ResolverContext, PortValue, NodeData,
} from './types';
import { useRunStore } from '../store/runStore';
import { useWorkflowStore } from '../store/workflowStore';

interface ExecuteOpts {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  signal: AbortSignal;
  onProgress: (nodeId: string, pct: number) => void;
  onStream: (nodeId: string, delta: string) => void;
  onOutputs: (nodeId: string, outputs: Record<string, PortValue>) => void;
}

export async function executeWorkflow(opts: ExecuteOpts): Promise<void> {
  const { nodes, edges, signal } = opts;
  const nodeMap = new Map<string, WorkflowNode>(nodes.map((n) => [n.id, n]));
  const layers = topoSort(nodes, edges);
  const runStore = useRunStore.getState();
  const setNodeData = useWorkflowStore.getState().setNodeData;

  // Reset status for all nodes
  for (const n of nodes) setNodeData(n.id, { status: 'idle', error: undefined, progress: undefined, streamText: undefined });

  for (const layer of layers) {
    if (signal.aborted) {
      runStore.append({ level: 'warn', message: '执行已中止' });
      break;
    }
    await Promise.allSettled(layer.map(async (nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const n = node as WorkflowNode & { type: string };
      const resolver = RESOLVERS[n.type];
      if (!resolver) {
        setNodeData(nodeId, { status: 'error', error: `No resolver for node type: ${n.type}` });
        throw new Error(`No resolver for ${n.type}`);
      }

      setNodeData(nodeId, { status: 'running' });
      runStore.append({ level: 'info', nodeId, message: `开始执行 ${node.type}` });

      // Build context
      const ctx: ResolverContext = {
        apiKey: '',   // unused; backend holds the key
        baseUrl: '/api/v1',
        signal,
        onProgress: (pct) => {
          setNodeData(nodeId, { progress: pct });
          opts.onProgress(nodeId, pct);
        },
        onStream: (delta) => {
          const prev = nodeMap.get(nodeId)?.data.streamText || '';
          setNodeData(nodeId, { streamText: prev + delta });
          opts.onStream(nodeId, delta);
        },
        resolvePort: (nid, pid) => resolvePortValue(nid, pid, edges, nodeMap),
        resolveAll: (nid, pid) => resolveAllUpstream(nid, pid, edges, nodeMap),
        interpolate: (text: string) => text, // filled below after first pass
        variables: {},
      };

      // Collect variables from this node's upstream VariableInputs (if it's a
      // prompt-consuming node). Look at any connected source whose node type
      // is variableInput.
      ctx.variables = collectVariablesForNode(nodeId, edges, nodeMap);
      ctx.interpolate = (text) => interpolate(text, ctx.variables);

      try {
        const outputs = await resolver(node, ctx);
        setNodeData(nodeId, { status: 'success', outputs: outputs as NodeData['outputs'] });
        opts.onOutputs(nodeId, outputs);
        runStore.append({ level: 'info', nodeId, message: `完成` });
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError') {
          setNodeData(nodeId, { status: 'idle', error: 'cancelled' });
          runStore.append({ level: 'warn', nodeId, message: `已取消` });
        } else {
          setNodeData(nodeId, { status: 'error', error: err.message });
          runStore.append({ level: 'error', nodeId, message: `失败: ${err.message}` });
          throw e;
        }
      }
    }));
  }
}

function resolvePortValue(
  sourceId: string, portId: string,
  edges: WorkflowEdge[], nodeMap: Map<string, WorkflowNode>,
): PortValue {
  const source = nodeMap.get(sourceId);
  if (!source?.data.outputs) return undefined;
  return source.data.outputs[portId] as PortValue | undefined;
}

function resolveAllUpstream(
  sourceId: string, portId: string,
  edges: WorkflowEdge[], nodeMap: Map<string, WorkflowNode>,
): PortValue[] {
  const source = nodeMap.get(sourceId);
  if (!source?.data.outputs) return [];
  const v = source.data.outputs[portId] as PortValue | undefined;
  return v === undefined ? [] : [v];
}

function collectVariablesForNode(
  nodeId: string,
  edges: WorkflowEdge[],
  nodeMap: Map<string, WorkflowNode>,
): Record<string, string> {
  // Strategy: for this node, look at any incoming edge whose source is a
  // variableInput. Pull its `value` (or default), keyed by `name`.
  const vars: Record<string, string> = {};
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = nodeMap.get(e.source);
    if (!src) continue;
    if (src.type === 'variableInput') {
      const name = (src.data.params.name as string) || '';
      const value = (src.data.params.value as string) ?? '';
      if (name) vars[name] = value;
    } else if (src.type === 'promptInput' && src.data.outputs) {
      // Also pick up any variables declared inside the prompt text (for hint
      // purposes; this allows ${name} to be set even without a VariableInput
      // if the user has filled them in via inlined ${...:-default}).
      const txt = (src.data.outputs.text as string) || '';
      for (const ref of findVarRefs(txt)) {
        if (!(ref in vars)) vars[ref] = ''; // undeclared, will use default
      }
    }
  }
  return vars;
}
