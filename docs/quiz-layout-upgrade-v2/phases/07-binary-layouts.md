# Phase 07: Split Versus and Verdict

Status: not started

## Objective

Use centered text-only answer surfaces with balanced larger imagery.

Requirements: R04, R05.

## Dependencies and required reading

Phase 06 gate passed; read its evidence before editing.

- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [specs/ANSWER-SURFACES.md](../specs/ANSWER-SURFACES.md)

## Concrete implementation steps

1. Split: keep columns at 380/1154. Grow images to 646x421, viewport 622x397, with four rounded 32px corners.

2. Move answer surfaces from y=619 to y=684, retain 646x122, round all corners 32px and keep the 10px separation from image bottom.

3. Set the image+answer envelope to 646x553. Remove obsolete squared joining corners, clipped shadows and letter badge margins.

4. Keep the VS emblem distinct from answer-letter badges and align its 96px box to the image center at y=463.5.

5. Preserve the existing text-only Split fallback bounds; omit its badges too, without fabricating image areas or changing question semantics.

6. Verdict: grow hero to 820x565 and center two 560x164 answers at y=349.5/557.5 with 44px gap.

7. Show only True and False labels; remove letter badges and existing check/cross pseudo-content. Correctness must still depend on correct_choice_id, not position or color.

8. Verify both correct-answer positions, text-only versus visual Split, all skins and the fact dock; do not swap True/False order as a side effect.

## File ownership

- `apps/server/src/quiz/render/layouts/splitVersusTwo.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/splitVersusTwo/splitVersusTwoChoiceStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/splitVersusTwo/splitVersusTwoBaseStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/splitVersusTwo/splitVersusTwoAnimationStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/verdictTrueFalse/verdictTrueFalseBaseStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/verdictTrueFalse/verdictTrueFalseButtonStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/verdictTrueFalse/verdictTrueFalseAnimationStyles.ts` (existing)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Split answer +65, media +55, all corner radii nonzero.
- [ ] Verdict hero and answer-group centers both equal 535.5.
- [ ] No A/B labels or reserved badge spacing remain in either binary layout.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Binary layouts match the spec, including text fallback and semantic correctness.

## Deliverables

Binary layout styles and renderer tests, evidence/phase-07.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
