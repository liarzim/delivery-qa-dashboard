import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectColumnType,
  buildColumnMeta,
  applyFilters,
  evaluateCustomFormula,
  aggregateData,
  buildChartData,
  getUniqueValues,
} from './widgetAggregation.js';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const PEOPLE = [
  { name: 'Alice',   score: 85, joined: '2024-01-15', status: 'Active'   },
  { name: 'Bob',     score: 42, joined: '2024-02-20', status: 'Inactive' },
  { name: 'Charlie', score: 95, joined: '2024-03-10', status: 'Active'   },
  { name: 'Diana',   score: 60, joined: '2023-12-01', status: 'Active'   },
  { name: 'Eve',     score: 73, joined: '2024-01-25', status: 'Inactive' },
];

// ── detectColumnType ──────────────────────────────────────────────────────────

describe('detectColumnType', () => {
  it('returns "text" for empty sample set', () => {
    expect(detectColumnType([], 'col')).toBe('text');
  });

  it('returns "text" for all-blank values', () => {
    const rows = [{ col: '' }, { col: null }, { col: undefined }];
    expect(detectColumnType(rows, 'col')).toBe('text');
  });

  it('returns "number" when ≥75% of samples are numeric', () => {
    const rows = [
      { v: '10' }, { v: '20' }, { v: '30' }, { v: 'text' },
    ];
    // 3/4 = 75% → number
    expect(detectColumnType(rows, 'v')).toBe('number');
  });

  it('returns "text" when <75% are numeric', () => {
    const rows = [
      { v: '10' }, { v: '20' }, { v: 'text' }, { v: 'more' },
    ];
    // 2/4 = 50% → not number; not date → text
    expect(detectColumnType(rows, 'v')).toBe('text');
  });

  it('returns "number" for a fully numeric column', () => {
    const rows = PEOPLE.map(r => ({ score: r.score }));
    expect(detectColumnType(rows, 'score')).toBe('number');
  });

  it('returns "date" for ISO date column', () => {
    const rows = PEOPLE.map(r => ({ joined: r.joined }));
    expect(detectColumnType(rows, 'joined')).toBe('date');
  });

  it('returns "date" for US-format dates (MM/DD/YYYY)', () => {
    const rows = [
      { d: '01/15/2024' }, { d: '03/10/2024' }, { d: '12/01/2023' },
    ];
    expect(detectColumnType(rows, 'd')).toBe('date');
  });

  it('returns "text" for a name column', () => {
    const rows = PEOPLE.map(r => ({ name: r.name }));
    expect(detectColumnType(rows, 'name')).toBe('text');
  });

  it('samples at most the first 30 rows', () => {
    // 31 rows: first 30 are numeric, last one is 'word'
    const rows = Array.from({ length: 31 }, (_, i) =>
      ({ v: i < 30 ? String(i) : 'word' }),
    );
    // 30/30 in sample = 100% numeric → number (last row is beyond sample window)
    expect(detectColumnType(rows, 'v')).toBe('number');
  });
});

// ── buildColumnMeta ───────────────────────────────────────────────────────────

describe('buildColumnMeta', () => {
  it('returns empty object for empty rows', () => {
    expect(buildColumnMeta([])).toEqual({});
  });

  it('detects type for each column', () => {
    const meta = buildColumnMeta(PEOPLE);
    expect(meta.name.type).toBe('text');
    expect(meta.score.type).toBe('number');
    expect(meta.joined.type).toBe('date');
    expect(meta.status.type).toBe('text');
  });

  it('provides sorted unique options for text columns', () => {
    const meta = buildColumnMeta(PEOPLE);
    expect(meta.status.options).toEqual(['Active', 'Inactive']);
    expect(meta.name.options).toContain('Alice');
  });

  it('does not add options for numeric or date columns', () => {
    const meta = buildColumnMeta(PEOPLE);
    expect(meta.score.options).toBeUndefined();
    expect(meta.joined.options).toBeUndefined();
  });

  it('caps text options at 200 entries', () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({ tag: `tag-${i}` }));
    const meta = buildColumnMeta(rows);
    expect(meta.tag.options.length).toBe(200);
  });
});

