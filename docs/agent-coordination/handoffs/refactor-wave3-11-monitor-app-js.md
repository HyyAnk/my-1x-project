# Wave 3 Batch 11: Agent-Monitor `app.js` God Script Split — Handoff Summary

## Status

- Result: completed
- Date: 2026-09-09 (local +0700)
- Agent: refactor-wave3-11-monitor-app-js
- Working mode: main-direct
- Baseline before edits: revision `feaf77a5aa591116fa0f23320943fb1c5da3447c`, 269 pre-existing dirty files captured to `$TEMP/baseline-wave3-11.txt` before any edit.

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md, master-spec.md, phase-roadmap.md (context brief)
- scripts/coordination/monitor/web/app.js (526 lines, pre-refactor)
- scripts/coordination/monitor/web/index.html (out of scope, read-only)
- scripts/coordination/monitor-server.mjs (static serving + CLI port options)
- scripts/coordination/test/monitor-server.test.mjs (static-file test expectations)
- docs/agent-coordination/templates/phase-handoff-summary.md

## Files Changed

All under the `agent-coordination` / `coordination-handoffs` claim `claim-refactorwave311monitorappjs-mtt1ad7f`:

- `scripts/coordination/monitor/web/app.js` — 526 -> 10 lines (thin entry + preserved boot tail)
- `scripts/coordination/monitor/web/monitor/MonitorApp.js` — NEW, 171 lines (composition root)
- `scripts/coordination/monitor/web/monitor/SseConnectionController.js` — NEW, 110 lines
- `scripts/coordination/monitor/web/monitor/ZoneDrawerController.js` — NEW, 169 lines
- `scripts/coordination/monitor/web/monitor/MatrixModalController.js` — NEW, 162 lines
- `scripts/coordination/monitor/web/monitor/FileActivityController.js` — NEW, 90 lines
- `scripts/coordination/monitor/web/monitor/domElements.js` — NEW, 57 lines
- `docs/agent-coordination/handoffs/refactor-wave3-11-monitor-app-js.md` — this file

Every new file is under 200 lines (largest: MonitorApp.js at 171 after prettier).

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (`git status --porcelain > $TEMP/baseline-wave3-11.txt`)
- Pre-existing dirty files touched: none. `git status` diff vs baseline shows only: modified `scripts/coordination/monitor/web/app.js`, new `scripts/coordination/monitor/web/monitor/`, new `docs/agent-coordination/handoffs/refactor-waves-1-2-master-summary.md` (written by a different concurrent agent at 01:56 local, ~7 min before this handoff; NOT by this agent). `index.html`, `style.css`, and the prior waves' `neural-graph/` tree are untouched.

## Scope

- Claimed phase: Wave 3, batch 11 — split the Agent-Monitor dashboard god script into focused controller modules.
- Allowed scope used: exactly the 8 planned files in the claim; no agent-expand needed (suggested structure from the brief was adopted as-is).
- Scope deviations: none.

## Decisions

1. **Boot contract preserved verbatim.** `index.html` loads `<script type="module" src="/app.js">` with NO class import — the old app.js auto-instantiated in a `document.readyState` tail and set `window.__app = new App()`. The new `app.js` keeps the exact same tail shape: it imports `MonitorApp` and assigns `window.__app = new MonitorApp()` inside the identical `DOMContentLoaded` / readyState conditional. Debug global name (`window.__app`) and auto-start timing are byte-for-byte equivalent in behavior. The server-side test `monitor-server.test.mjs` fetches `/app.js` expecting HTTP 200 + javascript content-type; the thin entry keeps that green (server smoke-tested).
2. **Controllers receive explicit deps, not the app.** Each controller takes `{ elements, graph, callbacks }` in its constructor. This keeps them framework-free and unit-testable, and removes the `this.` god-object coupling. `MonitorApp` is the only place that knows how controllers cross-talk.
3. **Graph reference assigned after `initGraph()`.** Controllers are constructed before the graph exists (the NeuralGraph constructor itself needs callbacks that close over the controllers). MonitorApp constructs controllers first with `graph: null`, then `initGraph()` creates the graph and assigns it to each controller (`zoneDrawer.graph = ...` etc.). This mirrors the original init order (initElements -> initGraph -> initEvents -> loadTopologyAndConnect) and avoids any circular dependency; behavior is identical because the original code also had `this.graph = null` during initElements.
4. **`copyClaimCli(selectedZoneId)` signature change.** The method moved to MatrixModalController and now takes the selected zone id from `zoneDrawer.selectedZoneId` at click time. In the original, `copyClaimCli` read `this.selectedZoneId` directly; the click handler in MonitorApp passes the drawer's selected id, so behavior is identical. (The method also lost its `this.selectedZoneId` early-return ownership — the null check now applies to the passed parameter.)
5. **`toggleDemoDrone` preserved as dead code, flagged.** `MatrixModalController.toggleDemoDrone(onFileActivity)` preserves the original call `this.graph.toggleDemoDrone()` verbatim. Verified: `toggleDemoDrone` does NOT exist on the NeuralGraph facade (checked `neural-graph/NeuralGraph.js` and the re-export barrel), and `btnDemoDrone` / `#btn-demo-drone` does not exist in `index.html`. The method is unreachable from any bound control or keyboard shortcut (D shortcut referenced only in dead toast text). It would throw `TypeError` if ever invoked, exactly as before the refactor. Not "fixed" per instructions; candidate for deletion in a future cleanup wave.
6. **`onZoneSelected` extension point.** ZoneDrawerController invokes an `onZoneSelected` callback on open/close so the composition root can react to selection changes; the default implementation (`syncZoneDependentActions`) is currently a no-op kept as documented extension point (copy-claim reads the id lazily at click time).
7. **Magic numbers named.** Ticker auto-hide (4200ms) and toast auto-remove (2100ms) hoisted to `TICKER_AUTO_HIDE_MS` / `TOAST_AUTO_REMOVE_MS` constants in FileActivityController. Values unchanged.
8. **`disconnect()`/`dispose()` methods added** on SseConnectionController and FileActivityController (timer cleanup). Purely additive, no call sites — forward-looking API parity with the dispose pattern; original had no teardown.

