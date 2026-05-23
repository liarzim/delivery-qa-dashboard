/**
 * LayoutContext — server-synced layout for all dashboards.
 *
 * Shape persisted (per user, SQLite user_layouts table):
 *   { [dashboardId]: { order: string[], hidden: string[] } | { rglItems: RGLItem[] } }
 *
 * localStorage key "layout_server_cache" is used as fast-init to avoid flash.
 */
import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { apiFetch } from '../lib/api';
import { store } from '../lib/store';
import { useAuth } from './AuthContext';

const CACHE_KEY = 'layout_server_cache';
const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const { user } = useAuth();

  // Initialise from cache immediately so DashboardLayout renders without flash
  const [allLayouts, setAllLayouts] = useState(() => {
    try { return store.get(CACHE_KEY) || {}; }
    catch { return {}; }
  });
  const [master, setMaster] = useState({});
  const [hasCustom, setHasCustom] = useState(false);

  const saveTimer = useRef(null);

  // ── Load from server on auth ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    apiFetch('/api/layout')
      .then(({ layout, master: m, hasCustom: hc }) => {
        if (layout && Object.keys(layout).length) {
          setAllLayouts(layout);
          store.set(CACHE_KEY, layout);
        }
        if (m) setMaster(m);
        setHasCustom(hc);
      })
      .catch(() => {}); // Use cache on failure
  }, [user]);

  // ── Save to server (debounced 400 ms) ─────────────────────────────────────
  const persistLayouts = useCallback((next) => {
    store.set(CACHE_KEY, next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/api/layout', {
        method: 'PUT',
        body: JSON.stringify({ layout: next }),
      }).then(() => setHasCustom(true)).catch(() => {});
    }, 400);
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────
  const getLayout = useCallback((dashboardId) => {
    return allLayouts[dashboardId] || null;
  }, [allLayouts]);

  const setLayout = useCallback((dashboardId, layout) => {
    setAllLayouts(prev => {
      const next = { ...prev, [dashboardId]: layout };
      persistLayouts(next);
      return next;
    });
  }, [persistLayouts]);

  const getMaster = useCallback((dashboardId) => {
    return master[dashboardId] || null;
  }, [master]);

  const setAsMaster = useCallback(async (dashboardId, layout) => {
    const next = { ...master, [dashboardId]: layout };
    setMaster(next);
    await apiFetch('/api/layout/master', {
      method: 'PUT',
      body: JSON.stringify({ layout: next }),
    });
  }, [master]);

  const resetToMaster = useCallback(async (dashboardId) => {
    clearTimeout(saveTimer.current);
    const next = { ...allLayouts };
    delete next[dashboardId];
    store.set(CACHE_KEY, next);
    setAllLayouts(next);
    setHasCustom(Object.keys(next).length > 0);
    await apiFetch('/api/layout', {
      method: 'PUT',
      body: JSON.stringify({ layout: next }),
    });
  }, [allLayouts]);

  return (
    <LayoutContext.Provider value={{
      getLayout, setLayout,
      getMaster, setAsMaster, resetToMaster,
      hasCustom,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayoutContext = () => useContext(LayoutContext);
