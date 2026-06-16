/**
 * Type aliases shared by the loader. We re-declare node/edge data shapes here
 * instead of importing from @agnes/workflow (which has React/JSX deps) so the
 * loader stays a pure Node module.
 */

import type { ApiInputSpec, ApiOutputSpec, ExportedWorkflow } from './schemas';

export type { ApiInputSpec, ApiOutputSpec, ExportedWorkflow };

export interface WorkflowNodeLike {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data?: {
    params?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    status?: string;
    error?: string;
    streamText?: string;
    varPairs?: Array<{ id: string; name: string; value: string }>;
    varInputs?: Array<{ id: string; name: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorkflowEdgeLike {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  [key: string]: unknown;
}
