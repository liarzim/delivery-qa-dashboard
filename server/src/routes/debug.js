/**
 * Formula & Data Verification API
 * GET /api/debug/verify
 *
 * Returns two result sets:
 *  1. unitTests  — pure-function tests with known inputs / expected outputs
 *  2. liveChecks — integrity assertions run against actual Excel data
 *
 * Admin-only.
 */
const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { processDelivery, processQA } = require('../services/excelReader');

const router = express.Router();

// ── Shared formula implementations (mirrors excelReader.js exactly) ──────────
const pct  = (num, den) => den ? Math.round((num / den) * 1000) / 10 : 0;
const safeNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
function trafficLight(value, yellowThr, redThr, higherIsBetter = false) {
  if (higherIsBetter) {
    if (value >= yellowThr) return 'green';
    if (value >= redThr)    return 'yellow';
    return 'red';
  }
  if (value <= yellowThr) return 'green';
  if (value <= redThr)    return 'yellow';
  return 'red';
}

// ── Unit test definitions ─────────────────────────────────────────────────────
const UNIT_TESTS = [
  // ── pct() utility ──
  {
    id: 'pct_basic',
    name: 'pct() — basic percentage rounding',
    category: 'Utility',
    formula: 'Math.round((num / den) × 1000) / 10',
    run() {
      const cases = [
        { num: 8,  den: 10, expected: 80.0  },
        { num: 3,  den: 20, expected: 15.0  },
        { num: 1,  den: 3,  expected: 33.3  },
        { num: 0,  den: 0,  expected: 0     },
        { num: 0,  den: 5,  expected: 0     },
        { num: 5,  den: 5,  expected: 100.0 },
      ];
      const results = cases.map(c => {
        const actual = pct(c.num, c.den);
        return { ...c, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Committed Completion Rate ──
  {
    id: 'committed_rate',
    name: 'Committed Completion Rate',
    category: 'Delivery',
    formula: 'pct(committedDone, totalCommitted)',
    run() {
      const cases = [
        { committedDone: 8,  totalCommitted: 10, expected: 80.0  },
        { committedDone: 0,  totalCommitted: 5,  expected: 0.0   },
        { committedDone: 5,  totalCommitted: 5,  expected: 100.0 },
        { committedDone: 1,  totalCommitted: 3,  expected: 33.3  },
        { committedDone: 0,  totalCommitted: 0,  expected: 0.0   },
      ];
      const results = cases.map(c => {
        const actual = pct(c.committedDone, c.totalCommitted);
        return { inputs: `done=${c.committedDone}, total=${c.totalCommitted}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Uncommitted Completion Rate ──
  {
    id: 'uncommitted_rate',
    name: 'Uncommitted Completion Rate',
    category: 'Delivery',
    formula: 'pct(uncommittedDone, totalUncommitted)',
    run() {
      const cases = [
        { uncommittedDone: 3, totalUncommitted: 7,  expected: 42.9 },
        { uncommittedDone: 0, totalUncommitted: 10, expected: 0.0  },
        { uncommittedDone: 4, totalUncommitted: 4,  expected: 100.0 },
      ];
      const results = cases.map(c => {
        const actual = pct(c.uncommittedDone, c.totalUncommitted);
        return { inputs: `done=${c.uncommittedDone}, total=${c.totalUncommitted}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Overall Completion Rate ──
  {
    id: 'overall_rate',
    name: 'Overall Completion Rate',
    category: 'Delivery',
    formula: 'pct(totalDone, totalFeatures)',
    run() {
      const cases = [
        { totalDone: 11, totalFeatures: 17, expected: 64.7 },
        { totalDone: 0,  totalFeatures: 10, expected: 0.0  },
        { totalDone: 10, totalFeatures: 10, expected: 100.0 },
      ];
      const results = cases.map(c => {
        const actual = pct(c.totalDone, c.totalFeatures);
        return { inputs: `done=${c.totalDone}, total=${c.totalFeatures}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Average Velocity ──
  {
    id: 'avg_velocity',
    name: 'Average Velocity',
    category: 'Delivery',
    formula: 'Math.round(totalThroughput / piCount)',
    run() {
      const cases = [
        { throughputs: [10, 15, 8, 12], expected: 11 },
        { throughputs: [20],             expected: 20 },
        { throughputs: [5, 5, 5, 5, 5], expected: 5  },
        { throughputs: [],               expected: 0  },
      ];
      const results = cases.map(c => {
        const total = c.throughputs.reduce((a, b) => a + b, 0);
        const count = c.throughputs.length || 1;
        const actual = Math.round(total / count);
        return { inputs: `throughputs=[${c.throughputs.join(',')}]`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Median Flow Time ──
  {
    id: 'median_flow_time',
    name: 'Median Flow Time',
    category: 'Delivery',
    formula: 'median(cycleTimes) — middle value of sorted array',
    run() {
      const cases = [
        { arr: [3, 5, 7, 9, 11], expected: 7   },
        { arr: [3, 5, 7, 9],     expected: 6   },
        { arr: [1],              expected: 1   },
        { arr: [],               expected: 0   },
        { arr: [2, 4],           expected: 3   },
      ];
      const results = cases.map(c => {
        const actual = median(c.arr);
        return { inputs: `arr=[${c.arr.join(',')}]`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Capacity ──
  {
    id: 'capacity',
    name: 'Team Capacity',
    category: 'QA',
    formula: 'velocity / 2.5',
    run() {
      const cases = [
        { velocity: 20, expected: 8.0 },
        { velocity: 25, expected: 10.0 },
        { velocity: 0,  expected: 0.0  },
        { velocity: 15, expected: 6.0  },
      ];
      const results = cases.map(c => {
        const actual = Math.round((c.velocity / 2.5) * 10) / 10;
        return { inputs: `velocity=${c.velocity}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Reopen % ──
  {
    id: 'reopen_pct',
    name: 'Reopen %',
    category: 'QA',
    formula: 'pct(reopenCount, closedBugs)',
    run() {
      const cases = [
        { reopenCount: 3, closedBugs: 20, expected: 15.0 },
        { reopenCount: 0, closedBugs: 10, expected: 0.0  },
        { reopenCount: 5, closedBugs: 5,  expected: 100.0 },
        { reopenCount: 1, closedBugs: 7,  expected: 14.3 },
      ];
      const results = cases.map(c => {
        const actual = pct(c.reopenCount, c.closedBugs);
        return { inputs: `reopen=${c.reopenCount}, closed=${c.closedBugs}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Rejected % ──
  {
    id: 'rejected_pct',
    name: 'Rejected %',
    category: 'QA',
    formula: 'pct(rejectedCount, totalBugs)',
    run() {
      const cases = [
        { rejectedCount: 2, totalBugs: 15, expected: 13.3 },
        { rejectedCount: 0, totalBugs: 20, expected: 0.0  },
        { rejectedCount: 3, totalBugs: 10, expected: 30.0 },
      ];
      const results = cases.map(c => {
        const actual = pct(c.rejectedCount, c.totalBugs);
        return { inputs: `rejected=${c.rejectedCount}, total=${c.totalBugs}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Escaping % ──
  {
    id: 'escaping_pct',
    name: 'Escaping Defect %',
    category: 'QA',
    formula: 'pct(escapingCritical, prevPICriticalTotal)',
    run() {
      const cases = [
        { escapingCritical: 2, prevTotal: 10, expected: 20.0 },
        { escapingCritical: 0, prevTotal: 10, expected: 0.0  },
        { escapingCritical: 1, prevTotal: 3,  expected: 33.3 },
        { escapingCritical: 5, prevTotal: 0,  expected: 0.0  }, // zero-safe
      ];
      const results = cases.map(c => {
        const actual = pct(c.escapingCritical, c.prevTotal);
        return { inputs: `escaping=${c.escapingCritical}, prev=${c.prevTotal}`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Reopen Density ──
  {
    id: 'reopen_density',
    name: 'Reopen Density',
    category: 'QA',
    formula: 'pct(reopenCount, capacity)  —  capacity = velocity / 2.5',
    run() {
      const cases = [
        { reopenCount: 3, velocity: 20, expected: 37.5 }, // capacity=8
        { reopenCount: 2, velocity: 25, expected: 20.0 }, // capacity=10
        { reopenCount: 0, velocity: 20, expected: 0.0  },
      ];
      const results = cases.map(c => {
        const cap = c.velocity / 2.5;
        const actual = pct(c.reopenCount, cap);
        return { inputs: `reopen=${c.reopenCount}, velocity=${c.velocity} (cap=${cap})`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Escaping Density ──
  {
    id: 'escaping_density',
    name: 'Escaping Density',
    category: 'QA',
    formula: 'pct(escapingCritical, capacity)  —  capacity = velocity / 2.5',
    run() {
      const cases = [
        { escapingCritical: 2, velocity: 20, expected: 25.0 }, // capacity=8
        { escapingCritical: 1, velocity: 25, expected: 10.0 }, // capacity=10
        { escapingCritical: 0, velocity: 20, expected: 0.0  },
      ];
      const results = cases.map(c => {
        const cap = c.velocity / 2.5;
        const actual = pct(c.escapingCritical, cap);
        return { inputs: `escaping=${c.escapingCritical}, velocity=${c.velocity} (cap=${cap})`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Traffic Light — higher is better ──
  {
    id: 'traffic_light_higher',
    name: 'Traffic Light (higher-is-better)',
    category: 'Logic',
    formula: 'value ≥ yellowThr → green | value ≥ redThr → yellow | else → red',
    run() {
      const yellowThr = 80, redThr = 60;
      const cases = [
        { value: 90, expected: 'green'  },
        { value: 80, expected: 'green'  },
        { value: 79, expected: 'yellow' },
        { value: 60, expected: 'yellow' },
        { value: 59, expected: 'red'    },
        { value: 0,  expected: 'red'    },
      ];
      const results = cases.map(c => {
        const actual = trafficLight(c.value, yellowThr, redThr, true);
        return { inputs: `value=${c.value} (yellow≥${yellowThr}, red≥${redThr})`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },

  // ── Traffic Light — lower is better ──
  {
    id: 'traffic_light_lower',
    name: 'Traffic Light (lower-is-better)',
    category: 'Logic',
    formula: 'value ≤ yellowThr → green | value ≤ redThr → yellow | else → red',
    run() {
      const yellowThr = 5, redThr = 10;
      const cases = [
        { value: 3,  expected: 'green'  },
        { value: 5,  expected: 'green'  },
        { value: 6,  expected: 'yellow' },
        { value: 10, expected: 'yellow' },
        { value: 11, expected: 'red'    },
        { value: 25, expected: 'red'    },
      ];
      const results = cases.map(c => {
        const actual = trafficLight(c.value, yellowThr, redThr, false);
        return { inputs: `value=${c.value} (yellow≤${yellowThr}, red≤${redThr})`, expected: c.expected, actual, pass: actual === c.expected };
      });
      return { cases: results, pass: results.every(r => r.pass) };
    },
  },
];

// ── Live data integrity checks ────────────────────────────────────────────────
function runLiveChecks(delivery, qa) {
  const checks = [];

  const check = (id, name, category, formula, value, assertion, note = '') => {
    const pass = assertion(value);
    checks.push({ id, name, category, formula, value: JSON.stringify(value), pass, note });
  };

  // ── Delivery checks ───────────────────────────────────────────────────────
  for (const pi of (delivery.piMetrics || [])) {
    const tag = pi.pi || pi.rawPi;

    check(`d_rates_0_100_${tag}`, `[${tag}] All rates 0–100`,
      'Delivery', 'committedRate, uncommittedRate, overallRate ∈ [0,100]',
      { committedRate: pi.committedRate, uncommittedRate: pi.uncommittedRate, overallRate: pi.overallRate },
      v => [v.committedRate, v.uncommittedRate, v.overallRate].every(r => r >= 0 && r <= 100),
    );

    check(`d_committed_bound_${tag}`, `[${tag}] committedDone ≤ totalCommitted`,
      'Delivery', 'committedDone ≤ totalCommitted',
      { committedDone: pi.committedDone, totalCommitted: pi.totalCommitted },
      v => v.committedDone <= v.totalCommitted,
    );

    check(`d_total_bound_${tag}`, `[${tag}] totalDone ≤ totalFeatures`,
      'Delivery', 'totalDone ≤ totalFeatures',
      { totalDone: pi.totalDone, totalFeatures: pi.totalFeatures },
      v => v.totalDone <= v.totalFeatures,
    );

    const recomputedCommit = pct(pi.committedDone, pi.totalCommitted);
    check(`d_commit_recompute_${tag}`, `[${tag}] committedRate consistent`,
      'Delivery', 'committedRate === pct(committedDone, totalCommitted)',
      { stored: pi.committedRate, recomputed: recomputedCommit },
      v => v.stored === v.recomputed,
      'Cross-checks the stored value against a fresh calculation',
    );

    const recomputedOverall = pct(pi.totalDone, pi.totalFeatures);
    check(`d_overall_recompute_${tag}`, `[${tag}] overallRate consistent`,
      'Delivery', 'overallRate === pct(totalDone, totalFeatures)',
      { stored: pi.overallRate, recomputed: recomputedOverall },
      v => v.stored === v.recomputed,
    );
  }

  // ── QA checks ─────────────────────────────────────────────────────────────
  for (const pi of (qa.piMetrics || [])) {
    const tag = pi.pi || pi.rawPi;

    check(`q_pcts_0_100_${tag}`, `[${tag}] All QA percentages 0–100`,
      'QA', 'reopenPct, rejectedPct, escapingPct ∈ [0,100]',
      { reopenPct: pi.reopenPct, rejectedPct: pi.rejectedPct, escapingPct: pi.escapingPct },
      v => [v.reopenPct, v.rejectedPct, v.escapingPct].every(r => r >= 0 && r <= 100),
    );

    check(`q_density_0_100_${tag}`, `[${tag}] Density metrics 0–100`,
      'QA', 'reopenDensity, escapingDensity ∈ [0,100]',
      { reopenDensity: pi.reopenDensity, escapingDensity: pi.escapingDensity },
      v => [v.reopenDensity, v.escapingDensity].every(r => r >= 0 && r <= 100),
    );

    const expectedCap = Math.round((pi.velocity / 2.5) * 10) / 10;
    check(`q_capacity_${tag}`, `[${tag}] Capacity = velocity / 2.5`,
      'QA', 'capacity === Math.round((velocity / 2.5) × 10) / 10',
      { stored: pi.capacity, velocity: pi.velocity, expected: expectedCap },
      v => v.stored === v.expected,
    );

    check(`q_reopen_bound_${tag}`, `[${tag}] reopenCount ≤ closedBugs`,
      'QA', 'reopenCount ≤ closedBugs',
      { reopenCount: pi.reopenCount, closedBugs: pi.closedBugs },
      v => v.reopenCount <= v.closedBugs,
    );

    const recomputedReopen = pct(pi.reopenCount, pi.closedBugs);
    check(`q_reopen_recompute_${tag}`, `[${tag}] reopenPct consistent`,
      'QA', 'reopenPct === pct(reopenCount, closedBugs)',
      { stored: pi.reopenPct, recomputed: recomputedReopen },
      v => v.stored === v.recomputed,
    );

    const recomputedRejected = pct(pi.rejectedCount, pi.totalBugs);
    check(`q_rejected_recompute_${tag}`, `[${tag}] rejectedPct consistent`,
      'QA', 'rejectedPct === pct(rejectedCount, totalBugs)',
      { stored: pi.rejectedPct, recomputed: recomputedRejected },
      v => v.stored === v.recomputed,
    );
  }

  // ── Summary checks ────────────────────────────────────────────────────────
  const flowMetrics = delivery.flowMetrics || [];
  const totalTP = flowMetrics.reduce((a, b) => a + b.throughput, 0);
  const expectedVelocity = Math.round(totalTP / (flowMetrics.length || 1));
  check('d_avg_velocity', 'Average Velocity consistent',
    'Delivery', 'avgVelocity === Math.round(totalThroughput / piCount)',
    { stored: delivery.summary?.avgVelocity, recomputed: expectedVelocity, piCount: flowMetrics.length },
    v => v.stored === v.recomputed,
  );

  return checks;
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get('/verify', requireAuth, requireAdmin, (req, res) => {
  // 1. Run unit tests
  const unitTests = UNIT_TESTS.map(t => {
    try {
      const result = t.run();
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        formula: t.formula,
        pass: result.pass,
        cases: result.cases,
        caseCount: (result.cases || []).length,
        failedCases: (result.cases || []).filter(c => !c.pass),
      };
    } catch (err) {
      return { id: t.id, name: t.name, category: t.category, formula: t.formula,
        pass: false, cases: [], error: err.message };
    }
  });

  // 2. Run live checks (best-effort — missing Excel files → empty array)
  let liveChecks = [];
  let liveError = null;
  try {
    const delivery = processDelivery();
    const qa       = processQA();
    liveChecks     = runLiveChecks(delivery, qa);
  } catch (err) {
    liveError = err.message;
  }

  const unitPass = unitTests.every(t => t.pass);
  const livePass = liveChecks.length === 0 || liveChecks.every(c => c.pass);

  res.json({
    summary: {
      unitTests:  { total: unitTests.length,  passed: unitTests.filter(t => t.pass).length },
      liveChecks: { total: liveChecks.length, passed: liveChecks.filter(c => c.pass).length },
      allPass: unitPass && livePass,
      liveError,
    },
    unitTests,
    liveChecks,
  });
});

module.exports = router;
