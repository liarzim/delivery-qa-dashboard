/**
 * Thin localStorage helper.
 * All values are JSON-serialised so callers work with plain objects/arrays.
 */
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded – ignore */ }
  },
  remove(key) { localStorage.removeItem(key); },
};
