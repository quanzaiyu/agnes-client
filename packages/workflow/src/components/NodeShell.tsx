/**
 * NodeShell — the visual wrapper used by every node component.
 * Renders: title, status badge, port handles, optional preview body.
 *
 * Note: clicking inside the node body should not start dragging the node.
 * React Flow will only drag from the NodeWrapper root or a designated
 * dragHandle. We set dragHandle to the title bar by adding a CSS class
 * `.agnes-node-drag` to the title only, and let React Flow use that.
 */

import { memo, useState, type ReactNode } from 'react';
import { Handle, Position, useNodeId } from '@xyflow/react';
import type { NodeMeta, NodeStatus, Port } from '../engine/types';
import { useWorkflowStore } from '../store/workflowStore';
import { NamePrompt } from './NamePrompt';

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
  const apiInputs = useWorkflowStore((s) => s.apiInputs);
  const apiOutputs = useWorkflowStore((s) => s.apiOutputs);
  const addApiInput = useWorkflowStore((s) => s.addApiInput);
  const addApiOutput = useWorkflowStore((s) => s.addApiOutput);
  const removeApiInput = useWorkflowStore((s) => s.removeApiInput);
  const removeApiOutput = useWorkflowStore((s) => s.removeApiOutput);
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

  // API IO helpers
  type TargetKind = 'port' | 'param' | 'varPair';
  function matchesTarget(t: unknown, kind: TargetKind, key: string): boolean {
    if (!t || typeof t !== 'object') return false;
    const obj = t as { nodeId?: unknown; kind?: unknown; key?: unknown; pairId?: unknown };
    if (obj.nodeId !== id || obj.kind !== kind) return false;
    return kind === 'varPair' ? obj.pairId === key : obj.key === key;
  }
  const isInputMarked = (kind: TargetKind, key: string) =>
    apiInputs.some((i) => matchesTarget(i.target, kind, key));
  const getInputName = (kind: TargetKind, key: string) =>
    apiInputs.find((i) => matchesTarget(i.target, kind, key))?.name;
  const isOutputMarked = (kind: TargetKind, key: string) =>
    apiOutputs.some((o) => matchesTarget(o.source, kind, key));
  const getOutputName = (kind: TargetKind, key: string) =>
    apiOutputs.find((o) => matchesTarget(o.source, kind, key))?.name;

  // Name-prompt state
  const [prompting, setPrompting] = useState<{
    kind: 'input' | 'output';
    target:
      | { nodeId: string; kind: 'port'; key: string }
      | { nodeId: string; kind: 'param'; key: string }
      | { nodeId: string; kind: 'varPair'; pairId: string };
    defaultName: string;
    x: number; y: number;
  } | null>(null);
  const askInput = (kind: TargetKind, key: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const target =
      kind === 'varPair'
        ? { nodeId: id, kind: 'varPair' as const, pairId: key }
        : { nodeId: id, kind, key };
    setPrompting({ kind: 'input', target, defaultName: label, x: e.clientX, y: e.clientY });
  };
  const askOutput = (kind: TargetKind, key: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const target =
      kind === 'varPair'
        ? { nodeId: id, kind: 'varPair' as const, pairId: key }
        : { nodeId: id, kind, key };
    setPrompting({ kind: 'output', target, defaultName: label, x: e.clientX, y: e.clientY });
  };
  const submitPrompt = (name: string) => {
    if (!prompting || !name) { setPrompting(null); return; }
    if (prompting.kind === 'input') addApiInput({ name, target: prompting.target as never });
    else addApiOutput({ name, source: prompting.target as never });
    setPrompting(null);
  };

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
          {allInputs.map((p) => {
            const marked = isInputMarked('port', p.id);
            const markedName = getInputName('port', p.id);
            return (
              <div key={p.id} className="relative flex items-center min-h-[18px] nodrag">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={p.id}
                  className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                  style={{ top: '50%', left: -18, position: 'absolute', transform: 'translateY(-50%)' }}
                />
                <span className={`ml-3 text-[11px] ${marked ? 'text-amber-300 font-medium' : 'text-gray-300'}`}>
                  {p.label || p.id}
                  {p.required && <span className="text-red-400">*</span>}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  {marked && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">↥{markedName}</span>}
                  <button
                    className={`text-[10px] px-1 rounded hover:bg-surface-border ${marked ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
                    onClick={(e) => marked ? removeApiInput(markedName!) : askInput('port', p.id, p.label || p.id, e)}
                    title={marked ? '取消输入标记' : '标为 API 输入'}
                  >
                    {marked ? '×' : '↥'}
                  </button>
                </span>
              </div>
            );
          })}
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
          {allOutputs.map((p) => {
            const marked = isOutputMarked('port', p.id);
            const markedName = getOutputName('port', p.id);
            return (
              <div key={p.id} className="relative flex items-center min-h-[18px] nodrag">
                <Handle
                  type="source"
                  position={Position.Right}
                  id={p.id}
                  className={`!w-2.5 !h-2.5 ${PORT_COLOR[p.type]} !border-2 !border-surface-sunken`}
                  style={{ top: '50%', right: -18, position: 'absolute', transform: 'translateY(-50%)' }}
                />
                <span className="text-[10px] text-gray-500 font-mono absolute left-2">{p.type}</span>
                <span className={`ml-auto mr-3 text-[11px] text-right ${marked ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}>
                  {p.label || p.id}
                </span>
                <span className="flex items-center gap-1">
                  {marked && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">↧{markedName}</span>}
                  <button
                    className={`text-[10px] px-1 rounded hover:bg-surface-border ${marked ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'}`}
                    onClick={(e) => marked ? removeApiOutput(markedName!) : askOutput('port', p.id, p.label || p.id, e)}
                    title={marked ? '取消输出标记' : '标为 API 输出'}
                  >
                    {marked ? '×' : '↧'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {prompting && (
        <NamePrompt
          title={prompting.kind === 'input' ? '标为 API 输入' : '标为 API 输出'}
          defaultValue={prompting.defaultName}
          placeholder="参数名（英文/数字/下划线）"
          x={prompting.x}
          y={prompting.y}
          onSubmit={submitPrompt}
          onCancel={() => setPrompting(null)}
        />
      )}
    </div>
  );
});
