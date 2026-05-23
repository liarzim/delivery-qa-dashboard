require('dotenv').config();
const express = require('express');
const path    = require('path');
const { initDb } = require('./db/init');

const authRoutes        = require('./routes/auth');
const layoutRoutes      = require('./routes/layout');
const settingsRoutes    = require('./routes/settings');
const dataRoutes        = require('./routes/data');
const subDashRoutes     = require('./routes/subDashboards');
const debugRoutes       = require('./routes/debug');
const widgetRoutes      = require('./routes/widgets');
const rawDataRoutes     = require('./routes/rawData');
const configRoutes      = require('./routes/config');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '5mb' }));

// API routes (must come before static)
app.use('/api/auth',           authRoutes);
app.use('/api/layout',         layoutRoutes);
app.use('/api/settings',       settingsRoutes);
app.use('/api/data',           dataRoutes);
app.use('/api/sub-dashboards', subDashRoutes);
app.use('/api/debug',         debugRoutes);
app.use('/api/widgets',       widgetRoutes);
app.use('/api/data/raw',      rawDataRoutes);
app.use('/api/config',        configRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve the built React app
// Hashed JS/CSS assets (e.g. index-abc123.js) can be cached forever.
// index.html must never be cached — it references those hashed filenames and
// must always be fresh so the browser picks up the latest asset URLs.
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  },
}));
app.get('*', (_, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(clientDist, 'index.html'));
});

initDb();

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
