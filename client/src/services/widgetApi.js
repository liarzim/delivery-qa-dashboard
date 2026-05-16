/**
 * Widget API — calls the Express backend for custom widget CRUD.
 * Auth via X-Username / X-User-Role headers (internal tool, no JWT needed).
 */

function headers(user) {
  return {
    'Content-Type': 'application/json',
    'X-Username':  user?.username || 'anonymous',
    'X-User-Role': user?.role     || 'Management',
  };
}

async function req(method, url, user, body) {
  const opts = { method, headers: headers(user) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Raw data ──────────────────────────────────────────────────────────────────
const _rawCache = new Map();

export async function fetchRawData(source, user) {
  if (_rawCache.has(source)) return _rawCache.get(source);
  try {
    const rows = await req('GET', `/api/data/raw/${source}`, user);
    _rawCache.set(source, rows);
    return rows;
  } catch {
    return [];
  }
}
export function clearRawCache() { _rawCache.clear(); }

// ── Widget CRUD ───────────────────────────────────────────────────────────────
export const widgetApi = {
  list:    (user)          => req('GET',    '/api/widgets',             user),
  get:     (id, user)      => req('GET',    `/api/widgets/${id}`,       user),
  create:  (body, user)    => req('POST',   '/api/widgets',             user, body),
  update:  (id, body, user)=> req('PUT',    `/api/widgets/${id}`,       user, body),
  remove:  (id, user)      => req('DELETE', `/api/widgets/${id}`,       user),
  publish: (id, user)      => req('PUT',    `/api/widgets/${id}/publish`,user, {}),
  approve: (id, user)      => req('PUT',    `/api/widgets/${id}/approve`,user, {}),
  reject:  (id, user)      => req('PUT',    `/api/widgets/${id}/reject`, user, {}),
  pending: (user)          => req('GET',    '/api/widgets/pending',      user),
};
