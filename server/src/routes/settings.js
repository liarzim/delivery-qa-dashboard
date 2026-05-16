const express = require('express');
const { exec } = require('child_process');
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const { key, value } of rows) settings[key] = value;
    res.json(settings);
  } finally {
    db.close();
  }
});

router.put('/', requireAdmin, (req, res) => {
  const updates = req.body;
  if (typeof updates !== 'object') return res.status(400).json({ error: 'Invalid body' });
  const db = getDb();
  try {
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    db.exec('BEGIN');
    try {
      for (const [k, v] of Object.entries(updates)) upsert.run(k, String(v));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ success: true });
  } finally {
    db.close();
  }
});

router.get('/select-folder', requireAdmin, (req, res) => {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$d.Description = 'Select Excel Data Folder'",
    '$d.ShowNewFolderButton = $true',
    "if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }",
  ].join('; ');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  exec(`powershell -NoProfile -EncodedCommand ${encoded}`, { timeout: 60000 }, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Folder dialog failed' });
    const selected = stdout.trim();
    res.json({ path: selected || null });
  });
});

module.exports = router;
