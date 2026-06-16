/**
 * Shared subcomponent that renders a list of variable input port indicators
 * inside a node body. The actual React Flow <Handle> is rendered inside
 * NodeShell via the node.meta.inputs; here we just show "已连接 X / 未连接"
 * hints to help the user understand which var slots are present.
 */

export function VariablePorts({ vars }: { vars: Array<{ id: string; name: string }> }) {
  if (vars.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 italic">
        右键菜单 → 添加变量输入
      </div>
    );
  }
  return (
    <div className="border-t border-surface-border pt-1.5 space-y-0.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">变量</div>
      {vars.map((v) => (
        <div key={v.id} className="flex items-center text-[10px] font-mono">
          <span className="text-primary-400">${v.name}</span>
          <span className="ml-auto text-gray-600">var:{v.id.slice(0, 6)}</span>
        </div>
      ))}
    </div>
  );
}
