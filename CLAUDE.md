@Doc/CLAUDE_UI_HANDOFF_20260816.md
@Doc/CLAUDE_SCRIPTS_TOOLING_MEMORY.md

## Read this first: this file is guidance, not a gate (updated 2026-08-28)

This repo is worked on from more than one environment — Claude Desktop with Desktop
Commander/Serena on the maintainer's Windows machine, Codex, Claude in a plain web/chat
session with only a Linux sandbox, and others that may show up later. Only one of those
(Desktop Commander on native Windows) currently has every tool named below. **Nothing in
this file is enforced by GitHub or by a local hook** — `main` has no branch protection
configured and this repo has no pre-commit/pre-push hooks (verified 2026-08-28: `GET
/repos/.../branches/main/protection` → `404 Branch not protected`; `.git/hooks/` has only
the default `.sample` files). Every environment with push access can commit and push
directly to `main` right now. The sections below are the *recommended* workflow for the
environment that has these specific tools — treat them as defaults to adapt, not
prerequisites to satisfy before you're "allowed" to touch the project. If your environment
doesn't have Serena or Desktop Commander, use whatever native file/shell/browser tools you
do have and skip straight to the actual task.

**The one thing that stays a hard line regardless of environment:** live trading execution,
credential handling, and the Risk Governor / shadow-only safety flags for Liquidity Hunter
are not up for casual loosening — if a task pulls you toward relaxing any of those, stop and
flag it explicitly rather than proceeding, whatever environment you're in. Build/lint/test
gates, CI YAML, and this file's process ritual are a different category (developer
velocity), and are fair game to simplify.

## Agent operating rules for the Desktop Commander + Serena stack (added 2026-08-23, softened 2026-08-28)

The below is what works well **when your session has `desktop-commander` and Serena
available**. It is not a checklist you must complete before you're permitted to edit files.

**Worth probing the execution surfaces early, ideally in one batched call**, rather than
assuming from memory or a previous session — availability changes per session:

- `mcp__desktop-commander__start_process("node -v")` — is native Windows execution available?
- `mcp__workspace__bash("ls -d /sessions/*/mnt/*/")` — is the project mounted in the Linux
  sandbox? Often it is not; when absent, plan around it instead of discovering it mid-task.

**If Serena is available and you expect to do more than a one-line edit, call
`activate_project` (or `get_current_config`) early** — every other Serena tool needs it, and
it's cheap. For a trivial single-file tweak, skipping Serena entirely and using
Desktop Commander or plain file tools directly is fine.

**If a session (in any environment) discovers something durable** — a fixed bug, a corrected
assumption, a resolved "unverified" item, a new config invariant, a hazard worth remembering
— write it down somewhere a future session will actually see it: Serena's memory graph if
you have it, otherwise a note in this file, a handoff doc, or whatever durable-notes surface
your environment offers. The point is durability, not the specific tool.

**Preference order for file work when Desktop Commander + Serena are both available,
fastest first:**

1. `desktop-commander` — `read_multiple_files` for batch reads, `start_search` for grep,
   `edit_block` for edits, `start_process` for gates. Currently the only surface confirmed to
   run `tsc` / `test:unit` / `build` / `verify` natively on Windows.
2. `mcp__workspace__bash` — cheapest bulk reader, when the project is mounted.
3. Serena — symbol navigation, targeted symbolic edits, and its memory graph. Best for one
   file at a time, not bulk reading.

Playwright is a separate concern from the above ranking: browser geometry, viewport sizing,
screenshots, visual and workspace-runtime checks, and — separately — any agent that wants to
drive a real browser against the running app locally (any environment can do this with
`npx playwright install chromium` plus the JS `playwright` package already in
`package-lock.json`; it does not depend on anything in `.github/workflows/ci.yml`, which only
installs browsers on GitHub's own runners for CI screenshot QA).

A few habits worth keeping regardless of environment: batch independent reads instead of
one-at-a-time; don't run a long audit dump to establish a fact a few lines would settle;
don't re-run a gate that already passed unless a relevant input actually changed.

**Measured native-Windows timings (2026-08-23), so no gate here is "too slow to try":**
`npx tsc --noEmit` under 30s · `npm run test:unit` ~13s (130 files / 756 tests) · `npm run build`
under 50s · `check:version-identity` + `check:build-identity` a few seconds each.

**Platform note:** `node_modules` ships `@esbuild/win32-x64` and `@rollup/rollup-win32-x64-*`
only when installed on Windows. An esbuild/rollup "installed for another platform" error there
means the command ran on the wrong surface (move it to Windows), not a source defect — a
fresh Linux-side `npm ci` in a sandbox will happily install Linux-native binaries instead and
that's fine too.

## Speed ideas — status as of 2026-08-23

- **OPEN.** `serena project index` to pre-warm the language server before the first symbol
  lookup of a session. The CLI is on PATH and confirmed working
  (`C:\Users\Dreammaker\.local\bin\serena.exe`, Serena 1.7.0); untested whether it measurably
  cuts latency.
- **OPEN.** `get_diagnostics_for_file` as a faster interim check on a single edited file —
  narrower than a full compile, doesn't replace `npx tsc --noEmit` before a real gate run.
- **RESOLVED.** Serena's non-symbolic file tools (`read_file`, `create_text_file`, `list_dir`,
  `find_file`, `execute_shell_command`) are excluded in the global `~/.serena/serena_config.yml`.
  `.serena/project.yml`'s empty `excluded_tools: []` is correct as-is.
