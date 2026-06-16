/**
 * React Flow canvas wrapper. Handles drag-from-panel + connect logic.
 */

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnSelectionChangeFunc,
  BackgroundVariant,
} from '@xyflow/react';
import { useWorkflowStore, nodeTypes } from '../store/workflowStore';
import type { WorkflowNode, WorkflowEdge } from '../engine/types';

export function FlowCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

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
        onPaneClick={() => selectNode(null)}
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
    </div>
  );
}
