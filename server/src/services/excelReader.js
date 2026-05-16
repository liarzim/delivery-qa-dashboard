const XLSX = require('xlsx');
const path = require('path');
const { getDb } = require('../db/init');

function getSettings() {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const s = {};
    for (const { key, value } of rows) s[key] = value;
    return s;
  } finally {
    db.close();
  }
}

// Try sheet names in order, fall back to first sheet
function readSheet(filePath, ...sheetNames) {
  try {
    const wb = XLSX.readFile(filePath);
    for (const name of sheetNames) {
      if (!name) continue;
      const ws = wb.Sheets[name];
      if (ws) return XLSX.utils.sheet_to_json(ws, { defval: null });
    }
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  } catch {
    return [];
  }
}

function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

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

function extractPI(row) {
  const direct = row['PI'] || row['pi'] || row['Sprint'];
  if (direct) return String(direct).trim();
  const iterPath = row['Iteration Path'] || row['IterationPath'] || '';
  const match = String(iterPath).match(/PI(\d+)/i);
  return match ? 'PI' + match[1] : 'Unknown';
}

function getSquad(row) {
  return row['Leading Squad'] || row['Squad'] || row['Team'] ||
    row['שם קבוצה'] || 'Unknown';
}

function isDone(row) {
  const v = String(row['State'] || row['Status'] || row['סטטוס'] || '').toLowerCase().trim();
  return v === 'done' || v === 'closed' || v === 'resolved' || v === 'בוצע';
}

function isCommitted(row) {
  const c1 = String(row['Commited1'] || '').trim().toLowerCase();
  if (c1) return c1 === 'yes' || c1 === 'true' || c1 === '1';
  const c2 = String(row['Committed'] || row['Commitment'] || '').toLowerCase();
  return c2 !== '' && c2 !== 'no' && c2 !== 'not committed' && c2 !== 'false';
}

// ─── DELIVERY ─────────────────────────────────────────────────────────────────

function processDelivery(overrides = {}) {
  const s = getSettings();
  const filePath = overrides.deliveryPath || path.join(s.excel_path, s.delivery_file);
  const piMap = JSON.parse(s.pi_name_map || '{}');

  const commitRows = readSheet(filePath, 'סיכום התחייבות', 'Commitment Summary');
  const flowRows   = readSheet(filePath, 'מדדי FLOW', 'FLOW');

  // piMetrics commitment figures come from the "סיכום התחייבות" sheet.
  // Every row in that sheet is a committed item; done = סטטוס === 'בוצע'.
  const commitByPI = {};
  for (const row of commitRows) {
    const pi = extractPI(row);
    (commitByPI[pi] = commitByPI[pi] || []).push(row);
  }

  const isCommitDone = (row) =>
    String(row['סטטוס'] || row['Status'] || row['State'] || '').trim() === 'בוצע';

  const piMetrics = Object.keys(commitByPI).map((pi) => {
    const rows          = commitByPI[pi];
    const totalCommitted = rows.length;
    const committedDone  = rows.filter(isCommitDone).length;
    return {
      pi: piMap[pi] || pi, rawPi: pi,
      totalFeatures: totalCommitted,
      totalCommitted, committedDone,
      committedRate: pct(committedDone, totalCommitted),
    };
  });

  const flowByPI = {};
  for (const row of flowRows) {
    const pi = extractPI(row);
    (flowByPI[pi] = flowByPI[pi] || []).push(row);
  }

  const flowMetrics = Object.keys(flowByPI).map((pi) => {
    const rows      = flowByPI[pi];
    const completed = rows.filter(isDone);
    const durations = completed.map((r) => {
      const start = r['Start Date'] || r['Activated Date'] || r['StartDate'] || r['start_date'];
      const end   = r['Closed Date'] || r['EndDate']       || r['end_date']  || r['Closed_Date'];
      if (!start || !end) return null;
      const diff = (new Date(end) - new Date(start)) / 86400000;
      return isNaN(diff) ? null : Math.max(0, Math.round(diff));
    }).filter(d => d !== null);

    return {
      pi: piMap[pi] || pi, rawPi: pi,
      throughput:      completed.length,
      medianFlowTime:  Math.round(median(durations)),
      avgFlowTime:     durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      flowDistribution: {
        done:       completed.length,
        inProgress: rows.filter(r => {
          const v = String(r['State'] || r['Status'] || '').toLowerCase();
          return v.includes('progress') || v === 'active' || v === 'committed';
        }).length,
        todo: rows.filter(r => {
          const v = String(r['State'] || r['Status'] || '').toLowerCase();
          return ['to do','todo','backlog','new','proposed'].includes(v);
        }).length,
      },
    };
  });

  const totalThroughput = flowMetrics.reduce((a, b) => a + b.throughput, 0);
  return {
    piMetrics, flowMetrics,
    summary: {
      avgVelocity:     Math.round(totalThroughput / (flowMetrics.length || 1)),
      totalThroughput,
      deliveryWeight:  safeNum(s.delivery_weight),
      qualityWeight:   safeNum(s.quality_weight),
    },
  };
}

