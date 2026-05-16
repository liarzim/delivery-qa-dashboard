/**
 * Widget CRUD + Approval Workflow
 *
 * Auth: lightweight header-based (internal tool).
 *   X-Username  — current user's username (required)
 *   X-User-Role — 'Admin' | 'Management' (trusted from client)
 *
 * Status transitions:
 *   personal → pending  (user publishes)
 *   pending  → approved (admin approves)
 *   pending  → personal (admin rejects)
 */
const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// ── Lightweight auth middleware ────────────────────────────────────────────────
function requireUser(req, res, next) {
  const username = req.headers['x-username'];
  if (!username) return res.status(401).json({ error: 'X-Username header required' });
  req.username = username;
  req.userRole = req.headers['x-user-role'] || 'Management';
  next();
}
function requireAdmin(req, res, next) {
  requireUser(req, res, () => {
    if (req.userRole !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ── GET /api/widgets
// Returns: own personal widgets + all approved widgets
router.get('/', requireUser, (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, username, name, config_json, status, created_at, updated_at
      FROM custom_widgets
      WHERE username = ? OR status = 'approved'
      ORDER BY updated_at DESC
    `).all(req.username);
    res.json(rows.map(r => ({ ...r, config: JSON.parse(r.config_json) })));
  } finally { db.close(); }
});

// ── GET /api/widgets/pending  (admin)
router.get('/pending', requireAdmin, (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, username, name, config_json, status, created_at, updated_at
      FROM custom_widgets WHERE status = 'pending'
      ORDER BY created_at ASC
    `).all();
    res.json(rows.map(r => ({ ...r, config: JSON.parse(r.config_json) })));
  } finally { db.close(); }
});

// ── GET /api/widgets/:id
router.get('/:id', requireUser, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM custom_widgets WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    // Only owner or admin can read personal/pending widgets
    if (row.status === 'personal' && row.username !== req.username && req.userRole !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ ...row, config: JSON.parse(row.config_json) });
  } finally { db.close(); }
});

// ── POST /api/widgets  — create personal widget
router.post('/', requireUser, (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) return res.status(400).json({ error: 'name and config required' });
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO custom_widgets (username, name, config_json, status)
      VALUES (?, ?, ?, 'personal')
    `).run(req.username, String(name).trim(), JSON.stringify(config));
    const widget = db.prepare('SELECT * FROM custom_widgets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...widget, config: JSON.parse(widget.config_json) });
  } finally { db.close(); }
});

// ── PUT /api/widgets/:id  — update config or name (owner only)
router.put('/:id', requireUser, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM custom_widgets WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.username !== req.username && req.userRole !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const name       = req.body.name       ?? row.name;
    const config     = req.body.config     ?? JSON.parse(row.config_json);
    const status     = req.body.status     ?? row.status;

    db.prepare(`
      UPDATE custom_widgets
      SET name=?, config_json=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(String(name).trim(), JSON.stringify(config), status, row.id);

    const updated = db.prepare('SELECT * FROM custom_widgets WHERE id=?').get(row.id);
    res.json({ ...updated, config: JSON.parse(updated.config_json) });
  } finally { db.close(); }
});

// ── PUT /api/widgets/:id/publish  — owner requests global approval
router.put('/:id/publish', requireUser, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM custom_widgets WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.username !== req.username) return res.status(403).json({ error: 'Forbidden' });
    db.prepare(`UPDATE custom_widgets SET status='pending', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.id);
    res.json({ success: true });
  } finally { db.close(); }
});

// ── PUT /api/widgets/:id/approve  (admin)
router.put('/:id/approve', requireAdmin, (req, res) => {
  const db = getDb();
  try {
    db.prepare(`UPDATE custom_widgets SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
    res.json({ success: true });
  } finally { db.close(); }
});

// ── PUT /api/widgets/:id/reject  (admin — reverts to personal)
router.put('/:id/reject', requireAdmin, (req, res) => {
  const db = getDb();
  try {
    db.prepare(`UPDATE custom_widgets SET status='personal', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
    res.json({ success: true });
  } finally { db.close(); }
});

// ── DELETE /api/widgets/:id
router.delete('/:id', requireUser, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM custom_widgets WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.username !== req.username && req.userRole !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.prepare('DELETE FROM custom_widgets WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } finally { db.close(); }
});

module.exports = router;
