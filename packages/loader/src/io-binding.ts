/**
 * IO binding — injects external inputs into a workflow's node params/vars.
 *
 * Returns a deep-cloned `nodes` array with overrides applied, so the original
 * (which may live in the editor's zustand store) is untouched.
 */

import type { ApiInputSpec, ExportedWorkflow, WorkflowNodeLike } from './types';
import { findNode } from './util';

export function injectInputs(
  workflow: ExportedWorkflow,
  inputs: Record<string, unknown>,
): WorkflowNodeLike[] {
  if (!workflow.apiInputs?.length) {
    return workflow.nodes as WorkflowNodeLike[];
  }
  return (workflow.nodes as WorkflowNodeLike[]).map((n) => cloneWithOverrides(n, workflow.apiInputs!, inputs));
}

function cloneWithOverrides(
  node: WorkflowNodeLike,
  inputs: ApiInputSpec[],
  values: Record<string, unknown>,
): WorkflowNodeLike {
  // Deep clone to avoid mutating the original
  const cloned: WorkflowNodeLike = JSON.parse(JSON.stringify(node));
  for (const spec of inputs) {
    if (spec.target.nodeId !== node.id) continue;
    const value = values[spec.name] !== undefined ? values[spec.name] : spec.default;
    if (value === undefined) {
      if (spec.required) throw new Error(`缺少必填输入: ${spec.name}`);
      continue;
    }
    applyTarget(cloned, spec.target, value);
  }
  return cloned;
}

function applyTarget(node: WorkflowNodeLike, target: ApiInputSpec['target'], value: unknown): void {
  if (!node.data) node.data = {};
  if (!node.data.params) node.data.params = {};

  if (target.kind === 'param') {
    node.data.params[target.key!] = value;
    return;
  }

  if (target.kind === 'port') {
    // For port-based inputs, we stash into params under a reserved key so
    // resolvers (or the runner) can find it. The convention is:
    //   data.params['__apiIn__:<portId>']
    // For ports that already map to a "param" by convention (e.g. PromptInput
    // uses params.text), we prefer the direct param name.
    if (node.type === 'promptInput' && target.key === 'text') {
      node.data.params['text'] = value;
    } else if (node.type === 'textInput' && target.key === 'text') {
      node.data.params['value'] = value;
    } else if (node.type === 'sizeSelector' && target.key === 'size') {
      node.data.params['preset'] = value;
    } else if (node.type === 'numberInput' && target.key === 'number') {
      node.data.params['value'] = value;
    } else if (node.type === 'variableInput' && target.key === 'text') {
      // Top-level value of a single-pair variable
      node.data.params['value'] = value;
    } else {
      node.data.params[`__apiIn__:${target.key}`] = value;
    }
    return;
  }

  if (target.kind === 'varPair') {
    // VariableInput multi-pair
    if (node.type !== 'variableInput') {
      throw new Error(`varPair input only valid on variableInput node, got ${node.type}`);
    }
    const pairs = (node.data.varPairs as Array<{ id: string; name: string; value: string }> | undefined) || [];
    const idx = pairs.findIndex((p) => p.id === target.pairId);
    if (idx < 0) {
      throw new Error(`VariableInput ${node.id} has no pair ${target.pairId}`);
    }
    pairs[idx] = { ...pairs[idx], value: String(value ?? '') };
    node.data.varPairs = pairs;
  }
}
