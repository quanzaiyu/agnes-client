#!/usr/bin/env node
/**
 * Tiny launcher for agnes-flow. We use `tsx` (devDependency) to run the TS
 * source directly so users don't have to `npm run build` first.
 *
 * Falls back to the built dist/cli.js if it exists.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const here = __dirname;
const projectRoot = path.resolve(here, '..');
const distEntry = path.join(projectRoot, 'dist', 'cli.js');
const srcEntry = path.join(projectRoot, 'src', 'cli.ts');

let entry;
if (fs.existsSync(distEntry)) {
  entry = distEntry;
} else if (fs.existsSync(srcEntry)) {
  // Run via tsx. We resolve from the project's node_modules so local dev
  // installs are picked up. If tsx isn't installed, fall back to system npx.
  const localTsx = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  if (fs.existsSync(localTsx)) {
    const r = spawnSync(localTsx, [srcEntry, ...process.argv.slice(2)], { stdio: 'inherit' });
    process.exit(r.status ?? 0);
  }
  const r = spawnSync('npx', ['--yes', 'tsx', srcEntry, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 0);
} else {
  console.error('agnes-flow: cannot find entry point. Run `npm install` first.');
  process.exit(2);
}

require(entry);
