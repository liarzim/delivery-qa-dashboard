import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { widgetApi } from '../services/widgetApi';

const WidgetBankContext = createContext(null);

export function WidgetBankProvider({ children }) {
  const [isOpen, setIsOpen]           = useState(false);
  const [customWidgets, setCustom]    = useState([]);
  const { user }                      = useAuth();

  const toggle = () => setIsOpen(o => !o);

  const refresh = useCallback(async () => {
    if (!user) { setCustom([]); return; }
    try {
      const all = await widgetApi.list(user);
      setCustom(Array.isArray(all) ? all : []);
    } catch {
      setCustom([]);
    }
  }, [user]);

  // Load on mount and whenever the bank opens
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <WidgetBankContext.Provider value={{ isOpen, setIsOpen, toggle, customWidgets, refresh }}>
      {children}
    </WidgetBankContext.Provider>
  );
}

export const useWidgetBank = () => useContext(WidgetBankContext);