// ─── QA ───────────────────────────────────────────────────────────────────────

function processQA(overrides = {}) {
  const s = getSettings();
  const piMap = JSON.parse(s.pi_name_map || '{}');

  const bugsFilePath     = overrides.bugsPath     || path.join(s.excel_path, s.qa_bug_file);
  const escapingFilePath = overrides.escapingPath  || path.join(s.excel_path, s.qa_escaping_file);

  const bugRows      = readSheet(bugsFilePath);
  const escapingRows = readSheet(escapingFilePath);

  const isClosed = (r) => {
    const v = String(r['State'] || r['Status'] || '').toLowerCase();
    return v === 'closed' || v === 'resolved' || v === 'done';
  };
  const isReopen = (r) => {
    const v = r['Reopen'] ?? r['Reopen Count'] ?? r['ReopenCount'];
    if (v === null || v === undefined || v === '') return false;
    const n = parseFloat(v);
    return !isNaN(n) ? n > 0 : String(v).toLowerCase() === 'yes';
  };
  const isRejected = (r) => {
    const res    = String(r['Resolved Reason'] || r['Resolution'] || '').toLowerCase();
    const reason = String(r['Reason'] || '').toLowerCase();
    return res.includes('design') || res.includes('rejected') ||
           reason.includes('by design');
  };
  const isCritical = (r) => {
    const v = String(r['Severity'] || r['Priority'] || '').toLowerCase();
    return v.startsWith('1') || v.includes('critical');
  };

  const byPI = {};
  for (const r of bugRows) {
    const pi = extractPI(r);
    (byPI[pi] = byPI[pi] || []).push(r);
  }

  const escapingByPI = {};
  for (const r of escapingRows) {
    const pi = extractPI(r);
    (escapingByPI[pi] = escapingByPI[pi] || []).push(r);
  }

  const piList = [...new Set([...Object.keys(byPI), ...Object.keys(escapingByPI)])];

  const piMetrics = piList.map((pi, idx) => {
    const rows          = byPI[pi] || [];
    const prevEscaping  = idx > 0 ? (escapingByPI[piList[idx - 1]] || []) : [];
    const currEscaping  = escapingByPI[pi] || [];

    const totalBugs    = rows.length;
    const closedBugs   = rows.filter(isClosed).length;
    const reopenCount  = rows.filter(isReopen).length;
    const rejectedCount = rows.filter(isRejected).length;

    const velocity = safeNum(rows[0]?.['Velocity'] || 20);
    const capacity = velocity / 2.5;

    const prevCritTotal  = prevEscaping.filter(isCritical).length || prevEscaping.length;
    const escapingCritical = currEscaping.filter(isCritical).length;

    const squadNames = [...new Set(rows.map(r => getSquad(r)))];
    const squadBreakdown = squadNames.map((squad) => {
      const sr = rows.filter(r => getSquad(r) === squad);
      return {
        squad,
        totalBugs:    sr.length,
        closedBugs:   sr.filter(isClosed).length,
        reopenCount:  sr.filter(isReopen).length,
        rejectedCount: sr.filter(isRejected).length,
        reopenPct:   pct(sr.filter(isReopen).length,   sr.filter(isClosed).length),
        rejectedPct: pct(sr.filter(isRejected).length, sr.length),
      };
    });

    return {
      pi: piMap[pi] || pi, rawPi: pi,
      totalBugs, closedBugs, reopenCount, rejectedCount,
      capacity: Math.round(capacity * 10) / 10, velocity,
      reopenPct:        pct(reopenCount,     closedBugs),
      reopenDensity:    capacity ? pct(reopenCount,     capacity) : 0,
      rejectedPct:      pct(rejectedCount,   totalBugs),
      rejectedDensity:  capacity ? pct(rejectedCount,   capacity) : 0,
      escapingPct:      pct(escapingCritical, prevCritTotal),
      escapingDensity:  capacity ? pct(escapingCritical, capacity) : 0,
      escapingCritical,
      squadBreakdown,
    };
  });

  const squads = [...new Set(bugRows.map(r => getSquad(r)))];
  const squadMetrics = squads.map((squad) => {
    const rows = bugRows.filter(r => getSquad(r) === squad);
    return {
      squad,
      totalBugs:    rows.length,
      closedBugs:   rows.filter(isClosed).length,
      reopenCount:  rows.filter(isReopen).length,
      rejectedCount: rows.filter(isRejected).length,
    };
  });

  const isStrictlyClosed = r => String(r['State'] || '').trim().toLowerCase() === 'closed';
  const totalReopens      = bugRows.filter(isReopen).length;
  const totalStrictClosed = bugRows.filter(isStrictlyClosed).length;
  const qualityIndexPct   = pct(totalReopens, totalStrictClosed);

  return {
    piMetrics, squadMetrics,
    summary: { totalReopens, totalStrictClosed, qualityIndexPct },
  };
}

module.exports = { processDelivery, processQA };
