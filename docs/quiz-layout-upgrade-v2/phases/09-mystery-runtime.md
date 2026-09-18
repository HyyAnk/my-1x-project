# Phase 09: Mystery image, timing and narration

Status: not started

## Objective

Implement the full single-answer experience and prove no visual/audio answer leak.

Requirements: R07, R08, R09, R10, R11.

## Dependencies and required reading

Phase 08 gate passed; read its evidence before editing.

- [specs/MYSTERY-CONTRACT.md](../specs/MYSTERY-CONTRACT.md)
- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

## Concrete implementation steps

1. Build the 920x540 stage with one 880x500 inner slot and centered 880x495 16:9 content. Remove inherited nested hero borders and duplicate sizing constraints.

2. Use identical pixel registration for mosaic/silhouette and revealed image layers; retain concealment until the exact reveal start.

3. Place the sole text-only answer at (630,890,920,120). Remove Mystery 0/2/3 branches, wrong-choice animations and extra +0.12 answer delay.

4. Omit :choice narration and choices.enter behavior for single_reveal. Ensure countdown readiness still waits for question narration.

5. Introduce explicit timerHideAt and a pure shared timing plan. Preserve timer start at clipStart; finish its 0.28s exit by T; start reveal at T+0.5.

6. Wire timerHideAt through timeline events/bounds, scene timing, timer variants, CSS variables, production and sandbox. Do not fix just one renderer.

7. Keep answer/explanation/fact narration. Do not emit visual fact markup or an empty fact dock for Mystery. Separate narration scheduling from fact.enter visual intent.

8. Derive Mystery sandbox phase times and jump timestamps from the same policy. Test forward play, backward seek, pause/resume, loop and reduced motion.

9. Use measured audio durations; preserve exact gap even if earlier narration shifts the countdown. Reject countdown audio that cannot fit its validated fixed window.

10. Inspect boundary frames at T-1/fps, T, T+0.25, R-1/fps, R and R+0.85, with audio event assertions.

## File ownership

- `packages/shared/src/timing.ts` (existing)
- `packages/shared/src/schemas/quiz/quizTimings.ts` (existing)
- `apps/server/src/quiz/audio/voicePlan.ts` (existing)
- `apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts` (existing)
- `apps/server/src/quiz/timeline/compilers/questionCompiler.ts` (existing)
- `apps/server/src/quiz/timeline/compilers/question/compileChoicesBeat.ts` (existing)
- `apps/server/src/quiz/timeline/compilers/question/compileThinkingCountdownBeat.ts` (existing)
- `apps/server/src/quiz/timeline/compilers/question/compileAnswerRevealBeat.ts` (existing)
- `apps/server/src/quiz/timeline/compilers/question/compileExplanationBeat.ts` (existing)
- `apps/server/src/quiz/visual/elements/thinkingBar/types.ts` (existing)
- `apps/server/src/quiz/render/candyArcade/candyArcadeQuestionTimeline.ts` (existing)
- `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts` (existing)
- `apps/server/src/quiz/render/scene/quizScene.types.ts` (existing)
- `apps/server/src/quiz/render/scene/quizSceneState.ts` (existing)
- `apps/server/src/quiz/render/scene/buildQuizSceneRenderModel.ts` (existing)
- `apps/server/src/quiz/render/scene/buildQuizSceneParts.ts` (existing)
- `apps/server/src/quiz/render/scene/renderQuizSceneParts.ts` (existing)
- `apps/server/src/quiz/render/scene/productionSceneAdapter.ts` (existing)
- `apps/server/src/quiz/render/scene/productionSceneStateAdapter.ts` (existing)
- `apps/server/src/quiz/render/scene/sandboxSceneAdapter.ts` (existing)
- `apps/server/src/quiz/render/scene/sandboxSceneStateAdapter.ts` (existing)
- `apps/server/src/quiz/render/sandboxComposition.ts` (existing)
- `apps/server/src/quiz/render/sandbox/sandboxRehearsalScript.ts` (existing)
- `apps/server/src/quiz/render/layouts/mysteryReveal.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealBaseStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealChoiceStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealPhaseStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealStageStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealRevealMotionStyles.ts` (existing)
- `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealAnimationStyles.ts` (existing)
- `packages/shared/src/quizRevealTiming.ts` (proposed)
- `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts` (proposed)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Stage height grew exactly 180; answer border-box bottom gap=70.
- [ ] No timer/answer simultaneous visibility; gap exactly 0.5s in logical timing.
- [ ] No early answer voice; no visual fact; explanation/fact voice remains.
- [ ] Masked/revealed images do not jump in scale or position under seek.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Mystery passes domain-to-render tests and temporal pixel assertions, not merely a settled screenshot.

## Deliverables

Mystery runtime/timing helpers, boundary captures, evidence/phase-09.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
