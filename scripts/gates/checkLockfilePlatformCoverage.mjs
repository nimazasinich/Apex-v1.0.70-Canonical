#!/usr/bin/env node
/**
 * checkLockfilePlatformCoverage -- static guard against silent lockfile
 * platform-coverage loss.
 *
 * WHY THIS EXISTS
 * `package-lock.json` carries the cross-platform optional-dependency set for
 * esbuild/rollup (win32, linux-gnu, linux-musl, darwin-x64, darwin-arm64).
 * The sibling repo nimazasinich/Apex hit exactly this failure mode once
 * already -- commit c857d349, "restore 22 libc discriminator blocks stripped
 * by Windows npm run" -- where a plain `npm install` (not `npm ci`) run on
 * Windows silently dropped the other platforms' entries from the lockfile.
 * That breaks `npm ci` for every other contributor and for CI, days after
 * the actual mistake and far from its cause. This project is explicitly
 * meant to be worked from Windows, Linux, and any other environment
 * interchangeably, so this is a cheap static gate that catches it at commit
 * time instead.
 *
 * WHAT IT DOES AND DOES NOT DO
 * Reads package-lock.json only. No npm invocation, no node_modules access --
 * safe on any OS and fast enough to run on every `npm run verify`.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');

const REQUIRED_KEYS = [
  'node_modules/@esbuild/win32-x64',
  'node_modules/@esbuild/linux-x64',
  'node_modules/@esbuild/darwin-x64',
  'node_modules/@esbuild/darwin-arm64',
  'node_modules/@rollup/rollup-win32-x64-msvc',
  'node_modules/@rollup/rollup-linux-x64-gnu',
  'node_modules/@rollup/rollup-linux-x64-musl',
  'node_modules/@rollup/rollup-darwin-x64',
  'node_modules/@rollup/rollup-darwin-arm64',
];

function fail(missing) {
  console.error('[lockfile-platform-coverage] FAILED');
  console.error(`  package-lock.json is missing ${missing.length} required cross-platform entr${missing.length === 1 ? 'y' : 'ies'}:`);
  for (const key of missing) console.error(`    - ${key}`);
  console.error('');
  console.error('  This usually means a plain `npm install` (not `npm ci`) ran on a single');
  console.error('  platform and silently stripped the other platforms\' optional-dependency');
  console.error('  entries from the lockfile (see nimazasinich/Apex commit c857d349).');
  console.error('');
  console.error('  Fix it:');
  console.error('    git checkout -- package-lock.json');
  console.error('    npm install --package-lock-only   # on the canonical machine');
  console.error('  Prefer `npm ci` for ordinary installs going forward.');
  process.exit(1);
}

if (!fs.existsSync(lockPath)) {
  console.error('[lockfile-platform-coverage] FAILED');
  console.error('  package-lock.json is missing entirely');
  process.exit(1);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (error) {
  console.error('[lockfile-platform-coverage] FAILED');
  console.error(`  package-lock.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

const packages = lock.packages || {};
const missing = REQUIRED_KEYS.filter((key) => !(key in packages));

if (missing.length) fail(missing);

console.log(`[lockfile-platform-coverage] passed: all ${REQUIRED_KEYS.length} cross-platform esbuild/rollup entries present`);
