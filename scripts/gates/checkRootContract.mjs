#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const classified = new Set([
  '.agent-index', '.apex-data', '.claude', '.env.example', '.external-api-sources.config.example.json', '.gitattributes', '.github', '.gitignore',
  '.mcp-recovered', '.node-version', '.nvmrc', '.playwright-browsers', '.serena', 'apex-npm-tarballs.zip', 'CLAUDE.md', 'Doc', 'QA', 'README.md', 'README.txt', '_archive', '_qa', '_release', 'dist', 'index.html',
  'node_modules', 'openapi', 'package-lock.json', 'package.json', 'public', 'RUN-APEX.bat', 'scripts', 'server.ts', 'src', 'tests',
  'test-results', 'tools', 'tsconfig.json', 'tsconfig.ui02.json', 'vendor', 'VERSION', 'vite.config.ts',
]);
// Root entries whose *name* strongly suggests a committed secret (real .env files,
// private keys, credential dumps). These always block, in both strict and non-strict
// mode, regardless of whether they happen to be in `classified` above.
const secretLike = (entry) =>
  /^\.env($|\.(?!example$))/.test(entry) ||
  /\.(pem|key|p12|pfx)$/i.test(entry) ||
  /^id_(rsa|dsa|ecdsa|ed25519)$/.test(entry) ||
  /credential/i.test(entry) ||
  /secret/i.test(entry);

// `.git` is version-control metadata, not a source artifact to classify. It is
// created by every clone and every `actions/checkout` run, so it is filtered out
// here rather than added to the classified source set.
const entries = readdirSync(root).sort().filter((entry) => entry !== '.git');
const unknown = entries.filter((entry) => !classified.has(entry));
const unknownSecrets = unknown.filter(secretLike);
const unknownBenign = unknown.filter((entry) => !secretLike(entry));
const contract = readFileSync(resolve(root, 'Doc/repository/ROOT_CONTRACT.md'), 'utf8');
const errors = [];
const warnings = [];

if (unknownSecrets.length) errors.push(`unclassified_root_entries_secret_like:${unknownSecrets.join(',')}`);
if (unknownBenign.length) {
  const message = `unclassified_root_entries:${unknownBenign.join(',')}`;
  if (strict) errors.push(message);
  else warnings.push(message);
}

for (const required of ['README.txt', '.github/', '.claude/', '.nvmrc', '.node-version', 'openapi/', 'tools/', 'vendor/', '_archive/', 'QA/']) {
  if (!contract.includes(`\`${required}\``)) errors.push(`root_contract_missing:${required}`);
}
if (!contract.includes('file:vendor/*')) errors.push('root_contract_missing_vendor_lockfile_reason');
if (!contract.includes('separate build artifact')) errors.push('root_contract_missing_artifact_separation');

if (warnings.length) {
  console.warn(`[root-contract] WARN (non-strict mode)`);
  warnings.forEach((warning) => console.warn(`  - ${warning}`));
}
if (errors.length) {
  console.error(`[root-contract] FAILED${strict ? ' (--strict)' : ''}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
console.log(`[root-contract] passed${strict ? ' (--strict)' : ''}: ${entries.length} current root entries are explicitly classified (or non-blocking in non-strict mode).`);
