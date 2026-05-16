/**
 * rawDataStore — in-memory store for raw Excel rows loaded by DataContext.
 * Used by widgetApi / WidgetBuilderPage instead of the server's /api/data/raw route.
 * Lives in module scope so it persists across re-renders without hitting localStorage.
 */

const _store = {
  delivery:     null,  // { rows: [], sheets: [] }
  qa_bugs:      null,  // { rows: [] }
  qa_escaping:  null,  // { rows: [] }
};

export const rawDataStore = {
  set(source, data) { _store[source] = data; },
  get(source)       { return _store[source]; },
  clear()           { _store.delivery = null; _store.qa_bugs = null; _store.qa_escaping = null; },
};
