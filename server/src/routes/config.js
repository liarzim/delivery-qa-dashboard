const express = require('express');
const { getDb } = require('../db/init');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const KNOWN_SETTINGS_KEYS = new Set([
  'excel_path', 'delivery_file', 'qa_bug_file', 'qa_escaping_file',
  'delivery_weight', 'quality_weight',
  'reopen_yellow', 'reopen_red', 'rejected_yellow', 'rejected_red',
  'escaping_yellow', 'escaping_red', 'reopen_density_yellow', 'reopen_density_red',
  'rejected_density_yellow', 'rejected_density_red', 'escaping_density_yellow', 'escaping_density_red',
  'commitment_yellow', 'commitment_red', 'weighted_yellow', 'weighted_red',
  'squad_visibility', 'pi_name_map', 'title_overrides', 'master_layout',
]);

// GET /api/config/export — admin only
router.get('/export', requireAdmin, (req, res) => {
  const db = getDb();
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    const customWidgets = db
      .prepare("SELECT id, username, name, config_json, status FROM custom_widgets WHERE status IN ('approved', 'pending')")
      .all()
      .map(w => ({ id: w.id, username: w.username, name: w.name, config: JSON.parse(w.config_json || '{}'), status: w.status }));

    const userLayouts = db
      .prepare('SELECT user_id, layout_json FROM user_layouts')
      .all();

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      customWidgets,
      userLayouts,
    };

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="system-config-${date}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(payload, null, 2));
  } finally {
    db.close();
  }
});

// POST /api/config/import — admin only
router.post('/import', requireAdmin, (req, res) => {
  const { version, settings, customWidgets, userLayouts } = req.body;

  if (version !== 1) {
    return res.status(400).json({ error: 'Unsupported config version' });
  }
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'settings must be an object' });
  }

  const db = getDb();
  try {
    // Wrap all writes in a transaction to ensure atomicity
    db.exec('BEGIN');
    try {
      // 1. Upsert all settings
      const upsertSetting = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      let settingsCount = 0;
      for (const [key, value] of Object.entries(settings)) {
        if (!KNOWN_SETTINGS_KEYS.has(key)) continue;
        upsertSetting.run(key, String(value));
        settingsCount++;
      }

      // 2. Upsert approved/pending custom widgets — preserve personal ones
      let widgetsCount = 0;
      if (Array.isArray(customWidgets)) {
        const upsertWidget = db.prepare(`
          INSERT INTO custom_widgets (id, username, name, config_json, status, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE
            SET username    = excluded.username,
                name        = excluded.name,
                config_json = excluded.config_json,
                status      = excluded.status,
                updated_at  = CURRENT_TIMESTAMP
          WHERE custom_widgets.status != 'personal'
        `);
        for (const w of customWidgets) {
          if (!w.id || !w.name) continue;
          if (w.status === 'personal') continue; // safety: skip any personal rows from import
          const configStr = typeof w.config === 'object' && w.config !== null
            ? JSON.stringify(w.config)
            : '{}';
          upsertWidget.run(w.id, w.username || '', w.name, configStr, w.status || 'approved');
          widgetsCount++;
        }
      }

      // 3. Replace all user layouts — validate before deleting
      let layoutsCount = 0;
      if (Array.isArray(userLayouts)) {
        const validLayouts = userLayouts.filter(ul => {
          if (!ul.user_id || !ul.layout_json) return false;
          try { JSON.parse(ul.layout_json); return true; } catch { return false; }
        });
        if (validLayouts.length > 0) {
          db.prepare('DELETE FROM user_layouts').run();
          const insertLayout = db.prepare(`
            INSERT INTO user_layouts (user_id, layout_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
          `);
          for (const ul of validLayouts) {
            insertLayout.run(ul.user_id, ul.layout_json);
            layoutsCount++;
          }
        }
      }

      db.exec('COMMIT');
      res.json({ success: true, imported: { settings: settingsCount, widgets: widgetsCount, layouts: layoutsCount } });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } finally {
    db.close();
  }
});

module.exports = router;
