import React, { createContext, useContext, useState } from 'react';

const WidgetBankContext = createContext(null);

export function WidgetBankProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(o => !o);
  return (
    <WidgetBankContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </WidgetBankContext.Provider>
  );
}

export const useWidgetBank = () => useContext(WidgetBankContext);
