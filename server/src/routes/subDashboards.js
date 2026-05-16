const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/sub-dashboards — list all (any authenticated user)
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM sub_dashboards ORDER BY sort_order, id').all();
    db.close();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sub-dashboards — create (admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name_en, name_he = '', icon = 'LayoutDashboard' } = req.body;
  if (!name_en) return res.status(400).json({ error: 'name_en is required' });
  try {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO sub_dashboards (name_en, name_he, icon) VALUES (?, ?, ?)'
    ).run(name_en.trim(), name_he.trim(), icon);
    const row = db.prepare('SELECT * FROM sub_dashboards WHERE id = ?').get(result.lastInsertRowid);
    db.close();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sub-dashboards/:id — update name/icon (admin only)
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const { name_en, name_he, icon } = req.body;
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM sub_dashboards WHERE id = ?').get(req.params.id);
    if (!existing) { db.close(); return res.status(404).json({ error: 'Not found' }); }
    db.prepare('UPDATE sub_dashboards SET name_en=?, name_he=?, icon=? WHERE id=?').run(
      name_en ?? existing.name_en,
      name_he ?? existing.name_he,
      icon     ?? existing.icon,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM sub_dashboards WHERE id = ?').get(req.params.id);
    db.close();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sub-dashboards/:id — delete (admin only)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM sub_dashboards WHERE id = ?').run(req.params.id);
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
