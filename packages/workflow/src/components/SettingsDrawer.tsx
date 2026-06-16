import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const cfg = useSettingsStore();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://apihub.agnes-ai.com/v1');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    cfg.load();
  }, []);

  useEffect(() => {
    if (cfg.loaded) {
      setBaseUrl(cfg.baseUrl);
    }
  }, [cfg.loaded, cfg.baseUrl]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await cfg.save({ apiKey: apiKey || undefined, baseUrl: baseUrl || undefined });
      setApiKey('');
      setMsg('已保存');
    } catch (e) {
      setMsg(`失败: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="panel w-[420px] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">API 设置</h3>
          <button className="text-gray-500 hover:text-white" onClick={onClose}>×</button>
        </div>
        <div>
          <label className="text-[11px] text-gray-400">当前 API Key</label>
          <div className="text-xs text-gray-200 font-mono">{cfg.apiKeyMasked || '(未设置)'}</div>
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">新的 API Key（留空不修改）</label>
          <input
            type="password"
            className="input-base w-full"
            value={apiKey}
            placeholder="sk-..."
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Base URL</label>
          <input
            type="text"
            className="input-base w-full"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        {msg && <div className="text-[11px] text-gray-300">{msg}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
