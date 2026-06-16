/**
 * Top toolbar: Run / Stop / Save / Load / Examples / API settings / Export / Import.
 */

import { useRef, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useRunStore } from '../store/runStore';
import { executeWorkflow } from '../engine/executeWorkflow';
import { examples } from '../workflows/examples';
import { SettingsDrawer } from './SettingsDrawer';
import { ApiDialog } from './ApiDialog';

export function Toolbar() {
  const runStore = useRunStore();
  const exportJson = useWorkflowStore((s) => s.exportJson);
  const importJson = useWorkflowStore((s) => s.importJson);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const clear = useWorkflowStore((s) => s.clear);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showApi, setShowApi] = useState(false);

  const isRunning = runStore.state === 'running';

  const onRun = async () => {
    const { nodes, edges } = useWorkflowStore.getState();
    if (nodes.length === 0) {
      alert('画布上没有节点');
      return;
    }
    const ac = runStore.start();
    try {
      await executeWorkflow({
        nodes, edges, signal: ac.signal,
        onProgress: () => {},
        onStream: () => {},
        onOutputs: () => {},
      });
      runStore.finalize('success');
    } catch (e) {
      if ((e as Error).name === 'AbortError') runStore.finalize('aborted');
      else runStore.finalize('error');
    }
  };

  const onStop = () => {
    runStore.abort();
  };

  const onExport = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = () => fileRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      importJson(text);
    } catch (err) {
      alert(`导入失败: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="h-12 flex items-center gap-1 px-3 border-b border-surface-border bg-surface-raised select-none">
      <span className="text-sm font-semibold text-primary-400 mr-3">⚡ Agnes Flow</span>

      {!isRunning ? (
        <button className="btn-primary" onClick={onRun}>▶ 运行</button>
      ) : (
        <button className="btn bg-red-600 text-white hover:bg-red-500" onClick={onStop}>■ 停止</button>
      )}

      <span className={`ml-2 text-[11px] ${runStore.state === 'running' ? 'text-yellow-400' : runStore.state === 'success' ? 'text-green-400' : runStore.state === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
        {runStore.state}
        {runStore.startedAt && runStore.finishedAt && ` (${((runStore.finishedAt - runStore.startedAt) / 1000).toFixed(1)}s)`}
      </span>

      <div className="w-px h-6 bg-surface-border mx-2" />

      <div className="relative">
        <button className="btn-ghost" onClick={() => setShowExamples((v) => !v)}>示例 ▾</button>
        {showExamples && (
          <div className="absolute top-full mt-1 left-0 panel z-50 min-w-[200px] py-1">
            {examples.map((ex) => (
              <button
                key={ex.id}
                className="block w-full text-left px-3 py-1.5 hover:bg-surface-border"
                onClick={() => { loadGraph({ nodes: ex.nodes, edges: ex.edges }); setShowExamples(false); }}
              >
                <div className="font-medium">{ex.name}</div>
                <div className="text-[10px] text-gray-500">{ex.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn-ghost" onClick={onExport}>↗ 导出 JSON</button>
      <button className="btn-ghost" onClick={onImport}>↙ 导入 JSON</button>
      <input ref={fileRef} type="file" accept=".json" hidden onChange={onFileChosen} />

      <button className="btn-ghost" onClick={clear}>清空</button>

      <div className="flex-1" />

      <button className="btn-ghost" onClick={() => setShowApi(true)} title="将工作流导出为可调用 API">⚡ API 导出</button>
      <button className="btn-ghost" onClick={() => setShowSettings(true)}>⚙ API 设置</button>

      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
      {showApi && <ApiDialog onClose={() => setShowApi(false)} />}
    </div>
  );
}
