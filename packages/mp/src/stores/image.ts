import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface ImageRecord { id: string; prompt: string; url: string; size: string; createdAt: string; }

const KEY = 'image_history';

export const useImageStore = defineStore('image', () => {
  const history = $ref<ImageRecord[]>(storage.get(KEY, []));
  function add(rec: ImageRecord) {
    history.unshift(rec);
    if (history.length > 50) history.length = 50;
    storage.set(KEY, history);
  }
  function clear() { history.length = 0; storage.set(KEY, history); }
  return $$({ history, add, clear });
});