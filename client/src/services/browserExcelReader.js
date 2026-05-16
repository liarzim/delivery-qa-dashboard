/**
 * Browser-side Excel/CSV reader — mirrors server/src/services/excelReader.js exactly,
 * but reads from File objects (ArrayBuffer or text) instead of the filesystem.
 *
 * Supports: .xlsx  .xls  .xlsm  .csv
 * Uses SheetJS (xlsx) for all formats — CSV is parsed via XLSX.read(text, {type:'string'}).
 */
import * as XLSX from 'xlsx';

// ── File → SheetJS workbook (handles both Excel and CSV) ─────────────────────
async function fileToWorkbook(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (ext === 'csv') {
    const text = await file.text();
    return XLSX.read(text, { type: 'string' });
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: 'array' });
}

// ── Shared helpers (identical to server) ─────────────────────────────────────
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

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
  return row['Leading Squad'] || row['Squad'] || row['Team'] || row['שם קבוצה'] || 'Unknown';
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

// ── Extract rows from a workbook, trying named sheets in order ────────────────
function sheetToRows(wb, ...sheetNames) {
  try {
    for (const name of sheetNames) {
      if (!name) continue;
      const ws = wb.Sheets[name];
      if (ws) return XLSX.utils.sheet_to_json(ws, { defval: null });
    }
    // Fall back to first sheet
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  } catch {
    return [];
  }
}

