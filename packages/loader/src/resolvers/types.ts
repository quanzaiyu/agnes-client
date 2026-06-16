/**
 * Type definitions for the workflow editor.
 * These mirror React Flow's node/edge data shape, with extensions for our
 * port-based type system and per-node parameters.
 */

import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';

export type PortType = 'text' | 'image' | 'video' | 'number' | 'size' | 'any';

export interface Port {
  id: string;
  type: PortType;
  label?: string;
  required?: boolean;
}

export type ParamKind =
  | 'string'
  | 'text'
  | 'multiline'
  | 'number'
  | 'boolean'
  | 'select'
  | 'model'
  | 'size'
  | 'enum';

export interface ParamDef {
  kind: ParamKind;
  default?: unknown;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string | number }>;
  placeholder?: string;
  help?: string;
}

export interface NodeMeta {
  type: string;
  label: string;
  category: 'input' | 'generation' | 'output' | 'utility';
  icon?: string;
  inputs: Port[];
  outputs: Port[];
  params?: Record<string, ParamDef>;
}

export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeData {
  params: Record<string, unknown>;
  status?: NodeStatus;
  error?: string;
  progress?: number; // 0..100, for video generation
  outputs?: Record<string, unknown>;
  /** live streaming text (text generation only) */
  streamText?: string;
  [key: string]: unknown;
}

export type WorkflowNode = RFNode<NodeData>;
export type WorkflowEdge = RFEdge;

/** Values flowing through ports. */
export type PortValue =
  | string
  | number
  | { url: string; source?: string; dataUri?: string } // image/video
  | { url: string; meta?: Record<string, unknown> }   // video
  | { width: number; height: number }                  // size
  | null
  | undefined;

export interface ResolverContext {
  /** API key (may be empty string if not configured) */
  apiKey: string;
  /** base URL with no trailing slash */
  baseUrl: string;
  /** Signal for cancellation */
  signal: AbortSignal;
  /** Report progress 0..100 for the current node */
  onProgress: (pct: number) => void;
  /** Update streaming text (for text gen nodes) */
  onStream: (delta: string) => void;
  /** Resolve port value by reading the upstream node's output. */
  resolvePort: (nodeId: string, portId: string) => PortValue;
  /** Resolve all upstream values for a port (fan-in) as array */
  resolveAll: (nodeId: string, portId: string) => PortValue[];
  /** Interpolate ${var} in text using collected variables from PromptInput nodes. */
  interpolate: (text: string) => string;
  /** Variables collected from PromptInput node fan-ins (name -> value). */
  variables: Record<string, string>;
}

export type Resolver = (
  node: WorkflowNode,
  ctx: ResolverContext,
) => Promise<Record<string, PortValue>>;

// ─── API export metadata ──────────────────────────────────────────────────────

/**
 * A "thing" inside the workflow that can be bound to an external input or
 * surfaced as an external output.
 *
 *   - param:  a node's data.params[key]
 *   - port:   a node's data.outputs[portId] (or data.params['__apiIn__:<portId>']
 *             for inputs on a target port that doesn't have a data field)
 *   - varPair: a specific row inside a VariableInput's data.varPairs array
 */
export type ApiTarget =
  | { nodeId: string; kind: 'param'; key: string }
  | { nodeId: string; kind: 'port'; key: string }
  | { nodeId: string; kind: 'varPair'; pairId: string };

export interface ApiInputSpec {
  name: string;
  label?: string;
  description?: string;
  target: ApiTarget;
  default?: unknown;
  required?: boolean;
}

export interface ApiOutputSpec {
  name: string;
  label?: string;
  source: ApiTarget;
}

export interface ExportedWorkflow {
  version: 2;
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  apiInputs?: ApiInputSpec[];
  apiOutputs?: ApiOutputSpec[];
}
