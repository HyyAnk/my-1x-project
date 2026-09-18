# Phase 01: Baseline and characterization

Status: not started

## Objective

Establish current observable behavior and protect the dirty worktree before any product change.

Requirements: R13, R14.

## Dependencies and required reading

No implementation prerequisite.

- [SCOPE.md](../SCOPE.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [RISKS.md](../RISKS.md)
- [data/source-baseline.json](../data/source-baseline.json)

## Concrete implementation steps

1. Capture git status --short and git diff --stat. Record current HEAD and hashes of all files the phase will touch; planning hashes are observation only, not permission to overwrite.

2. Read the nearest AGENTS.md instructions. Use CodeGraph first when available; do not re-index or upgrade it as part of this task.

3. Inventory registered answer-card skins and thinking-bar variants, active layout counts and fonts. Record runtime/tool versions and the configured browser/render invocation.

4. Create an isolated synthetic English fixture set for seven layouts, including existing 2-answer variants and a planned one-answer Mystery fixture. Do not use real channel or bank records.

5. Measure old border boxes, actual image viewports, answer bounds, fact/timer positions and frame timing through the current renderer. Capture representative before screenshots.

6. Run existing targeted geometry, scene, image-sizing, timing and schema tests. Separate baseline failures from newly introduced failures; never fix unrelated debt opportunistically.

7. Record screenshot paths, font readiness, fallback media usage, environment limitations and which files already contain user edits. Create a checkpoint suitable for a different agent to resume without rereading the conversation.

## File ownership

Use the qa-area inventory in data/file-manifest.json and the exact commands in VERIFICATION.md.

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Read-only baseline capture completes without modifying product data.
- [ ] At least one baseline frame for each of seven active layouts, plus Mystery timing inspection, is recorded.
- [ ] Known failures include reproduction commands and ownership.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

A second agent can reproduce the baseline and distinguish existing changes from upgrade work. No product state has been destructively reset.

## Deliverables

evidence/phase-01.md, baseline command log, before-frame contact sheet, scoped fixture inventory.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
