/**
 * Client-side data aggregation engine for the Custom Widget Builder.
 *
 * Pipeline:
 *   rawRows → applyFilters → aggregateData → chart data []
 */

// ── Column type detection ─────────────────────────────────────────────────────
export function detectColumnType(rows, column) {
  const samples = rows
    .slice(0, 30)
    .map(r => r[column])
    .filter(v => v !== null && v !== undefined && v !== '');

  if (!samples.length) return 'text';

  const numericCount = samples.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
  if (numericCount / samples.length >= 0.75) return 'number';

  const dateRe = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}/;
  const dateCount = samples.filter(v => typeof v === 'string' && dateRe.test(String(v))).length;
  if (dateCount / samples.length >= 0.5) return 'date';

  return 'text';
}

// ── Build per-column metadata: type + unique text values ─────────────────────
export function buildColumnMeta(rows) {
  if (!rows.length) return {};
  const meta = {};
  const columns = Object.keys(rows[0]);
  for (const col of columns) {
    const type = detectColumnType(rows, col);
    meta[col] = { type };
    if (type === 'text') {
      const unique = [...new Set(rows.map(r => String(r[col] ?? '')).filter(Boolean))].sort();
      meta[col].options = unique.slice(0, 200); // cap for UI performance
    }
  }
  return meta;
}

// ── Filter predicates ─────────────────────────────────────────────────────────
function matchesFilter(value, filter) {
  if (!filter || !filter.active) return true;

  switch (filter.type) {
    case 'text': {
      const str = String(value ?? '').toLowerCase();
      if (filter.search && !str.includes(filter.search.toLowerCase())) return false;
      if (filter.selected?.length && !filter.selected.includes(String(value ?? ''))) return false;
      return true;
    }
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) return false;
      const a = parseFloat(filter.value);
      const b = parseFloat(filter.value2);
      switch (filter.op) {
        case 'gt':      return num > a;
        case 'gte':     return num >= a;
        case 'lt':      return num < a;
        case 'lte':     return num <= a;
        case 'eq':      return num === a;
        case 'between': return num >= a && num <= b;
        default:        return true;
      }
    }
    case 'date': {
      const d = new Date(value);
      if (isNaN(d)) return false;
      if (filter.from && new Date(filter.from) > d) return false;
      if (filter.to   && new Date(filter.to)   < d) return false;
      return true;
    }
    default: return true;
  }
}

// ── Apply all active filters to a row array ───────────────────────────────────
export function applyFilters(rows, filters = {}) {
  if (!Object.keys(filters).length) return rows;
  return rows.filter(row =>
    Object.entries(filters).every(([col, f]) => matchesFilter(row[col], f)),
  );
}

// ── Aggregate rows by xField, applying formula to yField ─────────────────────
export function aggregateData(rows, xField, yField, formula = 'count') {
  if (!rows.length || !xField) return [];

  const groups = new Map();
  for (const row of rows) {
    const key = String(row[xField] ?? '(blank)');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const result = [];
  for (const [key, groupRows] of groups) {
    let value = 0;
    if (formula === 'count') {
      value = groupRows.length;
    } else {
      const nums = groupRows
        .map(r => parseFloat(r[yField]))
        .filter(v => !isNaN(v));
      switch (formula) {
        case 'sum':     value = nums.reduce((a, b) => a + b, 0); break;
        case 'average': value = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; break;
        case 'min':     value = nums.length ? Math.min(...nums) : 0; break;
        case 'max':     value = nums.length ? Math.max(...nums) : 0; break;
        default:        value = groupRows.length;
      }
    }
    result.push({ x: key, y: Math.round(value * 100) / 100, count: groupRows.length });
  }

  // Sort alphabetically by x label for consistency
  return result.sort((a, b) => String(a.x).localeCompare(String(b.x), undefined, { numeric: true }));
}

// ── Top-level helper: filter + aggregate from a config object ─────────────────
export function buildChartData(rows, config) {
  const filtered = applyFilters(rows, config.filters || {});
  if (!config.xField) return [];
  return aggregateData(filtered, config.xField, config.yField, config.formula);
}

// ── Unique text values for a column (for filter dropdown) ────────────────────
export function getUniqueValues(rows, column) {
  return [...new Set(rows.map(r => String(r[column] ?? '')).filter(Boolean))].sort();
}
