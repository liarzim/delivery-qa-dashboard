/**
 * Client-side formula verifier.
 * Runs unit tests (known inputs/outputs) and live integrity checks against
 * the currently loaded DataContext data — all in the browser, no server needed.
 */
import { getTrafficLight } from './thresholds';

// ── Pure formula helpers (identical to browserExcelReader / server) ────────────
function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

// ── Unit test runner ──────────────────────────────────────────────────────────
function runCase(fn, input, expected) {
  try {
    const actual = Array.isArray(input) ? fn(...input) : fn(input);
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    return { inputs: JSON.stringify(input), expected, actual, pass };
  } catch (err) {
    return { inputs: JSON.stringify(input), expected, actual: null, pass: false, error: err.message };
  }
}

function makeTest(id, name, category, formula, fn, cases) {
  const results = cases.map(([input, expected]) => runCase(fn, input, expected));
  return {
    id, name, category, formula,
    caseCount: results.length,
    pass: results.every(c => c.pass),
    cases: results,
  };
}

// ── All unit tests ────────────────────────────────────────────────────────────
export function runUnitTests() {
  return [
    // ── Utility ──────────────────────────────────────────────────────────────
    makeTest('pct', 'pct(num, den)', 'Utility',
      'Math.round((num/den)*1000)/10',
      (num, den) => pct(num, den),
      [
        [[3, 10],   30],
        [[1, 3],    33.3],
        [[0, 0],    0],
        [[10, 10],  100],
        [[7, 8],    87.5],
      ]
    ),

    makeTest('median', 'median(arr)', 'Utility',
      'sorted middle value (average of two middles when even)',
      (arr) => median(arr),
      [
        [[[1, 3, 5]],        3],
        [[[1, 2, 3, 4]],     2.5],
        [[[]],               0],
        [[[7]],              7],
        [[[10, 20]],         15],
      ]
    ),

    // ── Delivery ─────────────────────────────────────────────────────────────
    makeTest('committedRate', 'Committed Rate', 'Delivery',
      'pct(committedDone, totalCommitted)',
      (done, total) => pct(done, total),
      [
        [[8, 10],  80],
        [[10, 10], 100],
        [[0, 5],   0],
        [[3, 4],   75],
      ]
    ),

    makeTest('uncommittedRate', 'Uncommitted Rate', 'Delivery',
      'pct(uncommittedDone, totalUncommitted)',
      (done, total) => pct(done, total),
      [
        [[3, 6],   50],
        [[0, 0],   0],
        [[5, 5],   100],
      ]
    ),

    makeTest('overallRate', 'Overall Rate', 'Delivery',
      'pct(totalDone, totalFeatures)',
      (done, total) => pct(done, total),
      [
        [[11, 16], 68.8],
        [[0, 10],  0],
        [[10, 10], 100],
      ]
    ),

    makeTest('avgVelocity', 'Avg Velocity', 'Delivery',
      'Math.round(totalThroughput / periodCount)',
      (throughput, periods) => Math.round(throughput / (periods || 1)),
      [
        [[120, 6],  20],
        [[45, 3],   15],
        [[0, 5],    0],
        [[100, 1],  100],
      ]
    ),

    makeTest('medianFlowTime', 'Median Flow Time', 'Delivery',
      'median(durations)',
      (arr) => Math.round(median(arr)),
      [
        [[[5, 10, 15]],      10],
        [[[3, 7, 9, 13]],    8],
        [[[]],               0],
      ]
    ),

    // ── QA ───────────────────────────────────────────────────────────────────
    makeTest('capacity', 'QA Capacity', 'QA',
      'velocity / 2.5',
      (velocity) => Math.round((velocity / 2.5) * 10) / 10,
      [
        [[25],  10],
        [[50],  20],
        [[0],   0],
        [[30],  12],
      ]
    ),

    makeTest('reopenPct', 'Reopen %', 'QA',
      'pct(reopenCount, closedBugs)',
      (count, closed) => pct(count, closed),
      [
        [[5, 50],  10],
        [[0, 20],  0],
        [[3, 3],   100],
        [[2, 7],   28.6],
      ]
    ),

    makeTest('rejectedPct', 'Rejected %', 'QA',
      'pct(rejectedCount, totalBugs)',
      (count, total) => pct(count, total),
      [
        [[4, 40],  10],
        [[0, 10],  0],
        [[1, 3],   33.3],
      ]
    ),

    makeTest('escapingPct', 'Escaping %', 'QA',
      'pct(escapingCritical, prevPITotalCritical)',
      (escaping, prevTotal) => pct(escaping, prevTotal),
      [
        [[2, 20],  10],
        [[0, 15],  0],
        [[5, 10],  50],
      ]
    ),

    makeTest('reopenDensity', 'Reopen Density', 'QA',
      'pct(reopenCount, capacity)',
      (count, cap) => (cap ? pct(count, cap) : 0),
      [
        [[2, 10],  20],
        [[0, 10],  0],
        [[3, 0],   0],
        [[5, 20],  25],
      ]
    ),

    makeTest('escapingDensity', 'Escaping Density', 'QA',
      'pct(escapingCritical, capacity)',
      (count, cap) => (cap ? pct(count, cap) : 0),
      [
        [[1, 10],  10],
        [[0, 10],  0],
        [[3, 0],   0],
      ]
    ),

    // ── Logic ────────────────────────────────────────────────────────────────
    makeTest('trafficLightHigh', 'Traffic Light (higher = better)', 'Logic',
      'value >= yellow → green; >= red → yellow; else red',
      (value, yellow, red) => getTrafficLight(value, yellow, red, true),
      [
        [[85, 70, 50],   'green'],
        [[65, 70, 50],   'yellow'],
        [[40, 70, 50],   'red'],
        [[70, 70, 50],   'green'],
        [[50, 70, 50],   'yellow'],
      ]
    ),

    makeTest('trafficLightLow', 'Traffic Light (lower = better)', 'Logic',
      'value <= yellow → green; <= red → yellow; else red',
      (value, yellow, red) => getTrafficLight(value, yellow, red, false),
      [
        [[5, 10, 20],    'green'],
        [[15, 10, 20],   'yellow'],
        [[25, 10, 20],   'red'],
        [[10, 10, 20],   'green'],
        [[20, 10, 20],   'yellow'],
      ]
    ),
  ];
}

