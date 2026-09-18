# Architecture and implementation boundaries

## Current coupling observed

- Image dimensions live in packages/shared/src/quizImageSizing/geometry.ts, while scene rectangles live in server layoutContentGeometry.ts.
- imageSlotStyles.ts emits canonical image variables, but individual layouts still hardcode group heights, label positions and fallback sizes.
- quizLayouts.catalog.ts contains static asset metrics; sandboxLayoutRequirements.ts reads these metrics directly instead of the sizing policy. Updating only renderer CSS leaves misleading UI recommendations.
- renderChoiceGroup.ts places badges and text on the same painted surface; text-mode outer cards also own skin classes.
- Mystery supports 0/1/2/3 answers in the layout catalog and CSS, but QuizQuestionSchema requires three choices except for true/false. Bank data/translation schemas have a minimum of two.
- buildQuizVoicePlan always emits a choice segment. Repository scene validation independently enforces episode-level choice counts.
- calculateThinkingBarTiming derives duration from revealStart. Adding reveal delay alone stretches the timer instead of creating a blank gap.
- Both candyArcadeClips.ts and sandboxComposition.ts construct fact markup. Hiding only one path creates preview/render divergence.
- Sandbox timing has hardcoded phase boundaries separate from production events.

## Target dependency direction

```text
Shared primitive types and answer-mode policy
       |
       +-> Shared layout rectangles -> image-slot geometry -> sizing policy
       |                                        |                 |
       |                                        +-> catalog/UI <--+
       |
       +-> Validated question -> voice/asset plans -> timeline events
                                                     |
Shared geometry + resolved scene state + skin --------+
                         |
                  common scene parts
                     /         \
             production       sandbox
```

No shared package module imports server or React. Geometry imports only stable types/enums; never runtime catalog functions that themselves import sizing.

## Concrete seams

1. Add packages/shared/src/quizLayoutGeometry/{types,frame,layouts,choiceGeometry,index}.ts, or a demonstrably equivalent existing cohesive boundary.
   - Own border-box rectangles, image insets, answer variant sizes, label policy and arena bounds.
   - Derive repeat-column and centered-stack values with pure functions.
   - Reuse the shared rectangle type in server frame types.
   - Keep server layoutContentGeometry.ts as a small compatibility export for current imports, with no independent numbers. Remove it only after all consumers move in the same change.
2. Derive quizImageSizing/geometry.ts from shared media bounds. Keep policy.ts's existing minimax ratio algorithm; add tests, not a second chooser.
3. Extract choiceSurfaceMarkup.ts and detachedChoiceStyles.ts from the rendering boundary.
   - Outer .choice-card owns IDs, semantic state and whole-answer motion.
   - Badge and painted text surface are siblings for detached variants.
   - Skin colors/decorations attach to the correct visual surface; skins cannot alter canonical dimensions.
   - Text-only variants omit badge markup and badge-specific decoration hooks.
4. Add quizAnswerMode.ts with one validation/cardinality policy. Wire schema, bridge, QA, remix and persistence through it.
5. Add quizRevealTiming.ts with pure time calculations shared by production and sandbox.
   - Pass timerHideAt explicitly through timeline/scene/render contracts.
   - Keep the timer's existing clipStart origin. Never emulate a gap with opacity hacks tied to unrelated timestamps.
6. Extract renderQuizScenePhaseParts.ts so production and sandbox share the fact-visibility policy. Geometry and visibility are separate responsibilities.
7. Extend promptFramingRules.ts to accept resolved layout/image geometry context; do not put crop math in provider adapters.
8. Keep UI mutation/sync behavior in hooks; keep components thin.

## Failure and state policy

- Invalid single_reveal question: structured validation error before generation or render, preserving editor input.
- Unsupported ratio/provider capability: explicit error; do not silently substitute 1:1.
- Text cannot fit at minimum font: return overflow with shorten-answer action. Never silently truncate a correct answer.
- New image request fails: preserve request/prompt; safe retry uses stable idempotency inputs.
- Preview request races: latest request wins, including font verification and iframe commit.
- Failed/stale preview: preserve last successful preview and current inputs; show compact status and retry.
- Missing media/fonts: block verified preview/render, not a silently accepted placeholder.
- Unsupported old Mystery records: explain that new generation is required; do not migrate, delete or fabricate distractors.

## Oversized-file rule

Several touched files exceed 200 lines. In particular, layout modules, candyArcadeClips.ts, sandboxComposition.ts, promptCompiler.ts, timing.ts and voicePlan.ts should receive small integration changes into focused helpers, not additional mixed responsibilities. Keep all unrelated code intact.

## Rollout boundary

This is a coordinated local upgrade for new generation, not a database migration or deployment project. Do not expose half-upgraded controls as complete. Update fixture expectations narrowly and regenerate visual baselines only after inspecting intentional diffs.
