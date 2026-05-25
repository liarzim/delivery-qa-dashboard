import { describe, it, expect } from 'vitest';
import { runUnitTests, runLiveChecks, runAllVerifications } from './clientVerifier.js';

// ── Mock data ─────────────────────────────────────────────────────────────────

const validDelivery = {
  piMetrics: [
    { pi: 'PI1', committedRate: 85, overallRate: 75, totalFeatures: 10, totalDone: 8 },
    { pi: 'PI2', committedRate: 90, overallRate: 80, totalFeatures: 12, totalDone: 10 },
  ],
  flowMetrics: [
    { pi: 'PI1', throughput: 8 },
    { pi: 'PI2', throughput: 10 },
  ],
  summary: { avgVelocity: 9 },
};

const validQA = {
  piMetrics: [
    {
      pi: 'PI1',
      totalBugs: 20, closedBugs: 15, reopenCount: 2, rejectedCount: 1,
      reopenPct: 10, rejectedPct: 5, escapingPct: 3,
      reopenDensity: 10, escapingDensity: 5, rejectedDensity: 5,
      velocity: 25, capacity: 10,
    },
  ],
};

// ── runUnitTests ──────────────────────────────────────────────────────────────

describe('runUnitTests', () => {
  it('all built-in test cases pass', () => {
    const results = runUnitTests();
    const failures = results.filter(t => !t.pass).map(t => t.name);
    expect(failures).toEqual([]);
  });

  it('returns objects with expected shape', () => {
    const results = runUnitTests();
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('formula');
    expect(first).toHaveProperty('pass');
    expect(first).toHaveProperty('cases');
    expect(first).toHaveProperty('caseCount');
  });

  it('covers Utility, Delivery, QA, and Logic categories', () => {
    const results = runUnitTests();
    const categories = new Set(results.map(t => t.category));
    expect(categories).toContain('Utility');
    expect(categories).toContain('Delivery');
    expect(categories).toContain('QA');
    expect(categories).toContain('Logic');
  });

  it('each test has at least one case', () => {
    const results = runUnitTests();
    results.forEach(t => {
      expect(t.caseCount).toBeGreaterThan(0);
      expect(t.cases.length).toBe(t.caseCount);
    });
  });

  it('each individual case has the expected fields', () => {
    const results = runUnitTests();
    results.forEach(t => {
      t.cases.forEach(c => {
        expect(c).toHaveProperty('inputs');
        expect(c).toHaveProperty('expected');
        expect(c).toHaveProperty('actual');
        expect(c).toHaveProperty('pass');
      });
    });
  });
});

// ── runLiveChecks ─────────────────────────────────────────────────────────────

