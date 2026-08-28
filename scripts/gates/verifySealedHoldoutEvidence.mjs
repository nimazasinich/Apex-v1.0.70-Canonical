#!/usr/bin/env node
/**
 * verifySealedHoldoutEvidence -- explicit NOT_EXECUTED_DATA_ABSENT reporting
 * for the one test in tests/research/walkForwardHarness.test.ts that needs
 * the real sealed-holdout candle file ("keeps the guard on real loaded
 * data").
 *
 * WHY THIS EXISTS
 * That test uses `it.skipIf(!HAS_SEALED_HOLDOUT_DATA)(...)`. Vitest's own
 * skip reporting folds "didn't run because the local data file is absent"
 * into the same generic "skipped" bucket as every other skipped test, which
 * makes a CI report that only reads pass/fail counts unable to tell "this
 * never ran here" apart from "this ran and passed". This script does not
 * change how the sealed holdout is acquired, opened, or scored -- it only
 * gives the CI report a third state, distinct from PASS and FAIL:
 *
 *   PASS                     -- data was present, the test ran and passed
 *   FAIL                     -- data was present, the test ran and failed
 *   NOT_EXECUTED_DATA_ABSENT -- data was absent, nothing ran (not a failure)
 *
 * Exit code is 0 for both PASS and NOT_EXECUTED_DATA_ABSENT (neither should
 * block ordinary CI, which can't reach Binance's API from a hosted runner
 * anyway) and non-zero only for FAIL, so this can sit in an unconditional
 * gate chain. The printed status line is the thing that actually
 * distinguishes the three states for anyone -- or any script -- reading the
 * output.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
// Mirrors scripts/research/lib/researchDataset.ts DATA_DIR without importing
// TypeScript from a plain .mjs gate.
const DATA_DIR = join(root, 'QA', 'profitability-structural-remediation', 'data');
const SEALED_FILE = join(DATA_DIR, 'btcusdt-candles-1h.json');

const STATE = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_EXECUTED_DATA_ABSENT: 'NOT_EXECUTED_DATA_ABSENT',
};

function report(state, detail) {
  const line = `[sealed-holdout-evidence] ${state}${detail ? `: ${detail}` : ''}`;
  if (state === STATE.FAIL) console.error(line);
  else console.log(line);
}

if (!existsSync(SEALED_FILE)) {
  report(
    STATE.NOT_EXECUTED_DATA_ABSENT,
    `${SEALED_FILE} not present locally (acquire via \`npm run\` on scripts/research/acquireProfitabilityData.mts; not reachable from most hosted CI runners) -- this is not a failure`,
  );
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    'tests/research/walkForwardHarness.test.ts',
    '-t',
    'keeps the guard on real loaded data',
  ],
  { cwd: root, stdio: 'inherit' },
);

if (result.status === 0) {
  report(STATE.PASS, 'sealed holdout data present, guard verified against the real loaded file');
  process.exit(0);
}

report(STATE.FAIL, `vitest exited ${result.status === null ? `signal:${result.signal}` : result.status}`);
process.exit(1);
