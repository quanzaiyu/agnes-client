import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge, NodeData, ApiInputSpec, ApiOutputSpec } from '../engine/types';
import { newId } from '../lib/id';
import { nodeTypes, getNodeMeta } from '../nodes';

const STORAGE_KEY = 'agnes.workflow.current';

interface PersistShape {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  apiInputs?: ApiInputSpec[];
  apiOutputs?: ApiOutputSpec[];
  name?: string;
  description?: string;
}

function loadFromStorage(): PersistShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(state: PersistShape) {
  try {
    // Strip non-serializable fields (outputs, streamText, error, status, progress)
    const sanitized: PersistShape = {
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { params: n.data.params || {}, varPairs: n.data.varPairs, varInputs: n.data.varInputs },
      })),
      edges: state.edges,
      apiInputs: state.apiInputs || [],
      apiOutputs: state.apiOutputs || [],
      name: state.name,
      description: state.description,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch { /* quota or unavailable */ }
}

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  apiInputs: ApiInputSpec[];
  apiOutputs: ApiOutputSpec[];
  name: string;
  description: string;
  setNodes: (updater: (nodes: WorkflowNode[]) => WorkflowNode[]) => void;
  setEdges: (updater: (edges: WorkflowEdge[]) => WorkflowEdge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeParams: (id: string, patch: Record<string, unknown>) => void;
  setNodeData: (id: string, patch: Partial<NodeData>) => void;
  selectNode: (id: string | null) => void;
  clear: () => void;
  loadGraph: (graph: PersistShape) => void;
  exportJson: () => string;
  importJson: (json: string) => void;
  addApiInput: (spec: ApiInputSpec) => void;
  removeApiInput: (name: string) => void;
  addApiOutput: (spec: ApiOutputSpec) => void;
  removeApiOutput: (name: string) => void;
  setMeta: (patch: { name?: string; description?: string }) => void;
}

const initial = loadFromStorage() ?? { nodes: [], edges: [] };

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  apiInputs: initial.apiInputs || [],
  apiOutputs: initial.apiOutputs || [],
  name: initial.name || '未命名工作流',
  description: initial.description || '',
  selectedNodeId: null,

  setNodes: (updater) => set((s) => ({ nodes: updater(s.nodes) })),
  setEdges: (updater) => set((s) => ({ edges: updater(s.edges) })),

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as WorkflowNode[] }));
    // Persist after change set
    queueMicrotask(() => persist(get()));
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) as WorkflowEdge[] }));
    queueMicrotask(() => persist(get()));
  },

  onConnect: (connection) => {
    set((s) => ({
      edges: addEdge({ ...connection, id: newId('e'), animated: false }, s.edges) as WorkflowEdge[],
    }));
    queueMicrotask(() => persist(get()));
  },

  addNode: (type, position) => {
    const meta = getNodeMeta(type);
    if (!meta) return;
    const id = newId('n');
    const params: Record<string, unknown> = {};
    if (meta.params) {
      for (const [k, def] of Object.entries(meta.params)) {
        if (def.default !== undefined) params[k] = def.default;
      }
    }
    const node: WorkflowNode = {
      id,
      type,
      position,
      data: { params, status: 'idle' },
      // Only the title bar (with this class) is draggable. This lets us
      // embed textareas/inputs in the body without them starting a drag.
      dragHandle: '.agnes-node-drag',
    };
    set((s) => ({ nodes: [...s.nodes, node] }));
    queueMicrotask(() => persist(get()));
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      // Drop any IO bindings that referenced the removed node
      apiInputs: s.apiInputs.filter((i) => i.target.nodeId !== id),
      apiOutputs: s.apiOutputs.filter((o) => o.source.nodeId !== id),
    }));
    queueMicrotask(() => persist(get()));
  },

  updateNodeParams: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } } : n)),
    }));
    queueMicrotask(() => persist(get()));
  },

  setNodeData: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  clear: () => {
    set({ nodes: [], edges: [], selectedNodeId: null, apiInputs: [], apiOutputs: [] });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },

  loadGraph: (graph) => {
    set({
      nodes: graph.nodes,
      edges: graph.edges,
      apiInputs: graph.apiInputs || [],
      apiOutputs: graph.apiOutputs || [],
      name: graph.name || '未命名工作流',
      description: graph.description || '',
      selectedNodeId: null,
    });
    persist(get());
  },

  exportJson: () => {
    const { nodes, edges, apiInputs, apiOutputs, name, description } = get();
    return JSON.stringify({
      version: 2,
      name,
      description,
      nodes,
      edges,
      apiInputs,
      apiOutputs,
    }, null, 2);
  },

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('Invalid workflow JSON');
      get().loadGraph({
        nodes: parsed.nodes,
        edges: parsed.edges,
        apiInputs: parsed.apiInputs || [],
        apiOutputs: parsed.apiOutputs || [],
        name: parsed.name,
        description: parsed.description,
      });
    } catch (e) {
      throw new Error(`Failed to import: ${(e as Error).message}`);
    }
  },

  addApiInput: (spec) => {
    set((s) => {
      const filtered = s.apiInputs.filter((i) => i.name !== spec.name);
      return { apiInputs: [...filtered, spec] };
    });
    queueMicrotask(() => persist(get()));
  },
  removeApiInput: (name) => {
    set((s) => ({ apiInputs: s.apiInputs.filter((i) => i.name !== name) }));
    queueMicrotask(() => persist(get()));
  },
  addApiOutput: (spec) => {
    set((s) => {
      const filtered = s.apiOutputs.filter((o) => o.name !== spec.name);
      return { apiOutputs: [...filtered, spec] };
    });
    queueMicrotask(() => persist(get()));
  },
  removeApiOutput: (name) => {
    set((s) => ({ apiOutputs: s.apiOutputs.filter((o) => o.name !== name) }));
    queueMicrotask(() => persist(get()));
  },
  setMeta: (patch) => {
    set((s) => ({ name: patch.name ?? s.name, description: patch.description ?? s.description }));
    queueMicrotask(() => persist(get()));
  },
}));

/** Persist the full workflow state to localStorage. */
function persist(state: WorkflowState) {
  saveToStorage({
    nodes: state.nodes,
    edges: state.edges,
    apiInputs: state.apiInputs,
    apiOutputs: state.apiOutputs,
    name: state.name,
    description: state.description,
  });
}

// Re-export the type registry for convenience
export { nodeTypes };