// ── applyFilters ──────────────────────────────────────────────────────────────

describe('applyFilters', () => {
  it('returns all rows when no filters provided', () => {
    expect(applyFilters(PEOPLE, {})).toHaveLength(5);
    expect(applyFilters(PEOPLE)).toHaveLength(5);
  });

  it('skips inactive filters', () => {
    const filters = { score: { type: 'number', active: false, op: 'gt', value: '90' } };
    expect(applyFilters(PEOPLE, filters)).toHaveLength(5);
  });

  it('text: search filters by substring (case-insensitive)', () => {
    const filters = { name: { type: 'text', active: true, search: 'li' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('text: selected filters to exact values', () => {
    const filters = { status: { type: 'text', active: true, selected: ['Active'] } };
    const result = applyFilters(PEOPLE, filters);
    expect(result).toHaveLength(3);
    expect(result.every(r => r.status === 'Active')).toBe(true);
  });

  it('text: combined search + selected narrows further', () => {
    const filters = {
      status: { type: 'text', active: true, selected: ['Active'] },
      name:   { type: 'text', active: true, search: 'li' },
    };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('number: gt excludes values at or below threshold', () => {
    const filters = { score: { type: 'number', active: true, op: 'gt', value: '80' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('number: gte includes the boundary value', () => {
    const filters = { score: { type: 'number', active: true, op: 'gte', value: '85' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('number: lt filters below threshold', () => {
    const filters = { score: { type: 'number', active: true, op: 'lt', value: '60' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Bob']);
  });

  it('number: lte includes boundary', () => {
    const filters = { score: { type: 'number', active: true, op: 'lte', value: '60' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Bob', 'Diana']);
  });

  it('number: eq matches exact value', () => {
    const filters = { score: { type: 'number', active: true, op: 'eq', value: '73' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Eve']);
  });

  it('number: between is inclusive on both ends', () => {
    const filters = { score: { type: 'number', active: true, op: 'between', value: '60', value2: '85' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Diana', 'Eve']);
  });

  it('number: rejects non-numeric values', () => {
    const rows = [{ v: 'text' }, { v: '50' }];
    const filters = { v: { type: 'number', active: true, op: 'gt', value: '0' } };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0].v).toBe('50');
  });

  it('date: from filters out dates before range', () => {
    const filters = { joined: { type: 'date', active: true, from: '2024-01-01' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Eve']);
  });

  it('date: to filters out dates after range', () => {
    const filters = { joined: { type: 'date', active: true, to: '2024-02-01' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Diana', 'Eve']);
  });

  it('date: from + to is inclusive range', () => {
    const filters = { joined: { type: 'date', active: true, from: '2024-01-01', to: '2024-02-01' } };
    const result = applyFilters(PEOPLE, filters);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Eve']);
  });

  it('date: rejects unparseable date values', () => {
    const rows = [{ d: 'not-a-date' }, { d: '2024-01-01' }];
    const filters = { d: { type: 'date', active: true, from: '2020-01-01' } };
    expect(applyFilters(rows, filters)).toHaveLength(1);
  });
});

// ── evaluateCustomFormula ─────────────────────────────────────────────────────

describe('evaluateCustomFormula', () => {
  const rows = [
    { dept: 'Eng',  value: 10, status: 'Done'       },
    { dept: 'Eng',  value: 20, status: 'In Progress' },
    { dept: 'Eng',  value: 30, status: 'Done'        },
    { dept: 'HR',   value: 5,  status: 'Done'        },
    { dept: 'HR',   value: 15, status: 'Blocked'     },
  ];

  it('returns 0 for empty/whitespace expression', () => {
    expect(evaluateCustomFormula(rows, '')).toBe(0);
    expect(evaluateCustomFormula(rows, '   ')).toBe(0);
  });

  it('COUNT(*) returns total row count', () => {
    expect(evaluateCustomFormula(rows, 'COUNT(*)')).toBe(5);
  });

  it('COUNT(anything) also returns total row count', () => {
    expect(evaluateCustomFormula(rows, 'COUNT(value)')).toBe(5);
  });

  it('SUM(field) sums numeric values', () => {
    expect(evaluateCustomFormula(rows, 'SUM(value)')).toBe(80);
  });

  it('AVG(field) returns average', () => {
    expect(evaluateCustomFormula(rows, 'AVG(value)')).toBe(16);
  });

  it('AVERAGE(field) is an alias for AVG', () => {
    expect(evaluateCustomFormula(rows, 'AVERAGE(value)')).toBe(16);
  });

  it('MIN(field) returns minimum', () => {
    expect(evaluateCustomFormula(rows, 'MIN(value)')).toBe(5);
  });

  it('MAX(field) returns maximum', () => {
    expect(evaluateCustomFormula(rows, 'MAX(value)')).toBe(30);
  });

  it('COUNTIF exact match', () => {
    expect(evaluateCustomFormula(rows, 'COUNTIF(status, "Done")')).toBe(3);
  });

  it('COUNTIF is case-insensitive', () => {
    expect(evaluateCustomFormula(rows, 'COUNTIF(status, "done")')).toBe(3);
  });

  it('COUNTIF wildcard match (*val*)', () => {
    expect(evaluateCustomFormula(rows, 'COUNTIF(status, "*Progress*")')).toBe(1);
  });

  it('arithmetic on formula results', () => {
    // SUM(value) / COUNT(*) = 80 / 5 = 16
    expect(evaluateCustomFormula(rows, 'SUM(value) / COUNT(*)')).toBe(16);
  });

  it('arithmetic with parentheses', () => {
    expect(evaluateCustomFormula(rows, '(SUM(value) + COUNT(*)) / 2')).toBe(42.5);
  });

  it('returns 0 for unknown function (safety guard)', () => {
    expect(evaluateCustomFormula(rows, 'UNKNOWN(value)')).toBe(0);
  });

  it('returns 0 when expression still contains non-math chars after substitution', () => {
    expect(evaluateCustomFormula(rows, 'alert(1)')).toBe(0);
  });

  it('handles Hebrew column names', () => {
    const heRows = [
      { 'סטטוס': 'בוצע' },
      { 'סטטוס': 'בוצע' },
      { 'סטטוס': 'בתהליך' },
    ];
    expect(evaluateCustomFormula(heRows, 'COUNTIF(סטטוס, "בוצע")')).toBe(2);
  });

  it('returns 0 on eval errors (divide by zero expression)', () => {
    // 1/0 = Infinity which fails the isFinite check → 0
    expect(evaluateCustomFormula(rows, 'SUM(value) / 0')).toBe(0);
  });

  it('rounds to 3 decimal places', () => {
    const threeRows = [{ v: 1 }, { v: 1 }, { v: 1 }];
    // AVG of [1,1,1] = 1.000 exact
    expect(evaluateCustomFormula(threeRows, 'AVG(v)')).toBe(1);
  });
});

// ── aggregateData ─────────────────────────────────────────────────────────────

describe('aggregateData', () => {
  const rows = [
    { group: 'A', val: 10, status: 'Done'       },
    { group: 'A', val: 20, status: 'In Progress' },
    { group: 'A', val: 30, status: 'Done'        },
    { group: 'B', val: 5,  status: 'Done'        },
    { group: 'B', val: 15, status: 'Blocked'     },
  ];

  it('returns empty array for empty rows', () => {
    expect(aggregateData([], 'group', 'val', 'count')).toEqual([]);
  });

  it('count formula groups and counts rows', () => {
    const result = aggregateData(rows, 'group', 'val', 'count');
    const a = result.find(r => r.x === 'A');
    const b = result.find(r => r.x === 'B');
    expect(a).toMatchObject({ x: 'A', y: 3, count: 3 });
    expect(b).toMatchObject({ x: 'B', y: 2, count: 2 });
  });

  it('sum formula sums the yField per group', () => {
    const result = aggregateData(rows, 'group', 'val', 'sum');
    expect(result.find(r => r.x === 'A').y).toBe(60);
    expect(result.find(r => r.x === 'B').y).toBe(20);
  });

  it('average formula computes mean per group', () => {
    const result = aggregateData(rows, 'group', 'val', 'average');
    expect(result.find(r => r.x === 'A').y).toBe(20);
    expect(result.find(r => r.x === 'B').y).toBe(10);
  });

  it('min formula returns minimum per group', () => {
    const result = aggregateData(rows, 'group', 'val', 'min');
    expect(result.find(r => r.x === 'A').y).toBe(10);
    expect(result.find(r => r.x === 'B').y).toBe(5);
  });

  it('max formula returns maximum per group', () => {
    const result = aggregateData(rows, 'group', 'val', 'max');
    expect(result.find(r => r.x === 'A').y).toBe(30);
    expect(result.find(r => r.x === 'B').y).toBe(15);
  });

  it('unknown formula falls back to count', () => {
    const result = aggregateData(rows, 'group', 'val', 'bogus');
    expect(result.find(r => r.x === 'A').y).toBe(3);
  });

  it('results are sorted alphabetically by x', () => {
    const mixed = [
      { g: 'C', v: 1 }, { g: 'A', v: 2 }, { g: 'B', v: 3 },
    ];
    const result = aggregateData(mixed, 'g', 'v', 'count');
    expect(result.map(r => r.x)).toEqual(['A', 'B', 'C']);
  });

  it('numeric x-labels are sorted numerically', () => {
    const mixed = [
      { g: '10', v: 1 }, { g: '2', v: 1 }, { g: '1', v: 1 },
    ];
    const result = aggregateData(mixed, 'g', 'v', 'count');
    expect(result.map(r => r.x)).toEqual(['1', '2', '10']);
  });

  it('groups null/undefined values under "(blank)"', () => {
    const withBlanks = [
      { group: null,      val: 1 },
      { group: undefined, val: 2 },
      { group: 'A',       val: 3 },
    ];
    const result = aggregateData(withBlanks, 'group', 'val', 'count');
    const blank = result.find(r => r.x === '(blank)');
    // null and undefined both map to '(blank)' via the ?? operator
    expect(blank?.count).toBe(2);
  });

  it('custom formula uses evaluateCustomFormula per group', () => {
    const result = aggregateData(rows, 'group', 'val', 'custom', 'COUNT(*)');
    expect(result.find(r => r.x === 'A').y).toBe(3);
    expect(result.find(r => r.x === 'B').y).toBe(2);
  });

  describe('countif_ratio with xField', () => {
    const extra = {
      countifField: 'status', countifOp: 'eq', countifValue: 'Done',
      denomMode: 'total',
    };

    it('returns percentage of matching rows per group', () => {
      const result = aggregateData(rows, 'group', null, 'countif_ratio', '', extra);
      const a = result.find(r => r.x === 'A');
      const b = result.find(r => r.x === 'B');
      expect(a.y).toBeCloseTo(66.67, 1); // 2/3
      expect(b.y).toBe(50);              // 1/2
    });

    it('countif_ratio with condition denominator', () => {
      const extraCond = {
        countifField: 'status', countifOp: 'eq', countifValue: 'Done',
        denomMode: 'condition', denomField: 'status', denomOp: 'not_eq', denomValue: 'Blocked',
      };
      const result = aggregateData(rows, 'group', null, 'countif_ratio', '', extraCond);
      // Group A (3 rows: Done, In Progress, Done):
      //   numRows  = [Done, Done] = 2
      //   denomRows = not_eq Blocked = [Done, In Progress, Done] = 3 → 66.67%
      // Group B (2 rows: Done, Blocked):
      //   numRows  = [Done] = 1
      //   denomRows = not_eq Blocked = [Done] = 1 → 100%
      const a = result.find(r => r.x === 'A');
      const b = result.find(r => r.x === 'B');
      expect(a.y).toBeCloseTo(66.67, 0);
      expect(b.y).toBeCloseTo(100, 0);
    });
  });

  describe('countif_ratio without xField (global gauge mode)', () => {
    it('returns a single "Total" entry', () => {
      const extra = {
        countifField: 'status', countifOp: 'eq', countifValue: 'Done',
        denomMode: 'total',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result).toHaveLength(1);
      expect(result[0].x).toBe('Total');
      expect(result[0].y).toBeCloseTo(60, 0); // 3/5
      expect(result[0].count).toBe(5);
    });

    it('returns 0% when denominator is 0', () => {
      const extra = {
        countifField: 'status', countifOp: 'eq', countifValue: 'Done',
        denomMode: 'condition', denomField: 'status', denomOp: 'eq', denomValue: 'NonExistent',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result[0].y).toBe(0);
    });
  });

  it('returns empty for no xField and non-countif_ratio formula', () => {
    expect(aggregateData(rows, '', 'val', 'sum')).toEqual([]);
  });

  describe('rowMatchesCondition operators', () => {
    it('contains operator', () => {
      const extra = {
        countifField: 'status', countifOp: 'contains', countifValue: 'Prog',
        denomMode: 'total',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result[0].y).toBeCloseTo(20, 0); // 1/5
    });

    it('not_eq operator', () => {
      const extra = {
        countifField: 'status', countifOp: 'not_eq', countifValue: 'Done',
        denomMode: 'total',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result[0].y).toBeCloseTo(40, 0); // 2/5
    });

    it('starts_with operator', () => {
      const extra = {
        countifField: 'status', countifOp: 'starts_with', countifValue: 'In',
        denomMode: 'total',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result[0].y).toBeCloseTo(20, 0); // 1/5
    });

    it('comma-separated OR values', () => {
      const extra = {
        countifField: 'status', countifOp: 'eq', countifValue: 'Done, Blocked',
        denomMode: 'total',
      };
      const result = aggregateData(rows, '', null, 'countif_ratio', '', extra);
      expect(result[0].y).toBeCloseTo(80, 0); // 4/5
    });
  });
});

// ── buildChartData ────────────────────────────────────────────────────────────

describe('buildChartData', () => {
  const rows = [
    { cat: 'X', n: 10, status: 'Done'  },
    { cat: 'X', n: 20, status: 'Open'  },
    { cat: 'Y', n: 30, status: 'Done'  },
  ];

  it('returns empty array when no xField and not countif_ratio', () => {
    expect(buildChartData(rows, { xField: '', formula: 'count' })).toEqual([]);
  });

  it('groups and aggregates for a basic chart', () => {
    const result = buildChartData(rows, { xField: 'cat', yField: 'n', formula: 'sum' });
    expect(result.find(r => r.x === 'X').y).toBe(30);
    expect(result.find(r => r.x === 'Y').y).toBe(30);
  });

  it('applies filters before aggregation', () => {
    const config = {
      xField: 'cat', yField: 'n', formula: 'count',
      filters: { status: { type: 'text', active: true, selected: ['Done'] } },
    };
    const result = buildChartData(rows, config);
    expect(result.find(r => r.x === 'X').y).toBe(1);
    expect(result.find(r => r.x === 'Y').y).toBe(1);
  });

  it('gauge + countif_ratio sets xField to empty string', () => {
    const config = {
      chartType: 'gauge', formula: 'countif_ratio',
      xField: 'cat',
      countifField: 'status', countifOp: 'eq', countifValue: 'Done',
      denomMode: 'total',
    };
    const result = buildChartData(rows, config);
    // Should produce a single global value, not grouped by cat
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe('Total');
  });
});

// ── getUniqueValues ───────────────────────────────────────────────────────────

describe('getUniqueValues', () => {
  it('returns sorted unique string values', () => {
    const rows = [{ s: 'B' }, { s: 'A' }, { s: 'A' }, { s: 'C' }];
    expect(getUniqueValues(rows, 's')).toEqual(['A', 'B', 'C']);
  });

  it('filters blank/empty values', () => {
    const rows = [{ s: 'A' }, { s: '' }, { s: null }, { s: undefined }];
    expect(getUniqueValues(rows, 's')).toEqual(['A']);
  });

  it('returns empty array for all-blank column', () => {
    const rows = [{ s: '' }, { s: null }];
    expect(getUniqueValues(rows, 's')).toEqual([]);
  });

  it('coerces numbers to strings', () => {
    const rows = [{ v: 1 }, { v: 2 }, { v: 1 }];
    expect(getUniqueValues(rows, 'v')).toEqual(['1', '2']);
  });
});
