# Phase: Pixel-Level Visual Regression Infrastructure Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: zcode
- Working mode: main-direct
- Baseline before edits: 23 dirty files (pre-existing uncommitted Candy Arcade v2 redesign from the choice-text-fit handoff, plus this agent's scratch probe)

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-choice-text-fit-overflow-and-font-verification-fix.md

## Files Changed

- apps/server/test/helpers/visualSnapshotHarness.ts (new): builds sandbox compositions per layout, inlines preview fonts to local files, drives `hyperframes snapshot` (SwiftShader, deterministic), returns PNG buffers.
- apps/server/test/helpers/visualSnapshotCompare.ts (new): sharp-based RGBA decode, pixelmatch diff (threshold 0.1), diff artifact writer under `apps/server/node_modules/.cache/quiz-visual-diffs/`.
- apps/server/test/quizPixelVisualRegression.test.ts (new): 12 cases (8 landscape 16:9 + 4 portrait 9:16, reveal phase), compares captures against committed baselines, max diff 1%. `UPDATE_VISUAL_SNAPSHOTS=1` regenerates; `SKIP_VISUAL_REGRESSION=1` skips.
- apps/server/test/__snapshots__/visual/*.png (new, 12 baselines, visually reviewed).
- apps/server/package.json: devDeps `pixelmatch`, `@types/pixelmatch`.
- package.json: devDep `cross-env`; scripts `test:visual`, `test:visual:update`.
- .github/workflows/ci.yml: verify job uploads `visual-regression-diffs` artifact on failure.
- pnpm-lock.yaml (lockfile update for the deps above).

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (claim claim-zcode-mtpx8gi3, 23 dirty files)
- Pre-existing dirty files touched: none (all edits additive; the 22 pre-existing dirty files from the redesign remain untouched)

## Scope

- Claimed phase: P0-2 of the approved improvement plan (pixel-level visual regression gate)
- Allowed scope used: server-tests, project-configuration, coordination-handoffs
- Scope deviations: one scratch file (apps/server/scratch-visual-probe.ts) was created outside any zone before the claim and deleted during it; the diff guard flagged its deletion, resolved via agent-rebaseline. No product file outside claimed zones was edited.

## Decisions

- Decision: capture via the production HyperFrames engine (`hyperframes snapshot --no-browser-gpu`) instead of Playwright screenshots.
- Reason: pixel parity with the renderer that produces the shipped MP4s; verified byte-identical output across runs (SwiftShader determinism).
- Impact on later phases: any future layout/CSS change now has a real image gate; baselines must be regenerated intentionally with `pnpm test:visual:update`.
- Decision: target the sandbox composition surface (same surface used by the web preview and the font-readiness checks) at the reveal phase, with preview fonts rewritten to local `./fonts/` copies.
- Reason: flat inputs per layout (no full pipeline/audio/mascot needed), deterministic, and already contract-tested.
- Impact on later phases: production-only surfaces (mascot sprites, brand mark, sfx timing) are not yet covered; extend the case list when needed.
- Decision: P0-1 (consolidating the 13 layout files onto the shared choices module) was deferred.
- Reason: those files currently carry a large uncommitted Candy Arcade v2 redesign (+3,425/-786 lines). Refactoring on top would entangle two changesets and make both unrevertable.
- Impact on later phases: commit the pending redesign first, then run P0-1 against a clean tree.

## Verification

- Command: pnpm --filter @studio/server test
- Result: 156 files, 1211/1211 tests pass (includes the 12 new visual regression tests against committed baselines)
- Command: pnpm typecheck
- Result: clean (shared, server, web)
- Command: node scripts/agent-validate-zones.mjs --json
- Result: valid, 0 unmapped, 0 overlapping
- Command: eslint + prettier on the three new TS files
- Result: clean
- Notes: one pre-existing parallel flake (questionBankIntegration unhandled rejection "Channel not found") appeared in one intermediate run; it passes in isolation and in the final full run. Repo-wide `pnpm lint`/`format:check` still fail on pre-existing dirty files outside this claim.

## Open Risks

- Risk: CI (windows-latest) Chrome rasterization may differ slightly from local; the 1% pixel budget should absorb it, but first CI run may reveal a needed threshold tune.
- Suggested next action: watch the first CI run of the verify job; if the visual suite fails on antialiasing noise, raise MAX_DIFF_PERCENT or pixelmatch threshold, not the baselines.
- Risk: baselines only cover the reveal phase of the sandbox surface.
- Suggested next action: add question-phase captures and production-bundle captures once the redesign is committed.

## Next Phase Input

- Files the next agent must read: apps/server/test/quizPixelVisualRegression.test.ts, apps/server/test/helpers/visualSnapshotHarness.ts
- Commands the next agent should run first: pnpm test:visual (regression), pnpm test:visual:update (after intentional visual changes)
- Important constraints: do not regenerate baselines to silence a real regression; review every regenerated baseline image before committing it.
