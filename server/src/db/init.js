const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/dashboard.db');

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new DatabaseSync(DB_PATH);
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Management',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_layouts (
      user_id INTEGER PRIMARY KEY,
      layout_json TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_dashboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_he TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'LayoutDashboard',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_widgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'personal'
        CHECK(status IN ('personal','pending','approved')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_custom_widgets_username ON custom_widgets(username);
    CREATE INDEX IF NOT EXISTS idx_custom_widgets_status   ON custom_widgets(status);
  `);

  const defaults = [
    ['excel_path', path.join(__dirname, '../../sample-data')],
    ['delivery_file', 'delivery.xlsx'],
    ['qa_bug_file', 'qa_bugs.xlsx'],
    ['qa_escaping_file', 'qa_escaping.xlsx'],
    ['delivery_weight', '60'],
    ['quality_weight', '40'],
    ['reopen_yellow', '5'],
    ['reopen_red', '10'],
    ['rejected_yellow', '5'],
    ['rejected_red', '10'],
    ['escaping_yellow', '3'],
    ['escaping_red', '7'],
    ['reopen_density_yellow', '2'],
    ['reopen_density_red', '5'],
    ['rejected_density_yellow', '2'],
    ['rejected_density_red', '5'],
    ['escaping_density_yellow', '2'],
    ['escaping_density_red', '5'],
    ['commitment_yellow', '80'],
    ['commitment_red', '60'],
    ['weighted_yellow', '50'],
    ['weighted_red', '30'],
    ['squad_visibility', '{}'],
    ['pi_name_map', '{}'],
    ['title_overrides', '{}'],
    ['widget_title_size', '12'],
  ];

  const upsert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [k, v] of defaults) upsert.run(k, v);

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`).run('admin', hash, 'Admin');
    const mgmtHash = bcrypt.hashSync('mgmt123', 10);
    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`).run('manager', mgmtHash, 'Management');
  }

  db.close();
}

module.exports = { getDb, initDb };
