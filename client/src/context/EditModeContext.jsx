import React, { createContext, useContext, useState, useCallback } from 'react';

const EditModeContext = createContext({ editMode: false, toggleEditMode: () => {} });

export function EditModeProvider({ children }) {
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = useCallback(() => setEditMode(m => !m), []);

  return (
    <EditModeContext.Provider value={{ editMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export const useEditMode = () => useContext(EditModeContext);
