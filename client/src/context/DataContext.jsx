/**
 * DataContext — loads processed data from the Express server.
 *
 * Flow:
 *  1. On mount: if session paths are saved in localStorage, auto-load from server.
 *  2. If no saved paths: needsFiles = true → FileLoader (path dialog) appears.
 *  3. User enters/confirms paths → loadFromPaths() → data flows to dashboards.
 *  4. "Reload" → clearData() → FileLoader appears again.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiFetch, getToken } from '../lib/api';

const DataContext = createContext(null);

const PATHS_KEY = 'data_paths';

function getSavedPaths() {
  try { return JSON.parse(localStorage.getItem(PATHS_KEY) || 'null'); } catch { return null; }
}

// A path is only considered valid if it contains a directory separator —
// bare filenames like "delivery.xlsx" can't be resolved by the server.
function isFullPath(p) {
  return typeof p === 'string' && (p.includes('/') || p.includes('\\'));
}
function pathsAreValid(paths) {
  return paths && isFullPath(paths.deliveryPath) && isFullPath(paths.bugsPath);
}

export function DataProvider({ children }) {
  const [delivery, setDelivery] = useState(null);
  const [qa,       setQA]       = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [needsFiles, setNeedsFiles] = useState(true);

  // Auto-load saved paths on mount (user already has a session token)
  useEffect(() => {
    const saved = getSavedPaths();
    if (pathsAreValid(saved) && getToken()) {
      loadFromPaths(saved);
    } else {
      // Clear incomplete/bare-filename paths so the dialog shows fresh defaults
      if (saved && !pathsAreValid(saved)) localStorage.removeItem(PATHS_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFromPaths = useCallback(async (paths = {}) => {
    setLoading(true);
    setError(null);
    try {
      const dQuery = paths.deliveryPath
        ? `?deliveryPath=${encodeURIComponent(paths.deliveryPath)}` : '';
      const qParams = new URLSearchParams();
      if (paths.bugsPath)     qParams.set('bugsPath',     paths.bugsPath);
      if (paths.escapingPath) qParams.set('escapingPath', paths.escapingPath);
      const qQuery = qParams.toString() ? `?${qParams}` : '';

      const [dData, qData] = await Promise.all([
        apiFetch(`/api/data/delivery${dQuery}`),
        apiFetch(`/api/data/qa${qQuery}`),
      ]);

      setDelivery(dData);
      setQA(qData);
      // Save paths so next session auto-loads
      if (paths.deliveryPath || paths.bugsPath) {
        localStorage.setItem(PATHS_KEY, JSON.stringify(paths));
      }
      setNeedsFiles(false);
    } catch (e) {
      setError(e.message || 'Failed to load data from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setDelivery(null);
    setQA(null);
    setNeedsFiles(true);
    setError(null);
    localStorage.removeItem(PATHS_KEY);
  }, []);

  const skipFiles = useCallback(() => {
    setNeedsFiles(false);
    setError(null);
  }, []);

  const openLoader = useCallback(() => {
    setNeedsFiles(true);
    setError(null);
  }, []);

  return (
    <DataContext.Provider value={{
      delivery, qa, loading, error, needsFiles,
      loadFromPaths,
      loadFiles: loadFromPaths, // legacy alias kept for AppShell sidebar "Reload Data"
      clearData, skipFiles, openLoader,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
