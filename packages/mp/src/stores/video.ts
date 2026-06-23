import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface VideoRecord { id: string; prompt: string; status: string; url?: string; createdAt: string; }

const KEY = 'video_history';

export const useVideoStore = defineStore('video', () => {
  const history = $ref<VideoRecord[]>(storage.get(KEY, []));
  function upsert(rec: VideoRecord) {
    const i = history.findIndex(v => v.id === rec.id);
    if (i >= 0) history[i] = rec;
    else history.unshift(rec);
    if (history.length > 30) history.length = 30;
    storage.set(KEY, history);
  }
  return $$({ history, upsert });
});