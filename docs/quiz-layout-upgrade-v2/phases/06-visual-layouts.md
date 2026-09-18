# Phase 06: Three-choice visual layouts

Status: not started

## Objective

Expand both three-image layouts and make the answer identifiers clear without wasting image space.

Requirements: R02, R03.

## Dependencies and required reading

Phase 05 gate passed; read its evidence before editing.

- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [specs/ANSWER-SURFACES.md](../specs/ANSWER-SURFACES.md)
- [specs/IMAGE-GENERATION.md](../specs/IMAGE-GENERATION.md)

## Concrete implementation steps

1. Visual Card: keep column x positions and media y=253; grow media height to 411 and viewport to 432x391.

2. Move answer assembly top from 625 to 685, not the whole card. Use badge=104, surface=360x86 at columnX+92,y=694, and 21px media/answer separation.

3. Update composite card and parent grid to 452x536. Eliminate old 504px max-height constraints and negative label margins that conflict with target geometry.

4. Pure Visual: grow media to 452x564, content 432x544. Place 88px badge center at (columnCenter,817), top=773, bottom=861.

5. Make Pure Visual's card envelope 452x608 while keeping the media mask separate. Remove every old top-left badge position from active landscape styling.

6. Ensure the image is clipped to rounded media corners but badge remains visible outside media. Text stays nonvisual without breaking font readiness/accessibility.

7. Inspect motion peaks with fact at y=886. Reduce only the conflicting motion/shadow envelope, not image height or badge position.

8. Verify three independent image subjects, matched visual styles, correct choice in each position, 1:1 versus 3:4 asset recommendations and fallback-image dimensions.

## File ownership

- `apps/server/src/quiz/render/layouts/visualChoicesThree.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/visualChoicesThreePure/visualChoicesThreePureCardStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/visualChoicesThreePure/visualChoicesThreePureBaseStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/visualChoicesThreePure/visualChoicesThreePureAnimationStyles.ts` (existing)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Visual Card answer top moved +60 and image height +55.
- [ ] Pure Visual image height +60; badge centers exactly on image bottom.
- [ ] No parent clips bottom badges; image/card distinction is measured by browser tests.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Both layouts pass geometric and visual collision tests at rest and reveal peaks.

## Deliverables

Visual layout styles, measured image/badge fixtures, evidence/phase-06.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
