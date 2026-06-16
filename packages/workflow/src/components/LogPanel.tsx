import { useRunStore } from '../store/runStore';
import { useState } from 'react';

export function LogPanel() {
  const { log, clear } = useRunStore();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        className="h-6 px-3 text-[10px] text-gray-500 hover:text-gray-200 border-t border-surface-border bg-surface-raised w-full text-left"
        onClick={() => setCollapsed(false)}
      >
        ▴ 日志 ({log.length})
      </button>
    );
  }

  return (
    <div className="border-t border-surface-border bg-surface-sunken text-[10px] font-mono h-40 flex flex-col">
      <div className="flex items-center justify-between px-2 py-1 border-b border-surface-border bg-surface-raised">
        <span className="text-gray-400">日志 ({log.length})</span>
        <div className="flex gap-2">
          <button className="text-gray-500 hover:text-gray-200" onClick={clear}>清空</button>
          <button className="text-gray-500 hover:text-gray-200" onClick={() => setCollapsed(true)}>▾</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 py-1 space-y-0.5">
        {log.length === 0 && <div className="text-gray-600 italic">暂无日志</div>}
        {log.map((e, i) => (
          <div key={i} className={
            e.level === 'error' ? 'text-red-400' :
            e.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'
          }>
            <span className="text-gray-600">[{new Date(e.ts).toLocaleTimeString()}]</span>{' '}
            {e.nodeId && <span className="text-primary-400">[{e.nodeId.slice(0, 6)}]</span>}{' '}
            {e.message}
          </div>
        ))}
      </div>
    </div>
  );
}
