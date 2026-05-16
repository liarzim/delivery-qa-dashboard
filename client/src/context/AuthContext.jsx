/**
 * AuthContext — server-based JWT auth.
 * Login calls POST /api/auth/login; token stored in sessionStorage.
 * All user management routes hit the server API.
 */
import React, { createContext, useContext, useState } from 'react';
import { apiFetch, setToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

function getUserFromSession() {
  try { return JSON.parse(sessionStorage.getItem('auth_user') || 'null'); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUserFromSession);

  const login = async (username, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    sessionStorage.setItem('auth_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearToken();
    sessionStorage.removeItem('auth_user');
    setUser(null);
  };

  const getAll    = ()  => apiFetch('/api/auth/users');
  const addUser   = (u) => apiFetch('/api/auth/users', { method: 'POST', body: JSON.stringify(u) });
  const removeUser = (id) => apiFetch(`/api/auth/users/${id}`, { method: 'DELETE' });

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, getAll, addUser, removeUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
