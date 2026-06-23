const PREFIX = 'agnes_mp_';

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = uni.getStorageSync(PREFIX + key);
      return v === '' || v === null || v === undefined ? fallback : (v as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try { uni.setStorageSync(PREFIX + key, value); } catch {}
  },
  remove(key: string): void {
    try { uni.removeStorageSync(PREFIX + key); } catch {}
  }
};