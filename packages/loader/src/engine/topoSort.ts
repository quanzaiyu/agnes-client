/**
 * Topological sort with layering (Kahn's algorithm).
 * Returns layers of node ids that can be executed in parallel within a layer.
 */

import type { WorkflowNodeLike, WorkflowEdgeLike } from '../types';

export function topoSort(nodes: WorkflowNodeLike[], edges: WorkflowEdgeLike[]): string[][] {
  const inMap = new Map<string, number>();
  const outMap = new Map<string, string[]>();
  for (const n of nodes) {
    inMap.set(n.id, 0);
    outMap.set(n.id, []);
  }
  for (const e of edges) {
    if (!inMap.has(e.source) || !inMap.has(e.target)) continue;
    inMap.set(e.target, (inMap.get(e.target) || 0) + 1);
    outMap.get(e.source)!.push(e.target);
  }
  const layers: string[][] = [];
  const remaining = new Set(nodes.map((n) => n.id));
  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const id of remaining) {
      if ((inMap.get(id) || 0) === 0) layer.push(id);
    }
    if (layer.length === 0) {
      throw new Error('Cycle detected in workflow graph');
    }
    layers.push(layer);
    for (const id of layer) {
      remaining.delete(id);
      for (const next of outMap.get(id) || []) {
        inMap.set(next, (inMap.get(next) || 0) - 1);
      }
    }
  }
  return layers;
}
