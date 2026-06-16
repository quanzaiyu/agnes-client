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
import type { WorkflowNode, WorkflowEdge, NodeData } from '../engine/types';
import { newId } from '../lib/id';
import { nodeTypes, getNodeMeta } from '../nodes';

const STORAGE_KEY = 'agnes.workflow.current';

interface PersistShape {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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
        data: { params: n.data.params || {} },
      })),
      edges: state.edges,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch { /* quota or unavailable */ }
}

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
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
}

const initial = loadFromStorage() ?? { nodes: [], edges: [] };

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  selectedNodeId: null,

  setNodes: (updater) => set((s) => ({ nodes: updater(s.nodes) })),
  setEdges: (updater) => set((s) => ({ edges: updater(s.edges) })),

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as WorkflowNode[] }));
    // Persist after change set
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) as WorkflowEdge[] }));
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
  },

  onConnect: (connection) => {
    set((s) => ({
      edges: addEdge({ ...connection, id: newId('e'), animated: false }, s.edges) as WorkflowEdge[],
    }));
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
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
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }));
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
  },

  updateNodeParams: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } } : n)),
    }));
    queueMicrotask(() => saveToStorage({ nodes: get().nodes, edges: get().edges }));
  },

  setNodeData: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  clear: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },

  loadGraph: (graph) => {
    set({ nodes: graph.nodes, edges: graph.edges, selectedNodeId: null });
    saveToStorage(graph);
  },

  exportJson: () => {
    const { nodes, edges } = get();
    return JSON.stringify({ version: 1, nodes, edges }, null, 2);
  },

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('Invalid workflow JSON');
      get().loadGraph({ nodes: parsed.nodes, edges: parsed.edges });
    } catch (e) {
      throw new Error(`Failed to import: ${(e as Error).message}`);
    }
  },
}));

// Re-export the type registry for convenience
export { nodeTypes };
