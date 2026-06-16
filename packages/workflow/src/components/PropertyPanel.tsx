/**
 * Right-side panel: shows the selected node's parameters in a full form.
 * Mirrors the data shown inside the node, but with full-width controls.
 */

import { useWorkflowStore } from '../store/workflowStore';
import { getNodeMeta } from '../nodes';
import { renderParamInput } from './ParamInput';
import { TextPreview, ImagePreview, VideoPreview, extractImageUrl, extractVideoUrl } from './NodePreview';

export function PropertyPanel() {
  const selectedId = useWorkflowStore((s) => s.selectedNodeId);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === selectedId));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const edges = useWorkflowStore((s) => s.edges);

  if (!node) {
    return (
      <div className="p-4 text-xs text-gray-500">
        <p>选中一个节点以编辑参数。</p>
        <p className="mt-2">提示：从左侧面板拖入节点到画布，再用连线把节点连接起来。</p>
      </div>
    );
  }

  const meta = getNodeMeta(node.type || '');
  if (!meta) {
    return <div className="p-4 text-xs text-red-400">未知节点类型: {node.type}</div>;
  }
  const safeMeta = meta;

  const data = node.data || { params: {} };
  const incoming = edges.filter((e) => e.target === node.id);
  const hasIncoming = (portId: string) => incoming.some((e) => e.targetHandle === portId);

  return (
    <div className="p-3 space-y-3 text-xs overflow-auto h-full">
      <div>
        <div className="text-sm font-semibold text-gray-100">{meta.label}</div>
        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{node.type} • {node.id.slice(0, 8)}</div>
        {data.status && (
          <div className="text-[10px] mt-1">
            状态：<span className={
              data.status === 'success' ? 'text-green-400' :
              data.status === 'error' ? 'text-red-400' :
              data.status === 'running' ? 'text-yellow-400' : 'text-gray-400'
            }>{data.status}</span>
            {typeof data.progress === 'number' && data.progress < 100 && (
              <span className="ml-2 text-gray-400">{data.progress}%</span>
            )}
          </div>
        )}
        {data.error && <div className="mt-1 text-red-400 text-[11px] break-words">{data.error as string}</div>}
      </div>

      {meta.inputs.length > 0 && (
        <Section title="输入">
          {meta.inputs.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1">
              <span className="text-gray-300">
                {p.label || p.id}
                {p.required && <span className="text-red-400">*</span>}
              </span>
              <span className={hasIncoming(p.id) ? 'text-green-400' : 'text-gray-500'}>
                {hasIncoming(p.id) ? '已连接' : '未连接'}
              </span>
            </div>
          ))}
        </Section>
      )}

      {meta.outputs.length > 0 && (
        <Section title="输出">
          {meta.outputs.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1">
              <span className="text-gray-300">{p.label || p.id}</span>
              <span className="text-[10px] text-gray-500 font-mono">{p.type}</span>
            </div>
          ))}
          {data.outputs && (
            <div className="mt-2 space-y-2">
              {Object.entries(data.outputs).map(([k, v]) => {
                if (typeof v === 'string') return <div key={k} className="bg-surface-sunken p-2 rounded"><div className="text-[10px] text-gray-500 mb-1">{k}</div><TextPreview text={v} max={400} /></div>;
                if (v && typeof v === 'object' && 'url' in (v as Record<string, unknown>) && extractImageUrl(v as never)) {
                  return <div key={k} className="bg-surface-sunken p-2 rounded"><div className="text-[10px] text-gray-500 mb-1">{k}</div><ImagePreview value={v as never} maxHeight={200} /></div>;
                }
                if (v && typeof v === 'object' && 'url' in (v as Record<string, unknown>) && extractVideoUrl(v as never)) {
                  return <div key={k} className="bg-surface-sunken p-2 rounded"><div className="text-[10px] text-gray-500 mb-1">{k}</div><VideoPreview value={v as never} maxHeight={200} /></div>;
                }
                if (v && typeof v === 'object' && 'width' in (v as Record<string, unknown>)) {
                  return <div key={k} className="text-[11px] text-gray-400">{(v as { width: number; height: number }).width}×{(v as { width: number; height: number }).height}</div>;
                }
                return null;
              })}
            </div>
          )}
        </Section>
      )}

      {meta.params && Object.keys(meta.params).length > 0 && (
        <Section title="参数">
          {Object.entries(meta.params).map(([key, def]) => {
            const disabled = hasIncoming(key) || (key === 'model' && hasIncoming('model'));
            return (
              <div key={key} className="mb-2">
                <label className="block text-[11px] text-gray-400 mb-1">
                  {def.label || key}
                  {disabled && <span className="ml-1 text-green-400 text-[10px]">(已连接)</span>}
                </label>
                {renderParamInput({
                  paramKey: key,
                  def,
                  value: (data.params as Record<string, unknown>)?.[key],
                  onChange: (v) => updateParams(node.id, { [key]: v }),
                  disabled,
                })}
                {def.help && <div className="text-[10px] text-gray-500 mt-0.5">{def.help}</div>}
              </div>
            );
          })}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
