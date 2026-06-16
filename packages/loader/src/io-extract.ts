/**
 * IO extraction — collects outputs from executed nodes by spec.
 */

import type { ApiOutputSpec, ExportedWorkflow, WorkflowNodeLike } from './types';

export function extractOutputs(
  workflow: ExportedWorkflow,
  nodes: WorkflowNodeLike[],
): Record<string, unknown> {
  if (!workflow.apiOutputs?.length) return {};
  const out: Record<string, unknown> = {};
  for (const spec of workflow.apiOutputs) {
    const node = nodes.find((n) => n.id === spec.source.nodeId);
    if (!node?.data?.outputs) continue;
    const outputs = node.data.outputs as Record<string, unknown>;
    if (spec.source.kind === 'port') {
      out[spec.name] = outputs[spec.source.key!];
    } else if (spec.source.kind === 'param') {
      out[spec.name] = node.data.params?.[spec.source.key!];
    } else if (spec.source.kind === 'varPair') {
      const pairs = (node.data.varPairs as Array<{ id: string; name: string; value: string }> | undefined) || [];
      out[spec.name] = pairs.find((p) => p.id === spec.source.pairId)?.value;
    }
  }
  return out;
}
