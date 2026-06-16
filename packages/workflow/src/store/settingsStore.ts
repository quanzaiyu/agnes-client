import { create } from 'zustand';
import { getConfig, setConfig } from '../api/upload';

interface SettingsState {
  apiKeyMasked: string;
  baseUrl: string;
  loaded: boolean;
  load: () => Promise<void>;
  save: (patch: { apiKey?: string; baseUrl?: string }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKeyMasked: '',
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  loaded: false,
  load: async () => {
    try {
      const cfg = await getConfig();
      set({ apiKeyMasked: cfg.apiKey, baseUrl: cfg.baseUrl, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  save: async (patch) => {
    await setConfig(patch);
    const cfg = await getConfig();
    set({ apiKeyMasked: cfg.apiKey, baseUrl: cfg.baseUrl });
  },
}));
