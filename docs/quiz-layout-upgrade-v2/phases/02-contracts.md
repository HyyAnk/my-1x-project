# Phase 02: Shared geometry and sizing contracts

Status: not started

## Objective

Introduce one typed source for exact target rectangles and all derived asset sizing.

Requirements: R01, R02, R03, R04, R05, R06, R08, R12.

## Dependencies and required reading

Phase 01 gate passed; read its evidence before editing.

- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [specs/IMAGE-GENERATION.md](../specs/IMAGE-GENERATION.md)
- [data/layout-targets.json](../data/layout-targets.json)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

## Concrete implementation steps

1. Define readonly rectangle, media-slot, answer-variant and layout-geometry contracts in the shared package. Keep border box, available slot and rendered image content distinct.

2. Implement the target numbers in focused shared modules. Derive centered stacks and repeated columns using pure functions; record before/after values in tests.

3. Derive image-slot definitions and geometry keys from those contracts. Mystery uses an 880x500 available slot and measured 880x495 contained image; Pure Visual distinguishes 564px media from 608px card envelope.

4. Keep the existing minimax ratio algorithm and 1.5x raster policy. Prove all six expected ratios and recommendations, including 16:9 beating 4:3 for Split Versus.

5. Expose public types through existing shared barrels. Avoid a runtime dependency cycle from geometry back into the catalog.

6. Convert server geometry tables to derived adapters and imageSlotStyles to generated variables. Do not maintain independent target constants in CSS, test helpers and UI.

7. Update catalog render/asset metrics or derive them from geometry; explicitly preserve ordinary layout counts. Mystery's count change belongs to phase 8, not a half-wired early switch.

## File ownership

- `packages/shared/src/quizImageSizing/geometry.ts` (existing)
- `packages/shared/src/quizImageSizing/policy.ts` (existing)
- `packages/shared/src/quizImageSizing/types.ts` (existing)
- `packages/shared/src/quizLayouts.catalog.ts` (existing)
- `packages/shared/src/quizLayouts.types.ts` (existing)
- `packages/shared/src/index.ts` (existing)
- `apps/server/src/quiz/render/frame/landscapeFrameGeometry.ts` (existing)
- `apps/server/src/quiz/render/frame/quizFrame.types.ts` (existing)
- `apps/server/src/quiz/render/frame/quizFrameStyles.ts` (existing)
- `apps/server/src/quiz/render/frame/renderQuizFrameBody.ts` (existing)
- `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts` (existing)
- `apps/server/src/quiz/render/layouts/imageSlotStyles.ts` (existing)
- `packages/shared/src/quizLayoutGeometry/types.ts` (proposed)
- `packages/shared/src/quizLayoutGeometry/frame.ts` (proposed)
- `packages/shared/src/quizLayoutGeometry/layouts.ts` (proposed)
- `packages/shared/src/quizLayoutGeometry/choiceGeometry.ts` (proposed)
- `packages/shared/src/quizLayoutGeometry/index.ts` (proposed)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Pure unit tests cover exact rectangles, borders, card envelopes, zero-area/invalid geometry and ratio ties.
- [ ] Shared typecheck/build pass; module imports have no new cycle.
- [ ] Every target image size and raster recommendation matches the planning JSON.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Geometry and sizing have one production owner, and calculations are verified independently of CSS.

## Deliverables

Shared geometry modules, unit tests, derived adapters, evidence/phase-02.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
