# Phase 03: Frame anchors, fact dock and collision policy

Status: not started

## Objective

Move fact cards down exactly 40px and make frame bounds reflect larger content safely.

Requirements: R07, R14.

## Dependencies and required reading

Phase 02 gate passed; read its evidence before editing.

- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [specs/MYSTERY-CONTRACT.md](../specs/MYSTERY-CONTRACT.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

## Concrete implementation steps

1. Change the shared fact border-box y from 846 to 886; retain x=470, width=1240 and height=156. Keep title, counter, brand and timer anchors unchanged.

2. Apply per-layout arena heights: Media 570, Visual 536, Pure 608, Split 553, Verdict 565, Full Stack 528, Mystery 757. Do not move the common origin (380,253).

3. Replace blanket arena-vs-timerProtection collision assumptions with phase-aware active rectangles. A Pure Visual badge below y=804 is intentional; overlap with an active fact card is not.

4. Extract shared phase markup/visibility ownership so phase 9 can omit Mystery fact markup without duplicating production and sandbox policies.

5. Preserve the 54px general safe zone and add a documented fact-only 38px bottom allowance. Keep text sizes unchanged and bound lower shadow/glow to 16px; avoid downward fact bounce.

6. Verify fixed anchors with mascot on/off and multiple skins. Do not compensate for collisions by shifting the brand rail or header.

7. Update geometry/markup/browser tests and run a current preview of a fact-bearing layout after rebuilding the affected package.

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
- `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts` (proposed)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] All fact-bearing active layouts have y=886 and bottom=1042.
- [ ] Question/counter/brand/timer coordinates remain unchanged.
- [ ] Fact text and effects remain visible at the bottom; no global QA suppression was introduced.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Fact movement and frame protections are measured, not merely asserted from generated CSS strings.

## Deliverables

Frame integration and browser assertions, evidence/phase-03.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
