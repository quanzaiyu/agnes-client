import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import type { TextMessage } from '@/api/types';

const KEY = 'text_conversations';

export const useTextStore = defineStore('text', () => {
  const conversations = $ref<{ id: string; title: string; messages: TextMessage[]; createdAt: string }[]>(
    storage.get(KEY, [])
  );
  const currentId = $ref<string>(storage.get('text_current_id', ''));

  function ensureCurrent() {
    if (!conversations.find(c => c.id === currentId)) {
      const id = 'c_' + Date.now().toString(36);
      conversations.unshift({ id, title: '新对话', messages: [], createdAt: new Date().toISOString() });
      currentId = id;
      persist();
    }
  }

  function persist() {
    storage.set(KEY, conversations);
    storage.set('text_current_id', currentId);
  }

  function switchTo(id: string) { currentId = id; persist(); }
  function remove(id: string) {
    const i = conversations.findIndex(c => c.id === id);
    if (i >= 0) conversations.splice(i, 1);
    if (currentId === id) currentId = conversations[0]?.id || '';
    persist();
  }
  function pushMessage(msg: TextMessage) {
    ensureCurrent();
    const c = conversations.find(c => c.id === currentId)!;
    c.messages.push(msg);
    if (c.title === '新对话' && msg.role === 'user') {
      c.title = msg.content.slice(0, 20);
    }
    persist();
  }
  function updateLastAssistant(delta: string) {
    ensureCurrent();
    const c = conversations.find(c => c.id === currentId)!;
    const last = c.messages[c.messages.length - 1];
    if (last && last.role === 'assistant') last.content += delta;
    else c.messages.push({ role: 'assistant', content: delta });
    persist();
  }

  return $$({ conversations, currentId, ensureCurrent, switchTo, remove, pushMessage, updateLastAssistant });
});