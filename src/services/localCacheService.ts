/**
 * Local Cache Service
 * Provides robust client-side localStorage persistence with safety fallbacks and try/catch protection.
 */

export const localCacheService = {
  getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[localCacheService] Failed to set item for key "${key}":`, e);
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[localCacheService] Failed to remove key "${key}":`, e);
    }
  }
};

export default localCacheService;
