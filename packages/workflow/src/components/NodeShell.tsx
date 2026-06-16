/**
 * NodeShell — the visual wrapper used by every node component.
 * Renders: title, status badge, port handles, optional preview body.
 */

import { memo, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeMeta, NodeStatus, Port } from '../engine/types';
import { useWorkflowStore } from '../store/workflowStore';

interface NodeShellProps {
  meta: NodeMeta;
  selected?: boolean;
  data: { status?: NodeStatus; error?: string; progress?: number; streamText?: string; [k: string]: unknown };
  children?: ReactNode;
}

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

function NodeShellInner({ meta, selected, data, children }: NodeShellProps) {
  const status: NodeStatus = data.status || 'idle';
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  // We use props to get nodeId; NodeProps is on the wrapper
  return (
    <NodeShellImpl
      meta={meta}
      selected={selected}
      data={data}
      onDelete={removeNode}
      onSelect={selectNode}
    >
      {children}
    </NodeShellImpl>
  );
}

// Re-export a Props-driven version that has nodeId for handlers.
interface NodeShellImplProps extends NodeShellProps {
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

function NodeShellImpl({ meta, selected, data, onDelete, onSelect, children }: NodeShellImplProps) {
  // NodeProps injection is via React Flow context; we cannot easily get id here.
  // The actual delete/select buttons are wired by the wrapper component below.
  return (
    <div
      className={[
        'rounded-md border bg-surface-raised min-w-[220px] max-w-[320px] shadow-lg',
        'transition-all',
        selected ? 'border-primary-500' : 'border-surface-border',
        STATUS_RING[(data.status as NodeStatus) || 'idle'],
      ].join(' ')}
      onClick={() => { /* selection handled by React Flow */ }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 border-b border-surface-border bg-surface-sunken/60 rounded-t-md">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-200 truncate">
          {meta.icon && <span className={`${meta.icon} text-primary-400`} />}
          <span>{meta.label}</span>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[(data.status as NodeStatus) || 'idle']}`} />
        </div>
        <NodeDeleteButton onDelete={onDelete} />
      </div>

      {/* Input ports */}
      {meta.inputs.length > 0 && (
        <div className="px-3 py-1.5 border-b border-surface-border space-y-1.5">
          {meta.inputs.map((p) => (
            <div key={p.id} className="relative flex items-center min-h-[18px]">
              <Handle
                type="target"
                position={Position.Left}
                id={p.id}
                className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                style={{ top: 'auto', left: -18, position: 'absolute' }}
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

      {/* Body / preview */}
      {children && (
        <div className="px-3 py-2 text-xs text-gray-200 max-h-40 overflow-auto">
          {children}
        </div>
      )}

      {/* Progress bar (for video nodes) */}
      {typeof data.progress === 'number' && data.progress < 100 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-surface-sunken rounded overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${data.progress}%` }} />
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 text-right">{data.progress}%</div>
        </div>
      )}

      {/* Error */}
      {data.error && (
        <div className="px-3 pb-2 text-[11px] text-red-400 break-words">
          {data.error as string}
        </div>
      )}

      {/* Output ports */}
      {meta.outputs.length > 0 && (
        <div className="px-3 py-1.5 border-t border-surface-border space-y-1.5">
          {meta.outputs.map((p) => (
            <div key={p.id} className="relative flex items-center min-h-[18px]">
              <Handle
                type="source"
                position={Position.Right}
                id={p.id}
                className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                style={{ top: 'auto', right: -18, position: 'absolute' }}
              />
              <span className="mr-3 ml-auto text-[11px] text-gray-300 text-right">
                {p.label || p.id}
              </span>
              <span className="text-[10px] text-gray-500 font-mono absolute left-2">{p.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeDeleteButton({ onDelete }: { onDelete: (id: string) => void }) {
  // We can't easily get id here. Use a context-aware wrapper below.
  return null;
}

/**
 * NodeShell: the actual entry point used by node components.
 * It receives NodeProps from React Flow so it knows the id.
 */
export const NodeShell = memo(function NodeShell({ meta, children }: { meta: NodeMeta; children?: ReactNode }) {
  // Use React Flow context indirectly: we'll wrap as a regular component.
  // Implementation: NodeShellWithProps below is the real implementation.
  return <NodeShellWithProps meta={meta}>{children}</NodeShellWithProps>;
});

import { useNodeId } from '@xyflow/react';

function NodeShellWithProps({ meta, children }: { meta: NodeMeta; children?: ReactNode }) {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const data = (node?.data || { params: {} }) as { status?: NodeStatus; error?: string; progress?: number; streamText?: string };
  const selected = useWorkflowStore((s) => s.selectedNodeId === id);

  return (
    <div
      className={[
        'rounded-md border bg-surface-raised min-w-[220px] max-w-[320px] shadow-lg',
        'transition-all',
        selected ? 'border-primary-500' : 'border-surface-border',
        STATUS_RING[data.status || 'idle'],
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 border-b border-surface-border bg-surface-sunken/60 rounded-t-md">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-200 truncate">
          {meta.icon && <span className={meta.icon} />}
          <span>{meta.label}</span>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[data.status || 'idle']}`} />
        </div>
        <button
          className="text-gray-500 hover:text-red-400 text-xs px-1"
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          title="删除节点"
        >
          ×
        </button>
      </div>

      {meta.inputs.length > 0 && (
        <div className="px-3 py-1.5 border-b border-surface-border space-y-1.5">
          {meta.inputs.map((p) => (
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
        <div className="px-3 py-2 text-xs text-gray-200 max-h-48 overflow-auto">
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

      {meta.outputs.length > 0 && (
        <div className="px-3 py-1.5 border-t border-surface-border space-y-1.5">
          {meta.outputs.map((p) => (
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
}