// ── Live data integrity checks ────────────────────────────────────────────────
export function runLiveChecks(delivery, qa) {
  const checks = [];
  let id = 0;

  function check(name, category, formula, pass, value, note = null) {
    checks.push({ id: `live-${++id}`, name, category, formula, pass, value: String(value), note });
  }

  if (!delivery || !qa) {
    return [];
  }

  const { piMetrics: dPI = [], flowMetrics = [], summary: dSum = {} } = delivery;
  const { piMetrics: qPI = [] } = qa;

  // Delivery checks
  if (dPI.length > 0) {
    const allRatesValid = dPI.every(p =>
      p.committedRate >= 0 && p.committedRate <= 100 &&
      p.overallRate   >= 0 && p.overallRate   <= 100
    );
    check(
      'All committed/overall rates are 0–100%', 'Delivery',
      'committedRate ∈ [0,100], overallRate ∈ [0,100]',
      allRatesValid,
      JSON.stringify(dPI.map(p => ({ pi: p.pi, committed: p.committedRate, overall: p.overallRate }))),
    );

    const noNegativeFeatures = dPI.every(p => p.totalFeatures >= 0 && p.totalDone >= 0);
    check(
      'No negative feature counts', 'Delivery',
      'totalFeatures >= 0, totalDone >= 0',
      noNegativeFeatures,
      JSON.stringify(dPI.map(p => ({ pi: p.pi, total: p.totalFeatures, done: p.totalDone }))),
    );

    const doneLeTotal = dPI.every(p => p.totalDone <= p.totalFeatures);
    check(
      'Done count ≤ total features for all PIs', 'Delivery',
      'totalDone <= totalFeatures',
      doneLeTotal,
      JSON.stringify(dPI.map(p => ({ pi: p.pi, done: p.totalDone, total: p.totalFeatures }))),
    );
  }

  if (flowMetrics.length > 0) {
    const positiveThroughput = flowMetrics.every(p => p.throughput >= 0);
    check(
      'All throughput values are non-negative', 'Delivery',
      'throughput >= 0',
      positiveThroughput,
      JSON.stringify(flowMetrics.map(p => ({ pi: p.pi, throughput: p.throughput }))),
    );

    const avgVelOk = typeof dSum.avgVelocity === 'number' && dSum.avgVelocity >= 0;
    check(
      'Average velocity is a non-negative number', 'Delivery',
      'avgVelocity = Math.round(totalThroughput / periods)',
      avgVelOk,
      dSum.avgVelocity,
    );
  }

  // QA checks
  if (qPI.length > 0) {
    const pctsValid = qPI.every(p =>
      [p.reopenPct, p.rejectedPct, p.escapingPct].every(v => v >= 0 && v <= 100)
    );
    check(
      'All QA percentages are 0–100%', 'QA',
      'reopenPct, rejectedPct, escapingPct ∈ [0,100]',
      pctsValid,
      JSON.stringify(qPI.map(p => ({ pi: p.pi, reopen: p.reopenPct, rejected: p.rejectedPct, escaping: p.escapingPct }))),
    );

    const densitiesNonNeg = qPI.every(p =>
      p.reopenDensity >= 0 && p.escapingDensity >= 0 && p.rejectedDensity >= 0
    );
    check(
      'All QA density values are non-negative', 'QA',
      'reopenDensity >= 0, escapingDensity >= 0',
      densitiesNonNeg,
      JSON.stringify(qPI.map(p => ({ pi: p.pi, reopenD: p.reopenDensity, escapingD: p.escapingDensity }))),
    );

    const closedLeTotal = qPI.every(p => p.closedBugs <= p.totalBugs);
    check(
      'Closed bugs ≤ total bugs for all PIs', 'QA',
      'closedBugs <= totalBugs',
      closedLeTotal,
      JSON.stringify(qPI.map(p => ({ pi: p.pi, closed: p.closedBugs, total: p.totalBugs }))),
    );

    const reopenLeTotal = qPI.every(p => p.reopenCount <= p.totalBugs);
    check(
      'Reopen count ≤ total bugs for all PIs', 'QA',
      'reopenCount <= totalBugs',
      reopenLeTotal,
      JSON.stringify(qPI.map(p => ({ pi: p.pi, reopen: p.reopenCount, total: p.totalBugs }))),
    );

    const capacityOk = qPI.every(p => p.capacity > 0);
    check(
      'Capacity is positive for all PIs (velocity > 0)', 'QA',
      'capacity = velocity / 2.5 > 0',
      capacityOk,
      JSON.stringify(qPI.map(p => ({ pi: p.pi, velocity: p.velocity, capacity: p.capacity }))),
      capacityOk ? null : 'Zero velocity detected — capacity formulas will produce 0 for density metrics',
    );
  }

  return checks;
}

// ── Top-level entry ───────────────────────────────────────────────────────────
export function runAllVerifications(delivery, qa) {
  const unitTests  = runUnitTests();
  const liveChecks = runLiveChecks(delivery, qa);

  const unitPassed  = unitTests.filter(t => t.pass).length;
  const livePassed  = liveChecks.filter(c => c.pass).length;

  return {
    unitTests,
    liveChecks,
    summary: {
      allPass: unitPassed === unitTests.length && (liveChecks.length === 0 || livePassed === liveChecks.length),
      unitTests:  { total: unitTests.length,  passed: unitPassed },
      liveChecks: { total: liveChecks.length, passed: livePassed },
      liveError:  (!delivery || !qa) ? 'No data loaded — load Excel files first' : null,
    },
  };
}
