const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net  = require('net');

let win    = null;
let server = null;

// ── Start the Express server using the SYSTEM Node.js (not Electron's) ────────
function startServer() {
  const entry    = path.join(__dirname, '../server/src/index.js');
  const nodeExe  = process.env.NODE_EXE || 'node';   // set by launcher bat

  server = spawn(nodeExe, [entry], {
    env:   { ...process.env, PORT: '3001' },
    stdio: 'ignore',
    detached: false,
  });

  server.on('error', (err) => {
    dialog.showErrorBox('Could not start data service', err.message);
    app.quit();
  });

  server.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      dialog.showErrorBox('Data service stopped unexpectedly', `Exit code: ${code}`);
    }
  });
}

// ── Poll until port 3001 answers ──────────────────────────────────────────────
function waitForServer(port = 3001, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const sock = new net.Socket();
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error',   () => {
        sock.destroy();
        if (Date.now() > deadline) return reject(new Error('Server did not start within 30 s'));
        setTimeout(attempt, 400);
      });
      sock.connect(port, '127.0.0.1');
    }
    attempt();
  });
}

// ── Create the visible window ─────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 900,
    minHeight: 600,
    title: 'QA & Delivery Dashboard',
    backgroundColor: '#112277',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL('http://localhost:3001');
  win.on('closed', () => { win = null; });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Startup failed', err.message);
    if (server) server.kill();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (server) { server.kill(); server = null; }
  app.quit();
});

app.on('will-quit', () => {
  if (server) { server.kill(); server = null; }
});
