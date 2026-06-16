/**
 * Lightweight runtime validation for ExportedWorkflow. We don't pull in zod to
 * keep the loader dependency footprint small. Each validator throws a clear
 * error on invalid input.
 */

export interface ExportedWorkflow {
  version: number;
  name?: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  apiInputs?: ApiInputSpec[];
  apiOutputs?: ApiOutputSpec[];
}

export interface ApiTarget {
  nodeId: string;
  kind: 'param' | 'port' | 'varPair';
  key?: string;        // for param/port
  pairId?: string;     // for varPair
}

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

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isTarget(v: unknown): v is ApiTarget {
  if (!isObj(v)) return false;
  if (typeof v.nodeId !== 'string' || typeof v.kind !== 'string') return false;
  if (v.kind === 'param' || v.kind === 'port') return typeof v.key === 'string';
  if (v.kind === 'varPair') return typeof v.pairId === 'string';
  return false;
}

function isInput(v: unknown): v is ApiInputSpec {
  return isObj(v) && typeof v.name === 'string' && isTarget(v.target);
}
function isOutput(v: unknown): v is ApiOutputSpec {
  return isObj(v) && typeof v.name === 'string' && isTarget(v.source);
}

export function parseWorkflow(input: unknown): ExportedWorkflow {
  if (!isObj(input)) throw new Error('Workflow JSON must be an object');
  if (!Array.isArray(input.nodes)) throw new Error('Workflow.nodes must be an array');
  if (!Array.isArray(input.edges)) throw new Error('Workflow.edges must be an array');
  const wf: ExportedWorkflow = {
    version: typeof input.version === 'number' ? input.version : 1,
    name: typeof input.name === 'string' ? input.name : undefined,
    description: typeof input.description === 'string' ? input.description : undefined,
    nodes: input.nodes,
    edges: input.edges,
  };
  if (Array.isArray(input.apiInputs)) {
    wf.apiInputs = input.apiInputs.filter(isInput);
  }
  if (Array.isArray(input.apiOutputs)) {
    wf.apiOutputs = input.apiOutputs.filter(isOutput);
  }
  return wf;
}

export function loadWorkflow(source: string | object): ExportedWorkflow {
  const obj = typeof source === 'string' ? JSON.parse(source) : source;
  return parseWorkflow(obj);
}