## Verification

Commands run and outcomes:

1. ESM syntax (all 7 files): `node --experimental-vm-modules -e "new (require('vm').SourceTextModule)(require('fs').readFileSync('<file>','utf8'))"` -> **OK for app.js + all 6 monitor/ modules** (only the expected ExperimentalWarning on stderr).
2. Import-graph sanity: custom Node script resolving every relative import specifier in the 7 files against the filesystem -> **ALL RESOLVED** (app.js -> ./monitor/MonitorApp.js; MonitorApp.js -> ../neural-graph.js + 5 sibling modules; each controller -> ./domElements.js). The `../neural-graph.js` depth from the new `monitor/` subfolder was the depth-sensitive case — verified correct.
3. Monitor server smoke: `node scripts/coordination/monitor-server.mjs -p 3939` started; `curl` GET returned **HTTP 200** for `/`, `/app.js`, `/monitor/MonitorApp.js`, `/monitor/SseConnectionController.js`, `/monitor/ZoneDrawerController.js`, `/monitor/MatrixModalController.js`, `/monitor/FileActivityController.js`, `/monitor/domElements.js`, `/neural-graph.js`, `/style.css`. Nested modules served with `Content-Type: application/javascript; charset=utf-8` (GET; note the server answers HEAD with its 404 JSON handler — browsers/ESM use GET, and the existing test suite also uses GET). Entry content confirmed to serve the new thin module. Server then killed (PID found via `wmic`, taskkill) and port confirmed closed.
4. Prettier: `npx prettier --check` -> MonitorApp.js needed one formatting pass (`--write` applied), final check: **"All matched files use Prettier code style!"** (repo config printWidth 140 honored).
5. Protocol tests: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs` -> first run had 4 failures, all caused by a **live concurrent claim from another agent** (`claim-agentrebase...` / agent-rebase on shared-contracts, and `refactor-wave3-12` whose heartbeat had lapsed) leaking into the shared claims DB the tests consult via readStable conflict checks — unrelated to this refactor (this batch changed only browser-side ESM files). After the lapsed foreign claim expired and was cleaned, re-run: **79 tests, 79 pass, 0 fail**.
6. Zone validation: `node scripts/agent-validate-zones.mjs --json` -> `"valid": true`, no definition errors, no unmapped/overlapping files (2099 files, 24 zones).
7. Baseline diff: `git status --porcelain` vs `$TEMP/baseline-wave3-11.txt` -> only this claim's files changed within my scope (modified app.js, new monitor/ folder, this handoff); one extra new file `refactor-waves-1-2-master-summary.md` appeared from a concurrent agent (see Main-Direct Safety).

## Open Risks

1. **Dead `toggleDemoDrone` call site** (MatrixModalController.js): `graph.toggleDemoDrone()` does not exist on NeuralGraph; `btnDemoDrone` is not in index.html. Unreachable, harmless, but should be deleted (or implemented server-side) in a later wave. Suggested next action: remove the method entirely in a dedicated dead-code cleanup batch.
2. **HEAD requests to nested module paths return the JSON 404 handler** (monitor-server.mjs answers only GET for static files, pre-existing behavior; `curl -I` shows it). GET works correctly; no action needed, documented here because it can confuse future smoke tests that use `curl -I`.
3. **Concurrent-agent interference with protocol tests**: the test suite consults the live claims DB and fails while other agents hold overlapping-zone claims. This batch's own verification eventually passed 79/79 once the foreign claim lapsed; future agents in parallel waves should expect transient failures of this kind and re-run after checking `agent-status`.
4. **Runtime browser behavior** was verified structurally (ESM syntax, import resolution, server serving, boot tail equivalence) — no headless-browser DOM run was performed. The refactor is 1:1 behavior-preserving by construction (same listeners, same conditionals, same strings), but a human glance at the dashboard once is cheap insurance. Suggested next action: open the monitor once on a dev machine and click drawer/matrix/zen toggles.

## Next Phase Input

- Files the next agent must read: `scripts/coordination/monitor/web/monitor/MonitorApp.js` (composition root), `scripts/coordination/monitor/web/app.js` (boot contract), `scripts/coordination/monitor-server.mjs` (static serving block ~line 392).
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`; `node scripts/agent-validate-zones.mjs --json`.
- Important constraints: `index.html` and `style.css` are out of scope; keep `window.__app` global name and the DOMContentLoaded auto-boot tail in app.js untouched; keep every module under 200 lines; all imports relative ESM; English-only content.
