/**
 * widgetApi — localStorage-backed CRUD for custom widgets.
 * Replaces the server API calls for the static/Netlify deployment.
 *
 * Raw Excel rows for the Widget Builder come from rawDataStore (in-memory),
 * populated by DataContext when files are loaded.
 */
import { store } from '../lib/store';
import { rawDataStore } from '../lib/rawDataStore';
import * as XLSX from 'xlsx';

const WIDGETS_KEY = 'custom_widgets';

function getWidgets() { return store.get(WIDGETS_KEY, []); }
function saveWidgets(list) { store.set(WIDGETS_KEY, list); }
function nextId() { return String(Date.now()); }

// ── Widget CRUD ───────────────────────────────────────────────────────────────
export const widgetApi = {
  list: (_user) => Promise.resolve(
    getWidgets().filter(w => w.status === 'approved' || w.status === 'personal'),
  ),

  get: (id, _user) => {
    const w = getWidgets().find(w => String(w.id) === String(id));
    return w ? Promise.resolve(w) : Promise.reject(new Error('Widget not found'));
  },

  create: (body, _user) => {
    const w = { id: nextId(), ...body, status: 'personal', createdAt: new Date().toISOString() };
    saveWidgets([...getWidgets(), w]);
    return Promise.resolve(w);
  },

  update: (id, body, _user) => {
    const list = getWidgets().map(w => String(w.id) === String(id) ? { ...w, ...body } : w);
    saveWidgets(list);
    return Promise.resolve(list.find(w => String(w.id) === String(id)));
  },

  remove: (id, _user) => {
    saveWidgets(getWidgets().filter(w => String(w.id) !== String(id)));
    return Promise.resolve();
  },

  // Publish = mark as "pending" (or auto-approve without a server review flow)
  publish: (id, _user) => {
    const list = getWidgets().map(w =>
      String(w.id) === String(id) ? { ...w, status: 'approved' } : w,
    );
    saveWidgets(list);
    return Promise.resolve({ message: 'Published' });
  },

  approve: (id, _user) => {
    const list = getWidgets().map(w =>
      String(w.id) === String(id) ? { ...w, status: 'approved' } : w,
    );
    saveWidgets(list);
    return Promise.resolve();
  },

  reject: (id, _user) => {
    const list = getWidgets().map(w =>
      String(w.id) === String(id) ? { ...w, status: 'rejected' } : w,
    );
    saveWidgets(list);
    return Promise.resolve();
  },

  pending: (_user) => Promise.resolve(
    getWidgets().filter(w => w.status === 'pending'),
  ),
};

// ── Raw data for Widget Builder ───────────────────────────────────────────────
const _rawCache = new Map();

export async function fetchSheets(source, _user) {
  const data = rawDataStore.get(source === 'delivery' ? 'delivery' : source);
  if (!data) return [];
  return data.sheets || [];
}

export async function fetchRawData(source, _user, sheet) {
  const key = sheet ? `${source}::${sheet}` : source;
  if (_rawCache.has(key)) return _rawCache.get(key);

  const storeKey = source === 'qa_bugs' ? 'qa_bugs'
    : source === 'qa_escaping' ? 'qa_escaping'
    : 'delivery';

  const data = rawDataStore.get(storeKey);
  if (!data) return [];

  let rows;
  if (sheet && data.wb) {
    const ws = data.wb.Sheets[sheet];
    rows = ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : data.rows;
  } else {
    rows = data.rows || [];
  }

  _rawCache.set(key, rows);
  return rows;
}

export function clearRawCache() { _rawCache.clear(); }
