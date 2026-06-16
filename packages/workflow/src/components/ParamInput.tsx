/**
 * Render an input control for a single param. Used by both the inline node
 * preview and the right-hand PropertyPanel.
 */

import { useState, useRef } from 'react';
import type { ParamDef } from '../engine/types';
import { SIZE_PRESETS, parseSize } from '../lib/sizes';
import { MODELS } from '../lib/models';
import { uploadImage } from '../api/upload';

interface RenderArgs {
  paramKey: string;
  def: ParamDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}

export function renderParamInput({ def, value, onChange, disabled }: RenderArgs) {
  const v = value ?? def.default ?? '';
  const base = 'input-base w-full';

  switch (def.kind) {
    case 'string':
    case 'text':
      return (
        <input
          type="text"
          className={base}
          value={String(v)}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'multiline':
      return (
        <textarea
          className={base + ' min-h-[60px] font-mono text-[11px] leading-relaxed'}
          value={String(v)}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          className={base}
          value={v === '' || v === null || v === undefined ? '' : Number(v)}
          min={def.min}
          max={def.max}
          step={def.step ?? 'any'}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
        />
      );
    case 'boolean':
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!v}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-primary-500"
          />
          <span className="text-gray-300">{v ? '开' : '关'}</span>
        </label>
      );
    case 'select':
    case 'model': {
      const opts = def.kind === 'model'
        ? MODELS.map((m) => ({ label: m.label, value: m.value }))
        : (def.options || []);
      return (
        <select
          className={base}
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {opts.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      );
    }
    case 'size': {
      const preset = (value as string) || (def.default as string) || '1024x1024';
      const isCustom = preset === 'custom';
      return (
        <div className="flex gap-1">
          <select
            className={base + ' flex-1'}
            value={preset}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {isCustom && (
            <input
              type="text"
              className={base + ' w-28'}
              placeholder="WxH"
              value={String((value as unknown as { customSize?: string })?.customSize || '')}
              onChange={(e) => onChange({ customSize: e.target.value })}
              disabled={disabled}
            />
          )}
        </div>
      );
    }
    case 'enum': {
      return (
        <div className="flex flex-wrap gap-1">
          {(def.options || []).map((o) => (
            <button
              key={String(o.value)}
              type="button"
              className={
                'px-2 py-1 rounded text-[11px] ' +
                (v === o.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-sunken text-gray-300 hover:bg-surface-border')
              }
              onClick={() => onChange(o.value)}
              disabled={disabled}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

/** File upload widget used by ImageInput node. */
export function ImageUploadField({ onUploaded, initialUrl }: { onUploaded: (info: { dataUri: string }) => void; initialUrl?: string }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadImage(f);
      setPreview(r.dataUri);
      onUploaded({ dataUri: r.dataUri });
    } catch (err) {
      alert(`上传失败: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button
        type="button"
        className="btn-ghost w-full justify-center"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '上传中…' : '📁 选择本地图片'}
      </button>
      {preview && (
        <div className="mt-2">
          <img src={preview} alt="" className="rounded border border-surface-border max-w-full" style={{ maxHeight: 100 }} />
        </div>
      )}
    </div>
  );
}

/** Helper used by SizeSelector to render preset + custom width/height inputs. */
export function parseCustomSize(s: string): { width: number; height: number } | null {
  return parseSize(s);
}
