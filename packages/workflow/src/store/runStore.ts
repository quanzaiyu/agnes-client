import { create } from 'zustand';

export interface LogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
}

export type RunState = 'idle' | 'running' | 'success' | 'error' | 'aborted';

interface RunStoreState {
  state: RunState;
  startedAt?: number;
  finishedAt?: number;
  log: LogEntry[];
  abortController: AbortController | null;
  start: () => AbortController;
  abort: () => void;
  append: (entry: Omit<LogEntry, 'ts'>) => void;
  clear: () => void;
  finalize: (state: RunState) => void;
}

export const useRunStore = create<RunStoreState>((set) => ({
  state: 'idle',
  log: [],
  abortController: null,
  start: () => {
    const ac = new AbortController();
    set({
      state: 'running',
      startedAt: Date.now(),
      finishedAt: undefined,
      log: [],
      abortController: ac,
    });
    return ac;
  },
  abort: () => {
    set((s) => {
      s.abortController?.abort();
      return { abortController: null, state: 'aborted', finishedAt: Date.now() };
    });
  },
  append: (entry) => {
    set((s) => ({ log: [...s.log, { ...entry, ts: Date.now() }].slice(-500) }));
  },
  clear: () => set({ log: [] }),
  finalize: (state) => set({ state, finishedAt: Date.now() }),
}));
