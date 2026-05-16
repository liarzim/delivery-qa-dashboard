/**
 * AuthContext — GitHub OAuth auth (static/Netlify deployment).
 *
 * Login redirects to GitHub; the callback page exchanges the code for a
 * token via our Netlify function, then fetches the GitHub user profile.
 *
 * Roles:
 *   Admin      — GitHub username appears in localStorage 'admin_users' list.
 *                The first user to log in is automatically made Admin.
 *   Management — everyone else.
 */
import React, { createContext, useContext, useState } from 'react';
import { store } from '../lib/store';

const AuthContext = createContext(null);

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => store.get('auth_user'));
  const [loading, setLoading] = useState(false);

  // ── Step 1: redirect to GitHub ──────────────────────────────────────────
  const login = () => {
    const params = new URLSearchParams({
      client_id:    CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback`,
      scope:        'read:user user:email',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  // ── Step 2: called from AuthCallback after token exchange ───────────────
  const handleToken = async (accessToken) => {
    setLoading(true);
    try {
      store.set('auth_token', accessToken);

      const res    = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const ghUser = await res.json();

      // First-ever login → become Admin automatically
      const admins = store.get('admin_users', null);
      if (admins === null) {
        store.set('admin_users', [ghUser.login]);
      }

      const adminList = store.get('admin_users', []);
      const role      = adminList.includes(ghUser.login) ? 'Admin' : 'Management';

      const userObj = {
        id:       String(ghUser.id),
        username: ghUser.login,
        name:     ghUser.name || ghUser.login,
        avatar:   ghUser.avatar_url,
        role,
      };
      store.set('auth_user', userObj);
      setUser(userObj);
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    store.remove('auth_token');
    store.remove('auth_user');
    setUser(null);
  };

  // ── User / admin management (localStorage-backed) ───────────────────────
  const getAll = () => {
    const admins = store.get('admin_users', []);
    return Promise.resolve(admins.map(u => ({ id: u, username: u, role: 'Admin' })));
  };

  const addUser = ({ username, role }) => {
    if (role === 'Admin') {
      const admins = store.get('admin_users', []);
      if (!admins.includes(username)) store.set('admin_users', [...admins, username]);
    }
    return Promise.resolve({ username, role });
  };

  const removeUser = (usernameOrId) => {
    const admins = store.get('admin_users', []);
    store.set('admin_users', admins.filter(u => u !== usernameOrId));
    return Promise.resolve();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, handleToken, getAll, addUser, removeUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