// ── DELIVERY ──────────────────────────────────────────────────────────────────
export async function processDelivery(deliveryFile, settings = {}) {
  const piMap = JSON.parse(settings.pi_name_map || '{}');
  const wb    = await fileToWorkbook(deliveryFile);

  const commitRows = sheetToRows(wb, 'סיכום התחייבות', 'Commitment Summary');
  const flowRows   = sheetToRows(wb, 'מדדי FLOW', 'FLOW');

  const primaryRows = (flowRows.length && flowRows[0] && 'Commited1' in flowRows[0])
    ? flowRows : commitRows;

  // Group by PI
  const byPI = {};
  for (const row of primaryRows) {
    const pi = extractPI(row);
    (byPI[pi] = byPI[pi] || []).push(row);
  }

  const piMetrics = Object.keys(byPI).map(pi => {
    const rows      = byPI[pi];
    const committed = rows.filter(isCommitted);
    const notComm   = rows.filter(r => !isCommitted(r));
    const totalFeatures   = rows.length;
    const totalDone       = rows.filter(isDone).length;
    const committedDone   = committed.filter(isDone).length;
    const uncommittedDone = notComm.filter(isDone).length;
    return {
      pi: piMap[pi] || pi, rawPi: pi,
      totalFeatures, totalDone,
      totalCommitted: committed.length, committedDone,
      totalUncommitted: notComm.length, uncommittedDone,
      committedRate:   pct(committedDone,   committed.length),
      uncommittedRate: pct(uncommittedDone, notComm.length),
      overallRate:     pct(totalDone,       totalFeatures),
    };
  });

  // Flow metrics
  const flowByPI = {};
  for (const row of flowRows) {
    const pi = extractPI(row);
    (flowByPI[pi] = flowByPI[pi] || []).push(row);
  }

  const flowMetrics = Object.keys(flowByPI).map(pi => {
    const rows      = flowByPI[pi];
    const completed = rows.filter(isDone);
    const durations = completed.map(r => {
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
      deliveryWeight:  safeNum(settings.delivery_weight),
      qualityWeight:   safeNum(settings.quality_weight),
    },
  };
}

// ── QA ────────────────────────────────────────────────────────────────────────
export async function processQA(bugsFile, escapingFile, settings = {}) {
  const piMap = JSON.parse(settings.pi_name_map || '{}');

  const [bugsWb, escapingWb] = await Promise.all([
    fileToWorkbook(bugsFile),
    fileToWorkbook(escapingFile),
  ]);

  const bugRows      = sheetToRows(bugsWb);
  const escapingRows = sheetToRows(escapingWb);

  const isClosed = r => {
    const v = String(r['State'] || r['Status'] || '').toLowerCase();
    return v === 'closed' || v === 'resolved' || v === 'done';
  };
  const isReopen = r => {
    const v = r['Reopen'] ?? r['Reopen Count'] ?? r['ReopenCount'];
    if (v === null || v === undefined || v === '') return false;
    const n = parseFloat(v);
    return !isNaN(n) ? n > 0 : String(v).toLowerCase() === 'yes';
  };
  const isRejected = r => {
    const res    = String(r['Resolved Reason'] || r['Resolution'] || '').toLowerCase();
    const reason = String(r['Reason'] || '').toLowerCase();
    return res.includes('design') || res.includes('rejected') || reason.includes('by design');
  };
  const isCritical = r => {
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
    const rows         = byPI[pi] || [];
    const prevEscaping = idx > 0 ? (escapingByPI[piList[idx - 1]] || []) : [];
    const currEscaping = escapingByPI[pi] || [];

    const totalBugs     = rows.length;
    const closedBugs    = rows.filter(isClosed).length;
    const reopenCount   = rows.filter(isReopen).length;
    const rejectedCount = rows.filter(isRejected).length;

    const velocity  = safeNum(rows[0]?.['Velocity'] || 20);
    const capacity  = velocity / 2.5;

    const prevCritTotal    = prevEscaping.filter(isCritical).length || prevEscaping.length;
    const escapingCritical = currEscaping.filter(isCritical).length;

    const squadNames     = [...new Set(rows.map(r => getSquad(r)))];
    const squadBreakdown = squadNames.map(squad => {
      const sr = rows.filter(r => getSquad(r) === squad);
      return {
        squad,
        totalBugs:    sr.length,
        closedBugs:   sr.filter(isClosed).length,
        reopenCount:  sr.filter(isReopen).length,
        rejectedCount: sr.filter(isRejected).length,
        reopenPct:   pct(sr.filter(isReopen).length,    sr.filter(isClosed).length),
        rejectedPct: pct(sr.filter(isRejected).length,  sr.length),
      };
    });

    return {
      pi: piMap[pi] || pi, rawPi: pi,
      totalBugs, closedBugs, reopenCount, rejectedCount,
      capacity: Math.round(capacity * 10) / 10, velocity,
      reopenPct:       pct(reopenCount,     closedBugs),
      reopenDensity:   capacity ? pct(reopenCount,     capacity) : 0,
      rejectedPct:     pct(rejectedCount,   totalBugs),
      rejectedDensity: capacity ? pct(rejectedCount,   capacity) : 0,
      escapingPct:     pct(escapingCritical, prevCritTotal),
      escapingDensity: capacity ? pct(escapingCritical, capacity) : 0,
      escapingCritical,
      squadBreakdown,
    };
  });

  const squads      = [...new Set(bugRows.map(r => getSquad(r)))];
  const squadMetrics = squads.map(squad => {
    const rows = bugRows.filter(r => getSquad(r) === squad);
    return {
      squad,
      totalBugs:     rows.length,
      closedBugs:    rows.filter(isClosed).length,
      reopenCount:   rows.filter(isReopen).length,
      rejectedCount: rows.filter(isRejected).length,
    };
  });

  // Overview summary — uses strict State === "Closed" denominator as spec requires
  const isStrictlyClosed = r => String(r['State'] || '').trim().toLowerCase() === 'closed';
  const totalReopens      = bugRows.filter(isReopen).length;
  const totalStrictClosed = bugRows.filter(isStrictlyClosed).length;
  const qualityIndexPct   = pct(totalReopens, totalStrictClosed);

  return {
    piMetrics, squadMetrics,
    summary: { totalReopens, totalStrictClosed, qualityIndexPct },
  };
}
