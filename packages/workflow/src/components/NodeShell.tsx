/**
 * NodeShell — the visual wrapper used by every node component.
 * Renders: title, status badge, port handles, optional preview body.
 *
 * Note: clicking inside the node body should not start dragging the node.
 * React Flow will only drag from the NodeWrapper root or a designated
 * dragHandle. We set dragHandle to the title bar by adding a CSS class
 * `.agnes-node-drag` to the title only, and let React Flow use that.
 */

import { memo, type ReactNode } from 'react';
import { Handle, Position, useNodeId } from '@xyflow/react';
import type { NodeMeta, NodeStatus, Port } from '../engine/types';
import { useWorkflowStore } from '../store/workflowStore';

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: 'bg-gray-500',
  running: 'bg-yellow-400 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

const STATUS_RING: Record<NodeStatus, string> = {
  idle: '',
  running: 'ring-2 ring-yellow-500/60',
  success: 'ring-2 ring-green-500/40',
  error: 'ring-2 ring-red-500/60',
};

const PORT_COLOR: Record<Port['type'], string> = {
  text: '!bg-emerald-500',
  image: '!bg-pink-500',
  video: '!bg-violet-500',
  number: '!bg-amber-500',
  size: '!bg-cyan-500',
  any: '!bg-gray-400',
};

export const NodeShell = memo(function NodeShell({ meta, children }: { meta: NodeMeta; children?: ReactNode }) {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const data = (node?.data || { params: {} }) as {
    status?: NodeStatus; error?: string; progress?: number; streamText?: string;
    varInputs?: Array<{ id: string; name: string }>;
    varPairs?: Array<{ id: string; name: string; value: string }>;
  };
  const selected = useWorkflowStore((s) => s.selectedNodeId === id);
  // Dynamic variable input ports (added via right-click → "添加变量输入")
  const varInputs = data.varInputs || [];
  const allInputs: Port[] = [
    ...meta.inputs,
    ...varInputs.map((v) => ({ id: `var:${v.id}`, type: 'text' as const, label: `$${v.name}` })),
  ];
  // Dynamic output ports (for VariableInput: one per varPair, id=`var:<id>`)
  const varPairs = data.varPairs || [];
  const allOutputs: Port[] = [
    ...meta.outputs,
    ...varPairs.map((p) => ({ id: `var:${p.id}`, type: 'text' as const, label: `$${p.name}` })),
  ];

  return (
    <div
      className={[
        'rounded-md border bg-surface-raised min-w-[220px] max-w-[320px] shadow-lg',
        'transition-all',
        selected ? 'border-primary-500' : 'border-surface-border',
        STATUS_RING[data.status || 'idle'],
      ].join(' ')}
      onContextMenu={(e) => {
        // Allow node to define a custom context menu via window event
        // (see useNodeContextMenu hook). We dispatch a custom event carrying
        // the node id, position, and meta. If a handler captures it, the
        // browser default menu is suppressed.
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('agnes:nodecontext', {
          detail: { nodeId: id, type: node?.type, x: e.clientX, y: e.clientY, meta },
        }));
      }}
    >
      <div className="agnes-node-drag flex items-center justify-between gap-1.5 px-2 py-1.5 border-b border-surface-border bg-surface-sunken/60 rounded-t-md cursor-move">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-200 truncate">
          {meta.icon && <span className={meta.icon} />}
          <span>{meta.label}</span>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[data.status || 'idle']}`} />
        </div>
        <button
          className="text-gray-500 hover:text-red-400 text-xs px-1 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          title="删除节点"
        >
          ×
        </button>
      </div>

      {allInputs.length > 0 && (
        <div className="px-3 py-1.5 border-b border-surface-border space-y-1.5">
          {allInputs.map((p) => (
            <div key={p.id} className="relative flex items-center min-h-[18px]">
              <Handle
                type="target"
                position={Position.Left}
                id={p.id}
                className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                style={{ top: '50%', left: -18, position: 'absolute', transform: 'translateY(-50%)' }}
              />
              <span className="ml-3 text-[11px] text-gray-300">
                {p.label || p.id}
                {p.required && <span className="text-red-400">*</span>}
              </span>
              <span className="ml-auto text-[10px] text-gray-500 font-mono">{p.type}</span>
            </div>
          ))}
        </div>
      )}

      {children && (
        <div className="px-3 py-2 text-xs text-gray-200 max-h-48 overflow-auto nodrag">
          {children}
        </div>
      )}

      {typeof data.progress === 'number' && data.progress < 100 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-surface-sunken rounded overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${data.progress}%` }} />
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 text-right">{data.progress}%</div>
        </div>
      )}

      {data.error && (
        <div className="px-3 pb-2 text-[11px] text-red-400 break-words">
          {data.error as string}
        </div>
      )}

      {allOutputs.length > 0 && (
        <div className="px-3 py-1.5 border-t border-surface-border space-y-1.5">
          {allOutputs.map((p) => (
            <div key={p.id} className="relative flex items-center min-h-[18px]">
              <Handle
                type="source"
                position={Position.Right}
                id={p.id}
                className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                style={{ top: '50%', right: -18, position: 'absolute', transform: 'translateY(-50%)' }}
              />
              <span className="ml-auto mr-3 text-[11px] text-gray-300 text-right">
                {p.label || p.id}
              </span>
              <span className="text-[10px] text-gray-500 font-mono absolute left-2">{p.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
