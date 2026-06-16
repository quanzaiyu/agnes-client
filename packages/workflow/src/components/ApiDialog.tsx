/**
 * Modal dialog for "API export" — name the workflow, view/edit apiInputs &
 * apiOutputs, copy JSON, download .flow.json, optionally start an HTTP server.
 */

import { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { getNodeMeta } from '../nodes';
import type { ApiTarget } from '../engine/types';

interface Props {
  onClose: () => void;
}

export function ApiDialog({ onClose }: Props) {
  const name = useWorkflowStore((s) => s.name);
  const description = useWorkflowStore((s) => s.description);
  const setMeta = useWorkflowStore((s) => s.setMeta);
  const apiInputs = useWorkflowStore((s) => s.apiInputs);
  const apiOutputs = useWorkflowStore((s) => s.apiOutputs);
  const removeApiInput = useWorkflowStore((s) => s.removeApiInput);
  const removeApiOutput = useWorkflowStore((s) => s.removeApiOutput);
  const exportJson = useWorkflowStore((s) => s.exportJson);
  const nodes = useWorkflowStore((s) => s.nodes);

  const [serverStatus, setServerStatus] = useState<string>('');
  const [copyOk, setCopyOk] = useState(false);

  // Compute display labels for each IO entry
  function describeTarget(t: ApiTarget): string {
    const n = nodes.find((x) => x.id === t.nodeId);
    if (!n) return `<未知节点 ${t.nodeId}>`;
    const meta = getNodeMeta(n.type || '');
    const typeLabel = meta?.label || n.type;
    if (t.kind === 'param') {
      const pdef = meta?.params?.[t.key];
      return `${typeLabel} → 参数 ${pdef?.label || t.key}`;
    }
    if (t.kind === 'port') {
      const allPorts = [...(meta?.inputs || []), ...(meta?.outputs || [])];
      const p = allPorts.find((pp) => pp.id === t.key);
      return `${typeLabel} → 端口 ${p?.label || t.key}`;
    }
    // varPair
    const pairs = (n.data as { varPairs?: Array<{ id: string; name: string }> }).varPairs || [];
    const p = pairs.find((p) => p.id === t.pairId);
    return `${typeLabel} → 变量 $${p?.name || t.pairId}`;
  }

  const jsonPreview = useMemo(() => exportJson(), [exportJson, name, description, apiInputs, apiOutputs, nodes]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      // Fallback: select the textarea content
      const ta = document.getElementById('api-json-preview') as HTMLTextAreaElement | null;
      if (ta) { ta.select(); document.execCommand('copy'); setCopyOk(true); setTimeout(() => setCopyOk(false), 2000); }
    }
  };

  const onDownload = () => {
    const blob = new Blob([jsonPreview], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'workflow').replace(/[^\w-]/g, '_')}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onStartServer = async () => {
    setServerStatus('启动中…');
    try {
      // The actual server is started by the standalone CLI in packages/loader.
      // From the editor we just copy a launcher command.
      const cmd = `npx tsx packages/loader/src/cli.ts serve --workflow "${(name || 'workflow').replace(/[^\w-]/g, '_')}.flow.json" --port 4500`;
      await navigator.clipboard.writeText(cmd);
      setServerStatus('已复制启动命令到剪贴板，请到终端执行');
    } catch {
      setServerStatus('无法复制，请手动在终端执行 npx tsx packages/loader/src/cli.ts serve');
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="panel w-[640px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
          <h3 className="text-sm font-semibold">API 导出</h3>
          <button className="text-gray-500 hover:text-white" onClick={onClose}>×</button>
        </div>
        <div className="p-3 space-y-3 overflow-auto">
          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400">API 名称</label>
            <input
              className="input-base w-full"
              value={name}
              onChange={(e) => setMeta({ name: e.target.value })}
              placeholder="txt2img"
            />
            <label className="text-[11px] text-gray-400">说明（可选）</label>
            <textarea
              className="input-base w-full min-h-[50px] text-[11px]"
              value={description}
              onChange={(e) => setMeta({ description: e.target.value })}
              placeholder="简短描述这个 API 的用途"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] text-gray-400">输入（{apiInputs.length}）</div>
            </div>
            <div className="border border-surface-border rounded divide-y divide-surface-border">
              {apiInputs.length === 0 && <div className="p-2 text-[11px] text-gray-500 italic">未标输入。在节点端口/参数旁点 ↥ 按钮添加。</div>}
              {apiInputs.map((i) => (
                <IoRow key={i.name} name={i.name} desc={describeTarget(i.target)} onRemove={() => removeApiInput(i.name)} kind="input" />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] text-gray-400">输出（{apiOutputs.length}）</div>
            </div>
            <div className="border border-surface-border rounded divide-y divide-surface-border">
              {apiOutputs.length === 0 && <div className="p-2 text-[11px] text-gray-500 italic">未标输出。在节点端口旁点 ↧ 按钮添加。</div>}
              {apiOutputs.map((o) => (
                <IoRow key={o.name} name={o.name} desc={describeTarget(o.source)} onRemove={() => removeApiOutput(o.name)} kind="output" />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-400 mb-1">JSON 预览</div>
            <textarea
              id="api-json-preview"
              className="input-base w-full font-mono text-[10px] h-40 resize-y"
              readOnly
              value={jsonPreview}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>

          {serverStatus && <div className="text-[11px] text-emerald-400">{serverStatus}</div>}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-border">
          <button className="btn-primary" onClick={onCopy}>{copyOk ? '✓ 已复制' : '复制 JSON'}</button>
          <button className="btn-ghost" onClick={onDownload}>下载 .flow.json</button>
          <button className="btn-ghost" onClick={onStartServer}>启动 HTTP 服务</button>
          <div className="flex-1" />
          <button className="btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

function IoRow({ name, desc, onRemove, kind }: { name: string; desc: string; onRemove: () => void; kind: 'input' | 'output' }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-surface-border/30">
      <span className={kind === 'input' ? 'text-amber-400' : 'text-emerald-400'}>{kind === 'input' ? '↥' : '↧'}</span>
      <span className="font-mono font-medium text-gray-200">{name}</span>
      <span className="text-gray-500 truncate flex-1" title={desc}>{desc}</span>
      <button className="text-gray-500 hover:text-red-400 px-1" onClick={onRemove} title="移除">×</button>
    </div>
  );
}
