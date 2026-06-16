/**
 * Tiny prompt-at-position input. Used for "name this API input/output".
 * Resolves with the entered string, or null if cancelled.
 */
import { useEffect, useState } from 'react';

interface Props {
  title: string;
  defaultValue?: string;
  placeholder?: string;
  x: number;
  y: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function NamePrompt({ title, defaultValue = '', placeholder, x, y, onSubmit, onCancel }: Props) {
  const [val, setVal] = useState(defaultValue);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Clamp to viewport
  const adjX = Math.min(x, window.innerWidth - 280);
  const adjY = Math.min(y, window.innerHeight - 110);

  return (
    <form
      className="fixed z-50 panel p-2 shadow-xl flex flex-col gap-1.5 w-[260px]"
      style={{ left: adjX, top: adjY }}
      onMouseDown={(e) => e.stopPropagation()}
      onSubmit={(e) => { e.preventDefault(); onSubmit(val.trim()); }}
    >
      <div className="text-[11px] text-gray-400">{title}</div>
      <input
        type="text"
        autoFocus
        className="input-base text-xs"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <div className="flex gap-1 justify-end">
        <button type="button" className="btn-ghost text-[10px] px-2 py-0.5" onClick={onCancel}>取消</button>
        <button type="submit" className="btn-primary text-[10px] px-2 py-0.5">确定</button>
      </div>
    </form>
  );
}
