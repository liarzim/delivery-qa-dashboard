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

// ── Safe custom formula evaluator ────────────────────────────────────────────
// Supports:
//   COUNT(*)             – row count in group
//   COUNTIF(col,"val")   – rows where col equals val (case-insensitive)
//   COUNTIF(col,"*val*") – rows where col contains val  (wrap value with *)
//   SUM(field), AVG(field), AVERAGE(field), MIN(field), MAX(field)
//   Numeric literals and operators: + - * / ( )
export function evaluateCustomFormula(groupRows, expression) {
  if (!expression?.trim()) return 0;
  try {
    let expr = expression
      // COUNTIF(field, "value") — exact or wildcard (*val*) match
      .replace(/COUNTIF\s*\(\s*([^,]+?)\s*,\s*["']?([^"')]+?)["']?\s*\)/gi, (_, field, val) => {
        field = field.trim();
        val   = val.trim();
        const wildcard = val.startsWith('*') && val.endsWith('*');
        const inner    = wildcard ? val.slice(1, -1).toLowerCase() : val.toLowerCase();
        return groupRows.filter(r => {
          const cell = String(r[field] ?? '').toLowerCase();
          return wildcard ? cell.includes(inner) : cell === inner;
        }).length;
      })
      // COUNT(*) or COUNT(anything)
      .replace(/COUNT\s*\([^)]*\)/gi, () => groupRows.length)
      // SUM(field)
      .replace(/SUM\s*\(([^)]+)\)/gi, (_, field) => {
        field = field.trim();
        const nums = groupRows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        return nums.reduce((a, b) => a + b, 0);
      })
      // AVG / AVERAGE(field)
      .replace(/(?:AVG|AVERAGE)\s*\(([^)]+)\)/gi, (_, field) => {
        field = field.trim();
        const nums = groupRows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      })
      // MIN(field)
      .replace(/MIN\s*\(([^)]+)\)/gi, (_, field) => {
        field = field.trim();
        const nums = groupRows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        return nums.length ? Math.min(...nums) : 0;
      })
      // MAX(field)
      .replace(/MAX\s*\(([^)]+)\)/gi, (_, field) => {
        field = field.trim();
        const nums = groupRows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        return nums.length ? Math.max(...nums) : 0;
      });

    // After substitution only digits, operators, dots, spaces, parens are allowed
    if (!/^[\d\s+\-*/.()]+$/.test(expr)) return 0;
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)();
    return typeof result === 'number' && isFinite(result) ? Math.round(result * 1000) / 1000 : 0;
  } catch {
    return 0;
  }
}

// ── Test a single row against a countif_ratio condition ──────────────────────
function rowMatchesCondition(row, field, op, value) {
  if (!field) return false;
  const cell = String(row[field] ?? '').toLowerCase();
  // Support comma-separated OR values: "Done, Closed"
  const targets = String(value ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!targets.length) return false;
  return targets.some(target => {
    switch (op) {
      case 'contains':     return cell.includes(target);
      case 'not_eq':       return cell !== target;
      case 'not_contains': return !cell.includes(target);
      case 'starts_with':  return cell.startsWith(target);
      default:             return cell === target;   // 'eq'
    }
  });
}

// ── Aggregate rows by xField, applying formula to yField ─────────────────────
// extraConfig carries countif_ratio fields: countifField, countifOp, countifValue,
// denomField, denomOp, denomValue
export function aggregateData(rows, xField, yField, formula = 'count', customFormula = '', extraConfig = {}) {
  if (!rows.length) return [];

  // countif_ratio with no xField → single global percentage (useful for Gauge)
  if (formula === 'countif_ratio' && !xField) {
    const { countifField, countifOp = 'eq', countifValue = '',
            denomField, denomOp = 'eq', denomValue } = extraConfig;
    const numRows  = rows.filter(r => rowMatchesCondition(r, countifField, countifOp, countifValue));
    const denomRows = denomField
      ? rows.filter(r => rowMatchesCondition(r, denomField, denomOp, denomValue))
      : rows;
    const pct = denomRows.length > 0 ? (numRows.length / denomRows.length) * 100 : 0;
    return [{ x: 'Total', y: Math.round(pct * 100) / 100, count: rows.length }];
  }

  if (!xField) return [];

  const groups = new Map();
  for (const row of rows) {
    const key = String(row[xField] ?? '(blank)');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const result = [];
  for (const [key, groupRows] of groups) {
    let value = 0;
    if (formula === 'custom') {
      value = evaluateCustomFormula(groupRows, customFormula);
    } else if (formula === 'countif_ratio') {
      // Count matching rows ÷ denominator rows × 100
      const { countifField, countifOp = 'eq', countifValue = '',
              denomField, denomOp = 'eq', denomValue } = extraConfig;
      const numRows   = groupRows.filter(r => rowMatchesCondition(r, countifField, countifOp, countifValue));
      const denomRows = denomField
        ? groupRows.filter(r => rowMatchesCondition(r, denomField, denomOp, denomValue))
        : groupRows;
      value = denomRows.length > 0 ? (numRows.length / denomRows.length) * 100 : 0;
    } else if (formula === 'count') {
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
  const xField   = config.chartType === 'gauge' && config.formula === 'countif_ratio'
    ? ''           // gauge + countif_ratio → single global value, no grouping
    : config.xField;
  if (!xField && config.formula !== 'countif_ratio') return [];
  return aggregateData(filtered, xField, config.yField, config.formula, config.customFormula || '', config);
}

// ── Unique text values for a column (for filter dropdown) ────────────────────
export function getUniqueValues(rows, column) {
  return [...new Set(rows.map(r => String(r[column] ?? '')).filter(Boolean))].sort();
}
