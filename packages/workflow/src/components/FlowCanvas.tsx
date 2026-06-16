/**
 * React Flow canvas wrapper. Handles drag-from-panel + connect + context menu.
 *
 * dragHandle is set to `.agnes-node-drag` so the node body (which contains
 * textareas/inputs) does NOT start dragging. Right-click on a node opens a
 * context menu (NodeContextMenu) for actions like "add variable input".
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnSelectionChangeFunc,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import { useWorkflowStore, nodeTypes } from '../store/workflowStore';
import type { WorkflowNode, WorkflowEdge, NodeMeta } from '../engine/types';
import { NodeContextMenu } from './NodeContextMenu';

export function FlowCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const [contextMenu, setContextMenu] = useState<{
    nodeId: string; x: number; y: number; type: string;
  } | null>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/agnes-node');
      if (!type || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const position = { x: e.clientX - rect.left - 80, y: e.clientY - rect.top - 20 };
      addNode(type, position);
    },
    [addNode],
  );

  const onSelection: OnSelectionChangeFunc = useCallback(
    ({ nodes: sel }) => {
      selectNode(sel[0]?.id ?? null);
    },
    [selectNode],
  );

  // React Flow's onNodeContextMenu is more reliable than DOM events on
  // child elements. Use it to open our custom menu.
  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY, type: node.type || '' });
  }, []);

  // Close menu on outside click / Escape / scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  return (
    <div ref={containerRef} className="flex-1 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes as WorkflowNode[]}
        edges={edges as WorkflowEdge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelection}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => { selectNode(null); setContextMenu(null); }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d2d44" />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.4)"
          nodeColor={(n) => {
            const status = (n.data as { status?: string })?.status;
            if (status === 'success') return '#10b981';
            if (status === 'error') return '#ef4444';
            if (status === 'running') return '#f59e0b';
            return '#7c3aed';
          }}
        />
      </ReactFlow>
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.type as NodeMeta['type'] | ''}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
