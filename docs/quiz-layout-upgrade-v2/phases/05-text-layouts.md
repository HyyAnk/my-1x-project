# Phase 05: Media Left and Full Stack implementation

Status: not started

## Objective

Apply exact hero growth and more readable stacked answers while preserving anchor intent.

Requirements: R01, R06.

## Dependencies and required reading

Phase 04 gate passed; read its evidence before editing.

- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [specs/ANSWER-SURFACES.md](../specs/ANSWER-SURFACES.md)
- [data/layout-targets.json](../data/layout-targets.json)

## Concrete implementation steps

1. Extract layout geometry CSS into focused modules if existing large layout files would otherwise grow. Keep unrelated animations intact until envelope checks require a bounded adjustment.

2. Media Left: grow the hero to 720x570 with 696x546 content. Center its 3-answer 468px stack at y=304/472/640 and 2-answer stack at y=366/558.

3. Apply detached badge/text dimensions exactly: 132/108 heights for three answers and 152/124 for two. Preserve row gaps 36/40.

4. Full Stack: lock first assembly y=275, set B=458 and C=641; 140px envelopes with 43px gaps. Remove old vertical-centering behavior that would shift A.

5. Apply 140px badges and 116px text surfaces for the three-answer list. Two-answer support keeps A=329 and moves B to 548 with a 55px gap.

6. Check correct-choice state and full-group transforms at entrance, rest and reveal peak. Whole-answer movement must not separate badge from text.

7. Run two- and three-answer fixtures, short and long answers, all answer skins, mascot on/off, and the lower fact dock.

## File ownership

- `apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts` (existing)
- `apps/server/src/quiz/render/layouts/fullStackList.ts` (existing)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Media hero bottom=823; three answer rows moved exactly +30 from baseline.
- [ ] Full Stack A did not move; B moved +15 and C +30.
- [ ] No answer text truncates or collides with badge; fact region remains clear.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Both layouts match measured target rectangles and retain stable behavior across supported counts.

## Deliverables

Updated text layout modules, geometry screenshots/tests, evidence/phase-05.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
