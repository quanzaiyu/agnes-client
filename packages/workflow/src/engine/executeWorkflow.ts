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
  targetNodeId: string, portId: string,
  edges: WorkflowEdge[], _nodeMap: Map<string, WorkflowNode>,
): PortValue {
  // Resolve from the live store so we see outputs written by upstream
  // resolvers (nodeMap is a stale snapshot taken at executeWorkflow entry).
  const liveNodes = useWorkflowStore.getState().nodes;
  for (const e of edges) {
    if (e.target !== targetNodeId) continue;
    if ((e.targetHandle || '') !== portId) continue;
    const src = liveNodes.find((n) => n.id === e.source);
    if (!src?.data.outputs) return undefined;
    return src.data.outputs[e.sourceHandle || ''] as PortValue | undefined;
  }
  return undefined;
}

function resolveAllUpstream(
  targetNodeId: string, portId: string,
  edges: WorkflowEdge[], _nodeMap: Map<string, WorkflowNode>,
): PortValue[] {
  // Live read from store (see resolvePortValue).
  const liveNodes = useWorkflowStore.getState().nodes;
  const out: PortValue[] = [];
  for (const e of edges) {
    if (e.target !== targetNodeId) continue;
    if ((e.targetHandle || '') !== portId) continue;
    const src = liveNodes.find((n) => n.id === e.source);
    if (!src?.data.outputs) continue;
    const v = src.data.outputs[e.sourceHandle || ''] as PortValue | undefined;
    if (v !== undefined) out.push(v);
  }
  return out;
}

function collectVariablesForNode(
  nodeId: string,
  edges: WorkflowEdge[],
  _nodeMap: Map<string, WorkflowNode>,
): Record<string, string> {
  // Use live store snapshot so we see variable node varPairs / upstream
  // outputs even if they were written by a previous layer.
  const liveNodes = useWorkflowStore.getState().nodes;
  const vars: Record<string, string> = {};
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = liveNodes.find((n) => n.id === e.source);
    if (!src) continue;
    const targetHandle = e.targetHandle || '';

    // 1) VariableInput: each pair's `value` becomes `vars[name]`
    if (src.type === 'variableInput') {
      const pairs = ((src.data as { varPairs?: Array<{ id: string; name: string; value: string }> }).varPairs) || [];
      const sourceHandle = e.sourceHandle || '';
      if (sourceHandle.startsWith('var:')) {
        const vid = sourceHandle.slice(4);
        const p = pairs.find((x) => x.id === vid);
        if (p?.name) vars[p.name] = p.value ?? '';
      } else {
        // Legacy single-pair fallback: edges from variableInput without sourceHandle
        // pull the first pair.
        if (pairs[0]?.name) vars[pairs[0].name] = pairs[0].value ?? '';
      }
    }

    // 2) PromptInput / TextInput with var:xxx ports (their upstream is VariableInput)
    //    is already handled above (source is variableInput). But we also need
    //    to *forward* a PromptInput's collected vars to its downstream consumers
    //    (so a TextInput that receives a var slot via PromptInput works).
    //    For now this is implicit because the PromptInput node's output
    //    `text` is already interpolated before reaching the consumer.

    // 3) Pre-register ${refs} from any upstream promptInput's raw text
    if (src.type === 'promptInput' && src.data.outputs) {
      const txt = (src.data.outputs.text as string) || '';
      for (const ref of findVarRefs(txt)) {
        if (!(ref in vars)) vars[ref] = '';
      }
    }
  }
  return vars;
}
