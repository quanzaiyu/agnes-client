import { writable } from 'svelte/store';
import { auth } from '$lib/api';

// Current user store
function createUserStore() {
  const { subscribe, set, update } = writable(null);

  return {
    subscribe,
    set,
    update,
    async fetch() {
      try {
        const { user } = await auth.me();
        set(user);
        return user;
      } catch {
        set(null);
        return null;
      }
    },
    logout() {
      set(null);
    },
    updatePoints(delta) {
      update(u => u ? { ...u, points: u.points + delta } : null);
    }
  };
}

export const user = createUserStore();

// Toast notifications store
function createToastStore() {
  const { subscribe, update } = writable([]);

  return {
    subscribe,
    add(message, type = 'info', duration = 3000) {
      const id = Date.now() + Math.random();
      update(toasts => [...toasts, { id, message, type }]);
      setTimeout(() => {
        update(toasts => toasts.filter(t => t.id !== id));
      }, duration);
    },
    success(message) { this.add(message, 'success'); },
    error(message) { this.add(message, 'error', 5000); },
    info(message) { this.add(message, 'info'); }
  };
}

export const toasts = createToastStore();

// Points store with auto-refresh
function createPointsStore() {
  const { subscribe, set } = writable(0);

  return {
    subscribe,
    set,
    async fetch() {
      try {
        const { points } = await import('$lib/api').then(m => m.points.get());
        set(points);
        return points;
      } catch {
        return 0;
      }
    }
  };
}

export const points = createPointsStore();