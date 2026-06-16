import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { NodePanel } from './components/NodePanel';
import { PropertyPanel } from './components/PropertyPanel';
import { FlowCanvas } from './components/FlowCanvas';
import { LogPanel } from './components/LogPanel';
import { useSettingsStore } from './store/settingsStore';

export default function App() {
  const load = useSettingsStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-full flex flex-col bg-surface">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 border-r border-surface-border bg-surface-sunken flex-shrink-0">
          <NodePanel />
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <FlowCanvas />
          <LogPanel />
        </main>
        <aside className="w-72 border-l border-surface-border bg-surface-sunken flex-shrink-0 overflow-auto">
          <PropertyPanel />
        </aside>
      </div>
    </div>
  );
}
