/**
 * Raw Excel rows for the Widget Builder.
 * Returns un-aggregated row arrays so the client can apply its own aggregation.
 *
 * GET /api/data/raw/delivery    → primary sheet rows from delivery.xlsx
 * GET /api/data/raw/qa_bugs     → all rows from qa_bugs.xlsx (first sheet)
 * GET /api/data/raw/qa_escaping → all rows from qa_escaping.xlsx (first sheet)
 */
const express = require('express');
const XLSX    = require('xlsx');
const path    = require('path');
const { getDb } = require('../db/init');

const router = express.Router();

function getSettings() {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const s = {};
    for (const { key, value } of rows) s[key] = value;
    return s;
  } finally { db.close(); }
}

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

// Simple header-based auth (username required, trusting client for internal tool)
function requireUser(req, res, next) {
  if (!req.headers['x-username']) return res.status(401).json({ error: 'X-Username required' });
  next();
}

// Return sheet names for a source (delivery only — CSVs have no sheets)
router.get('/sheets/:source', requireUser, (req, res) => {
  const { source } = req.params;
  if (source !== 'delivery') return res.json([]);
  const s = getSettings();
  try {
    const wb = XLSX.readFile(path.join(s.excel_path, s.delivery_file));
    res.json(wb.SheetNames);
  } catch {
    res.json([]);
  }
});

router.get('/:source', requireUser, (req, res) => {
  const { source } = req.params;
  const { sheet }  = req.query;   // optional specific sheet name
  const s = getSettings();

  let rows = [];
  try {
    if (source === 'delivery') {
      const fp = path.join(s.excel_path, s.delivery_file);
      // If caller specified a sheet, use it; otherwise fall back to FLOW priority
      rows = sheet
        ? readSheet(fp, sheet)
        : readSheet(fp, 'מדדי FLOW', 'FLOW', 'סיכום התחייבות', 'Commitment Summary');
    } else if (source === 'qa_bugs') {
      rows = readSheet(path.join(s.excel_path, s.qa_bug_file));
    } else if (source === 'qa_escaping') {
      rows = readSheet(path.join(s.excel_path, s.qa_escaping_file));
    } else {
      return res.status(400).json({ error: `Unknown source "${source}"` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // Sanitise: convert null/undefined to empty string so JSON stays clean
  const clean = rows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = v === null || v === undefined ? '' : v;
    }
    return out;
  });

  res.json(clean);
});

module.exports = router;
