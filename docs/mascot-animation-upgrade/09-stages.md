# Antigravity Stage Plan

Complete each stage separately. Do not start the next stage until the current stage report includes files, tests and evidence.

## Stage 01 — Baseline and scope lock

Read this folder, inspect the dirty worktree without reverting it, and capture current Concept, Style, slot generation, preview and production behavior. Add no feature code. Evidence: baseline test commands and a short architecture note.

## Stage 02 — Pin sprite-gen and prerequisites

Resolve the installed sprite-gen version, upstream revision, Codex provider availability, virtual environment, ffmpeg-free atlas requirements and artifact paths. Implement a diagnostic only. Evidence: version report and fixture command shape. Stop if the twelve-frame request cannot be represented.

## Stage 03 — Shared animation contracts

Add strict types, Zod schemas, constants and exports for animation assets, jobs, statuses, twelve frames, fps 8, loop policy and registration. Add invalid-input tests. No UI or provider calls.

## Stage 04 — Stable recipe catalog

Add the ten thinking and ten celebrate recipe ids, prompt builders, prohibited actions and fingerprint inputs. Add tests proving recipe stability and state separation.

## Stage 05 — Fixture sprite-gen adapter

Build the process adapter behind an interface. Add a deterministic fixture mode that supplies atlas, manifest and reports without network/provider calls. Test timeout, abort, non-zero exit, missing output and structured logs.

## Stage 06 — Manifest parser and importer

Parse the pinned sprite-gen manifest, follow its declared frame paths/rectangles, validate fingerprints and derive registration, pivot and content bounds. Reject guessed grids, stale revisions and unsafe paths. Add importer fixtures.

## Stage 07 — Job and artifact persistence

Add repository methods and storage migration for job attempts, artifact versions, status, progress, errors, curation metadata and immutable publish records. Test atomic writes and stale attempt rejection.

## Stage 08 — Plan and batch orchestration

Implement style x state x slot planning. Generate exactly twenty jobs per style, deduplicate by fingerprint, enforce mascot/style locks, bounded concurrency, cancellation and retry. Add idempotency tests.

## Stage 09 — QA and publish gate

Implement alpha, bounds, duplicates, motion, seam, semantic recipe evidence and manifest checks. Require manual curation status where configured. Reject style publish until all twenty slots are ready.

## Stage 10 — Server API and progress

Add route schemas, routes and task/event progress integration. Verify pending acknowledgement, success, failure, retry, cancellation, reconnect and stale event handling. Keep handlers thin.

## Stage 11 — Animation Studio shell

Replace still-generation controls only for the animation step with Thinking/Celebrate tabs, ten slots, status badges and concise batch actions. Keep Concept and Style screens unchanged.

## Stage 12 — Slot preview and curation

Add twelve-frame playback, pause, step, speed display, contact sheet, curation controls and explicit save. Ensure keyboard and touch access. Do not show a ready state before server confirmation.

## Stage 13 — Preview renderer integration

Add shared frame-at-time resolution and wire Studio/HTML preview to the persisted atlas and manifest. Test exact frame selection, loop boundary, geometry and localized sources.

## Stage 14 — Production renderer integration

Wire the same resolver into productionMascotRenderer and productionMascotTimeline. Remove CSS motion as the primary path for published thinking and celebrate animations. Verify HyperFrames seekability, finite duration and no render-time clocks.

## Stage 15 — Deterministic question selection

Add selection based on video id, question id, state and style. Avoid immediate repeats where possible. Persist the selected slot in render snapshots and test resume/re-render equality.

## Stage 16 — Twelve-frame pilot

Run one style with one thinking and one celebrate row, then ten variants per state. Inspect every contact sheet and report measured duplicate, empty, seam and semantic failures. Stop if the pilot fails.

## Stage 17 — All-style generation

Plan and process every existing style with bounded concurrency. Publish style-by-style only after twenty ready slots. Keep failed slots visible and retryable; do not silently skip.

## Stage 18 — Full verification and handoff

Run typecheck, tests, lint, build, visual regression, responsive UI review and a representative quiz render. Confirm logs, recovery, artifact retention and runbooks. Deliver a stage report with known risks and exact commands.