describe('runLiveChecks', () => {
  it('returns empty array when delivery is null', () => {
    expect(runLiveChecks(null, validQA)).toEqual([]);
  });

  it('returns empty array when qa is null', () => {
    expect(runLiveChecks(validDelivery, null)).toEqual([]);
  });

  it('returns empty array when both are null', () => {
    expect(runLiveChecks(null, null)).toEqual([]);
  });

  it('returns checks for valid delivery + QA data', () => {
    const checks = runLiveChecks(validDelivery, validQA);
    expect(checks.length).toBeGreaterThan(0);
  });

  it('all checks pass for valid data', () => {
    const checks = runLiveChecks(validDelivery, validQA);
    const failures = checks.filter(c => !c.pass).map(c => c.name);
    expect(failures).toEqual([]);
  });

  it('each check has required fields', () => {
    const checks = runLiveChecks(validDelivery, validQA);
    checks.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('category');
      expect(c).toHaveProperty('pass');
      expect(c).toHaveProperty('value');
    });
  });

  it('detects committed/overall rate > 100%', () => {
    const bad = {
      ...validDelivery,
      piMetrics: [{ pi: 'PI1', committedRate: 110, overallRate: 75, totalFeatures: 10, totalDone: 8 }],
    };
    const checks = runLiveChecks(bad, validQA);
    const rateCheck = checks.find(c => c.name.includes('committed/overall'));
    expect(rateCheck?.pass).toBe(false);
  });

  it('detects negative feature counts', () => {
    const bad = {
      ...validDelivery,
      piMetrics: [{ pi: 'PI1', committedRate: 80, overallRate: 75, totalFeatures: -1, totalDone: 0 }],
    };
    const checks = runLiveChecks(bad, validQA);
    const negCheck = checks.find(c => c.name.includes('negative feature'));
    expect(negCheck?.pass).toBe(false);
  });

  it('detects done > total features', () => {
    const bad = {
      ...validDelivery,
      piMetrics: [{ pi: 'PI1', committedRate: 80, overallRate: 75, totalFeatures: 5, totalDone: 8 }],
    };
    const checks = runLiveChecks(bad, validQA);
    const doneCheck = checks.find(c => c.name.includes('Done count'));
    expect(doneCheck?.pass).toBe(false);
  });

  it('detects negative throughput', () => {
    const bad = {
      ...validDelivery,
      flowMetrics: [{ pi: 'PI1', throughput: -1 }],
    };
    const checks = runLiveChecks(bad, validQA);
    const throughputCheck = checks.find(c => c.name.includes('throughput'));
    expect(throughputCheck?.pass).toBe(false);
  });

  it('detects QA percentage > 100%', () => {
    const bad = {
      ...validQA,
      piMetrics: [{
        ...validQA.piMetrics[0],
        reopenPct: 120,
      }],
    };
    const checks = runLiveChecks(validDelivery, bad);
    const pctCheck = checks.find(c => c.name.includes('QA percentages'));
    expect(pctCheck?.pass).toBe(false);
  });

  it('detects closed bugs > total bugs', () => {
    const bad = {
      ...validQA,
      piMetrics: [{
        ...validQA.piMetrics[0],
        totalBugs: 10, closedBugs: 15,
      }],
    };
    const checks = runLiveChecks(validDelivery, bad);
    const closedCheck = checks.find(c => c.name.includes('Closed bugs'));
    expect(closedCheck?.pass).toBe(false);
  });

  it('skips delivery checks when piMetrics is empty', () => {
    const noPI = { piMetrics: [], flowMetrics: [], summary: {} };
    const checks = runLiveChecks(noPI, validQA);
    // Should not throw; QA checks still run
    expect(Array.isArray(checks)).toBe(true);
  });
});

// ── runAllVerifications ───────────────────────────────────────────────────────

describe('runAllVerifications', () => {
  it('returns liveError when data is null', () => {
    const { summary } = runAllVerifications(null, null);
    expect(summary.liveError).toBeTruthy();
  });

  it('liveError is null for valid data', () => {
    const { summary } = runAllVerifications(validDelivery, validQA);
    expect(summary.liveError).toBeNull();
  });

  it('allPass is true when all unit tests and live checks pass', () => {
    const { summary } = runAllVerifications(validDelivery, validQA);
    expect(summary.allPass).toBe(true);
  });

  it('allPass is false when a live check fails', () => {
    const bad = {
      ...validDelivery,
      piMetrics: [{ pi: 'PI1', committedRate: 110, overallRate: 75, totalFeatures: 10, totalDone: 8 }],
    };
    const { summary } = runAllVerifications(bad, validQA);
    expect(summary.allPass).toBe(false);
  });

  it('summary counts match the actual arrays', () => {
    const { unitTests, liveChecks, summary } = runAllVerifications(validDelivery, validQA);
    expect(summary.unitTests.total).toBe(unitTests.length);
    expect(summary.liveChecks.total).toBe(liveChecks.length);
    expect(summary.unitTests.passed).toBe(unitTests.filter(t => t.pass).length);
    expect(summary.liveChecks.passed).toBe(liveChecks.filter(c => c.pass).length);
  });

  it('returns unitTests and liveChecks arrays', () => {
    const result = runAllVerifications(validDelivery, validQA);
    expect(Array.isArray(result.unitTests)).toBe(true);
    expect(Array.isArray(result.liveChecks)).toBe(true);
  });
});
