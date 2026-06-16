/**
 * Left panel: drag-to-canvas node palette.
 * Uses HTML5 drag-and-drop; React Flow's onDrop reads the dataTransfer.
 */

import { useState } from 'react';
import { nodePanelGroups } from '../nodes';

export function NodePanel() {
  const [search, setSearch] = useState('');
  const filter = search.trim().toLowerCase();

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="p-2 border-b border-surface-border">
        <input
          type="search"
          placeholder="搜索节点…"
          className="input-base w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-3">
        {nodePanelGroups.map((g) => {
          const items = g.items.filter((m) => !filter || m.label.toLowerCase().includes(filter) || m.type.toLowerCase().includes(filter));
          if (items.length === 0) return null;
          return (
            <div key={g.category}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 px-1">{g.label}</div>
              <div className="space-y-1">
                {items.map((m) => (
                  <div
                    key={m.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/agnes-node', m.type);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="px-2 py-1.5 rounded bg-surface-raised border border-surface-border hover:border-primary-500 hover:bg-primary-900/20 cursor-grab active:cursor-grabbing select-none flex items-center gap-1.5"
                    title={m.label}
                  >
                    {m.icon && <span className={m.icon} />}
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
