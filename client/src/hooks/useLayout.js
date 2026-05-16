import { useState, useCallback, useRef } from 'react';
import { store } from '../lib/store';
import { useAuth } from '../context/AuthContext';

// ── Storage key helpers ────────────────────────────────────────────────────────
function layoutKey(dashboardId, username) {
  return `layout_${dashboardId}_${username || 'guest'}`;
}
function masterKey(dashboardId) {
  return `layout_master_${dashboardId}`;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useLayout(dashboardId, allWidgets) {
  const { user } = useAuth();
  const username     = user?.username;
  const isAdmin      = user?.role === 'Admin';
  const defaultOrder = allWidgets.map(w => w.id);

  // Initialise from localStorage synchronously (no flash)
  const [order, setOrder] = useState(() => {
    const saved = store.get(layoutKey(dashboardId, username));
    return saved?.order ?? defaultOrder;
  });
  const [hidden, setHidden] = useState(() => {
    const saved = store.get(layoutKey(dashboardId, username));
    return saved?.hidden ?? [];
  });
  const [hasCustom, setHasCustom] = useState(
    () => !!store.get(layoutKey(dashboardId, username)),
  );
  const [editMode, setEditMode] = useState(false);

  const saveTimer = useRef(null);

  // Debounced localStorage write so rapid drags don't thrash storage
  const save = useCallback((newOrder, newHidden) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      store.set(layoutKey(dashboardId, username), { order: newOrder, hidden: newHidden });
      setHasCustom(true);
    }, 300);
  }, [dashboardId, username]);

  const move = useCallback((fromIndex, toIndex) => {
    setOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      save(next, hidden);
      return next;
    });
  }, [hidden, save]);

  const hide = useCallback((id) => {
    setHidden(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      save(order, next);
      return next;
    });
  }, [order, save]);

  const show = useCallback((id) => {
    setHidden(prev => {
      const next = prev.filter(h => h !== id);
      save(order, next);
      return next;
    });
  }, [order, save]);

  // Admin: snapshot current layout as the shared default for all users
  const setAsMaster = useCallback(() => {
    store.set(masterKey(dashboardId), { order, hidden });
  }, [dashboardId, order, hidden]);

  // Reset personal layout → falls back to master (if set) or factory default
  const resetToMaster = useCallback(() => {
    store.remove(layoutKey(dashboardId, username));
    setHasCustom(false);
    setEditMode(false);
    const master = store.get(masterKey(dashboardId));
    if (master) {
      setOrder(master.order ?? defaultOrder);
      setHidden(master.hidden ?? []);
    } else {
      setOrder(defaultOrder);
      setHidden([]);
    }
  }, [dashboardId, defaultOrder, username]);

  // Visible = saved order first, then any widgets not yet in saved order
  const visibleWidgets = [
    ...order.filter(id => !hidden.includes(id)),
    ...defaultOrder.filter(id => !order.includes(id) && !hidden.includes(id)),
  ]
    .map(id => allWidgets.find(w => w.id === id))
    .filter(Boolean);

  const hiddenWidgets = allWidgets.filter(w => hidden.includes(w.id));

  return {
    visibleWidgets, hiddenWidgets,
    editMode, setEditMode,
    move, hide, show,
    isAdmin, hasCustom,
    setAsMaster, resetToMaster,
  };
}
