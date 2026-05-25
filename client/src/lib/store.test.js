import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store.js';

describe('store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('returns null fallback when key is absent', () => {
      expect(store.get('missing')).toBeNull();
    });

    it('returns custom fallback when key is absent', () => {
      expect(store.get('missing', 42)).toBe(42);
      expect(store.get('missing', { a: 1 })).toEqual({ a: 1 });
    });

    it('returns the stored value after a set', () => {
      store.set('key', { x: 10 });
      expect(store.get('key')).toEqual({ x: 10 });
    });

    it('parses stored arrays correctly', () => {
      store.set('arr', [1, 2, 3]);
      expect(store.get('arr')).toEqual([1, 2, 3]);
    });

    it('parses stored primitives correctly', () => {
      store.set('num', 99);
      expect(store.get('num')).toBe(99);

      store.set('bool', true);
      expect(store.get('bool')).toBe(true);
    });

    it('returns fallback when stored value is invalid JSON', () => {
      localStorage.setItem('bad', 'not-valid-json{');
      expect(store.get('bad', 'fallback')).toBe('fallback');
    });

    it('returns null (not fallback) when stored value is the string "null"', () => {
      store.set('null-key', null);
      expect(store.get('null-key', 'default')).toBeNull();
    });
  });

  describe('set', () => {
    it('overwrites a previously stored value', () => {
      store.set('key', 'first');
      store.set('key', 'second');
      expect(store.get('key')).toBe('second');
    });

    it('stores nested objects', () => {
      const obj = { a: { b: { c: 42 } } };
      store.set('nested', obj);
      expect(store.get('nested')).toEqual(obj);
    });
  });

  describe('remove', () => {
    it('removes an existing key', () => {
      store.set('key', 'value');
      store.remove('key');
      expect(store.get('key')).toBeNull();
    });

    it('does not throw when removing a non-existent key', () => {
      expect(() => store.remove('does-not-exist')).not.toThrow();
    });
  });
});
