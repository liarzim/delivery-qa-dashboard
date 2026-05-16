#!/usr/bin/env node
/**
 * bump-version.js — called by the Claude Code Stop hook.
 *
 * Only runs if .version-dirty exists (set by the PostToolUse hook whenever
 * an Edit or Write tool call is made during the session).
 * Increments the patch segment of APP_VERSION in client/src/main.jsx,
 * then deletes the dirty flag so the next session starts clean.
 */
const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const DIRTY_FLAG = path.join(ROOT, '.version-dirty');
const MAIN_JSX   = path.join(ROOT, 'client', 'src', 'main.jsx');

if (!fs.existsSync(DIRTY_FLAG)) process.exit(0);

const content = fs.readFileSync(MAIN_JSX, 'utf8');
const match   = content.match(/APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);

if (!match) {
  fs.unlinkSync(DIRTY_FLAG);
  process.exit(0);
}

const [full, major, minor, patch] = match;
const newVersion = `${major}.${minor}.${parseInt(patch, 10) + 1}`;
fs.writeFileSync(MAIN_JSX, content.replace(full, `APP_VERSION = '${newVersion}'`));
fs.unlinkSync(DIRTY_FLAG);
console.log(`APP_VERSION: ${major}.${minor}.${patch} → ${newVersion}`);
