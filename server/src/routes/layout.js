const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/layout — user's custom layout, or master if none set
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare('SELECT layout_json FROM user_layouts WHERE user_id = ?').get(req.user.id);
    const masterRow = db.prepare("SELECT value FROM settings WHERE key = 'master_layout'").get();
    const master = masterRow ? JSON.parse(masterRow.value) : {};
    const user   = row ? JSON.parse(row.layout_json) : null;
    res.json({ layout: user || master, master, hasCustom: !!row });
  } finally {
    db.close();
  }
});

// PUT /api/layout — save user's own layout
router.put('/', requireAuth, (req, res) => {
  const { layout } = req.body;
  if (typeof layout !== 'object' || Array.isArray(layout)) {
    return res.status(400).json({ error: 'layout must be an object' });
  }
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO user_layouts (user_id, layout_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE
        SET layout_json = excluded.layout_json, updated_at = CURRENT_TIMESTAMP
    `).run(req.user.id, JSON.stringify(layout));
    res.json({ success: true });
  } finally {
    db.close();
  }
});

// DELETE /api/layout — reset user's layout to master
router.delete('/', requireAuth, (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM user_layouts WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } finally {
    db.close();
  }
});

// GET /api/layout/master
router.get('/master', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'master_layout'").get();
    res.json({ master: row ? JSON.parse(row.value) : {} });
  } finally {
    db.close();
  }
});

// PUT /api/layout/master — admin only
router.put('/master', requireAdmin, (req, res) => {
  const { layout } = req.body;
  if (typeof layout !== 'object') return res.status(400).json({ error: 'layout must be object' });
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('master_layout', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(layout));
    res.json({ success: true });
  } finally {
    db.close();
  }
});

module.exports = router;
