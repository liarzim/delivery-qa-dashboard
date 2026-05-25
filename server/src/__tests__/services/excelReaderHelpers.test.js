'use strict';

// Mock db/init so importing excelReader doesn't try to open the real SQLite DB
jest.mock('../../db/init', () => ({ getDb: jest.fn() }));

const { _testHelpers } = require('../../services/excelReader');
const { safeNum, pct, median, extractPI, getSquad, isDone, isCommitted } = _testHelpers;

// ── safeNum ───────────────────────────────────────────────────────────────────

describe('safeNum', () => {
  it('parses numeric strings', () => {
    expect(safeNum('42')).toBe(42);
    expect(safeNum('3.14')).toBeCloseTo(3.14);
  });

  it('returns the number as-is when already numeric', () => {
    expect(safeNum(100)).toBe(100);
    expect(safeNum(0)).toBe(0);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(safeNum('abc')).toBe(0);
    expect(safeNum('')).toBe(0);
  });

  it('returns 0 for null and undefined', () => {
    expect(safeNum(null)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(safeNum(NaN)).toBe(0);
  });
});

// ── pct ───────────────────────────────────────────────────────────────────────

describe('pct', () => {
  it('returns percentage rounded to one decimal', () => {
    expect(pct(3, 10)).toBe(30);
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(7, 8)).toBe(87.5);
  });

  it('returns 0 when denominator is 0', () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 0)).toBe(0);
  });

  it('returns 0 when numerator is 0', () => {
    expect(pct(0, 10)).toBe(0);
  });

  it('returns 100 when num equals den', () => {
    expect(pct(10, 10)).toBe(100);
  });

  it('returns 0 for falsy denominator (null, undefined)', () => {
    expect(pct(5, null)).toBe(0);
    expect(pct(5, undefined)).toBe(0);
  });
});

// ── median ────────────────────────────────────────────────────────────────────

describe('median', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns the single element for length-1 array', () => {
    expect(median([7])).toBe(7);
  });

  it('returns middle value for odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
    expect(median([5, 1, 3])).toBe(3); // sorts before computing
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 20])).toBe(15);
  });

  it('does not mutate the original array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

// ── extractPI ─────────────────────────────────────────────────────────────────

describe('extractPI', () => {
  it('returns PI field directly', () => {
    expect(extractPI({ PI: 'PI24.1' })).toBe('PI24.1');
  });

  it('trims whitespace from PI field', () => {
    expect(extractPI({ PI: '  PI24  ' })).toBe('PI24');
  });

  it('uses lowercase pi field as fallback', () => {
    expect(extractPI({ pi: 'pi1' })).toBe('pi1');
  });

  it('uses Sprint field as fallback', () => {
    expect(extractPI({ Sprint: 'Sprint 5' })).toBe('Sprint 5');
  });

  it('extracts PI from Iteration Path via regex', () => {
    expect(extractPI({ 'Iteration Path': 'Team\\PI24\\Sprint1' })).toBe('PI24');
    expect(extractPI({ 'Iteration Path': 'SomePI12Something' })).toBe('PI12');
  });

  it('extracts PI from IterationPath (no space)', () => {
    expect(extractPI({ IterationPath: 'PI99\\Sprint2' })).toBe('PI99');
  });

  it('is case-insensitive for PI in Iteration Path', () => {
    expect(extractPI({ 'Iteration Path': 'pi5' })).toBe('PI5');
  });

  it('returns "Unknown" when no PI info found', () => {
    expect(extractPI({})).toBe('Unknown');
    expect(extractPI({ 'Iteration Path': 'NoMatch' })).toBe('Unknown');
  });
});

// ── getSquad ──────────────────────────────────────────────────────────────────

describe('getSquad', () => {
  it('prefers "Leading Squad" field', () => {
    expect(getSquad({ 'Leading Squad': 'Alpha', Squad: 'Beta' })).toBe('Alpha');
  });

  it('falls back to "Squad"', () => {
    expect(getSquad({ Squad: 'Beta' })).toBe('Beta');
  });

  it('falls back to "Team"', () => {
    expect(getSquad({ Team: 'Gamma' })).toBe('Gamma');
  });

  it('falls back to Hebrew "שם קבוצה"', () => {
    expect(getSquad({ 'שם קבוצה': 'קבוצה א' })).toBe('קבוצה א');
  });

  it('returns "Unknown" when no squad field present', () => {
    expect(getSquad({})).toBe('Unknown');
  });
});

// ── isDone ────────────────────────────────────────────────────────────────────

describe('isDone', () => {
  it('recognizes "Done" (case-insensitive)', () => {
    expect(isDone({ State: 'Done' })).toBe(true);
    expect(isDone({ State: 'done' })).toBe(true);
    expect(isDone({ State: 'DONE' })).toBe(true);
  });

  it('recognizes "Closed"', () => {
    expect(isDone({ State: 'Closed' })).toBe(true);
    expect(isDone({ Status: 'closed' })).toBe(true);
  });

  it('recognizes "Resolved"', () => {
    expect(isDone({ State: 'Resolved' })).toBe(true);
  });

  it('recognizes Hebrew "בוצע"', () => {
    expect(isDone({ 'סטטוס': 'בוצע' })).toBe(true);
  });

  it('uses Status field as fallback', () => {
    expect(isDone({ Status: 'Done' })).toBe(true);
  });

  it('returns false for in-progress states', () => {
    expect(isDone({ State: 'In Progress' })).toBe(false);
    expect(isDone({ State: 'Active' })).toBe(false);
    expect(isDone({ State: 'New' })).toBe(false);
  });

  it('returns false for empty row', () => {
    expect(isDone({})).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    expect(isDone({ State: '  done  ' })).toBe(true);
  });
});

// ── isCommitted ───────────────────────────────────────────────────────────────

describe('isCommitted', () => {
  it('returns true for Commited1 "yes" (case-insensitive)', () => {
    expect(isCommitted({ Commited1: 'yes' })).toBe(true);
    expect(isCommitted({ Commited1: 'Yes' })).toBe(true);
    expect(isCommitted({ Commited1: 'YES' })).toBe(true);
  });

  it('returns true for Commited1 "true"', () => {
    expect(isCommitted({ Commited1: 'true' })).toBe(true);
  });

  it('returns true for Commited1 "1"', () => {
    expect(isCommitted({ Commited1: '1' })).toBe(true);
  });

  it('returns false for Commited1 "no"', () => {
    expect(isCommitted({ Commited1: 'no' })).toBe(false);
  });

  it('returns false for Commited1 any value other than yes/true/1', () => {
    expect(isCommitted({ Commited1: 'maybe' })).toBe(false);
  });

  it('uses Committed field when Commited1 is absent', () => {
    expect(isCommitted({ Committed: 'Committed' })).toBe(true);
  });

  it('returns false when Committed is "no"', () => {
    expect(isCommitted({ Committed: 'no' })).toBe(false);
  });

  it('returns false when Committed is "not committed" (case-insensitive)', () => {
    expect(isCommitted({ Committed: 'Not Committed' })).toBe(false);
    expect(isCommitted({ Committed: 'not committed' })).toBe(false);
  });

  it('returns false when Committed is "false"', () => {
    expect(isCommitted({ Committed: 'false' })).toBe(false);
  });

  it('uses Commitment field as final fallback', () => {
    expect(isCommitted({ Commitment: 'Committed' })).toBe(true);
    expect(isCommitted({ Commitment: 'no' })).toBe(false);
  });

  it('returns false when no commitment field exists', () => {
    expect(isCommitted({})).toBe(false);
  });
});
