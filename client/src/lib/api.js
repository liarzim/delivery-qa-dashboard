/**
 * apiFetch — thin wrapper around fetch that injects the JWT Bearer token
 * and throws on non-2xx responses. Used by all contexts and pages that
 * talk to the Express server.
 */

export function getToken() {
  try { return sessionStorage.getItem('auth_token'); } catch { return null; }
}
export function setToken(t) {
  try { sessionStorage.setItem('auth_token', t); } catch {}
}
export function clearToken() {
  try { sessionStorage.removeItem('auth_token'); } catch {}
}

export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}
