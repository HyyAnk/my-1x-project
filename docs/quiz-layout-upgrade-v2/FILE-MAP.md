# Concrete file impact map

All paths in this document and data/file-manifest.json are repository-relative. The manifest contains 153 verified existing paths and 13 proposed paths. Existing means the path was present on 2026-09-16; it does not mean every file must change.

## Ownership and required changes

| Area                    | Primary files                                                                                                                                                  | Required integration                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Shared geometry         | packages/shared/src/quizImageSizing/geometry.ts; proposed quizLayoutGeometry modules                                                                           | Move numeric ownership to shared rectangles; derive real viewports, card envelopes and CSS variables |
| Catalog                 | packages/shared/src/quizLayouts.catalog.ts; quizLayouts.types.ts; quizLayouts.policy.ts                                                                        | Correct counts, Mystery media policy, dynamic sizing and static fallback metadata                    |
| Frame                   | apps/server/src/quiz/render/frame/landscapeFrameGeometry.ts; quizFrameStyles.ts; renderQuizFrameBody.ts                                                        | Fact y=886; per-layout arena; no empty Mystery fact anchor; phase-aware protections                  |
| Layout contract         | apps/server/src/quiz/render/layouts/layoutContentGeometry.ts; imageSlotStyles.ts                                                                               | Derive rather than duplicate; include badge overflow in envelopes                                    |
| Answer markup           | apps/server/src/quiz/render/choices/renderChoiceGroup.ts; choiceGroup.types.ts                                                                                 | Explicit decoration variant, detached siblings, absent badges where prohibited                       |
| Answer behavior         | baseChoiceStyles.ts; choiceStateStyles.ts; choiceTypographyStyles.ts; choiceTextFitScript.ts                                                                   | Match new structure; measure actual text surface; reject overflow                                    |
| Answer skins            | apps/server/src/quiz/visual/elements/answerCard/registry.ts; types.ts; registered variants                                                                     | Audit direct-child and outer-surface assumptions for every skin; preserve IDs                        |
| Text layouts            | mediaLeftChoicesRight.ts; fullStackList.ts                                                                                                                     | Exact recentering/spacing, badge sizes and shorter text surfaces                                     |
| Visual layouts          | visualChoicesThree.ts; styles/visualChoicesThreePure/*                                                                                                         | Media dimensions, answer positions, floating badge bounds, animation clearance                       |
| Binary layouts          | styles/splitVersusTwo/_; styles/verdictTrueFalse/_                                                                                                             | Fully rounded independent boxes; no labels/suffix icons; correct centers                             |
| Mystery visuals         | layouts/mysteryReveal.ts; styles/mysteryReveal/*                                                                                                               | One answer, 540px stage, exact content rect, no dormant multi-choice CSS                             |
| Quiz schema             | packages/shared/src/schemas/quiz/quizQuestions.ts; proposed quizAnswerMode.ts                                                                                  | Explicit answer_mode, exact single-reveal validation                                                 |
| Bank schema             | packages/shared/src/schemas/questionBank.ts                                                                                                                    | Mystery count 1; translation exact-ID validation                                                     |
| Persistence             | schemas/episode.ts; schemas/config.ts; server repository/scenes.ts; sceneCodec.ts                                                                              | Preserve mode through scene/editor serialization; mode-aware cardinality                             |
| Bank conversion         | bank/bridge/bankQuestionConverter.ts; bankDirectorPlanFactory.ts; singleQuestionBridge.ts; topicEpisodeConfig.ts                                               | Carry one answer and mode; no padding/truncation; preserve correct ID                                |
| Generation              | bank/prompts/archetypePromptGuidelines.ts; standardBatchPromptBuilder.ts; reverseMatrixPromptBuilder.ts; batchPromptOutputParser.ts                            | One-answer instructions and strict parser; no "three plausible choices" Mystery text                 |
| Other generation        | context/quizDirectPromptBuilder.ts; pipeline/remix/*; bank/transcreation/transcreationPrompt.ts                                                                | Direct/remix/translation retain mode/cardinality                                                     |
| Domain/QA               | quiz/domain/quiz.ts; quizArtifactSynthesizer.ts; qa/stages/assessSemanticQa.ts                                                                                 | Per-question semantics, no episode-only/global count check                                           |
| Voice                   | quiz/audio/voicePlan.ts; pipeline/stages/assetsVoiceStages.ts                                                                                                  | Omit choice narration for Mystery; preserve explanation/fact                                         |
| Timeline                | timeline/compilers/questionCompiler.ts; question/compileChoicesBeat.ts; compileThinkingCountdownBeat.ts; compileAnswerRevealBeat.ts; compileExplanationBeat.ts | Independent timerHideAt; exact 0.5s gap; no wrong-option/fact-visual event for Mystery               |
| Timer renderer          | visual/elements/thinkingBar/types.ts; all registered thinking-bar variants                                                                                     | Preserve clipStart origin; end at timerHideAt, not revealStart                                       |
| Time adapters           | packages/shared/src/timing.ts; render/candyArcade/candyArcadeQuestionTimeline.ts; candyArcadeClips.ts; render/scene/*                                          | Carry timing fields and layout-aware state end to end                                                |
| Sandbox renderer        | render/sandboxComposition.ts; render/sandbox/sandboxRehearsalScript.ts                                                                                         | Same visual policy and timestamps as production; deterministic backward seek                         |
| Assets                  | quiz/assets/assetPlanner.ts; promptFramingRules.ts; promptCompiler.ts; assetFingerprint.ts                                                                     | Ratio, safe framing, cache identity; no extra Mystery choice assets                                  |
| Asset adapters          | ensureQuizAssetSizing.ts; reconcileQuizAssetSizing.ts; tasks/imageRunner.ts; providers/gpti2*, imgstudio/*, codexImage.ts                                      | Verify new request propagation; change adapters only if contract requires it                         |
| Sandbox UI              | useSandboxLayoutSync.ts; useSandboxPreviewRenderer.ts; timeline hooks; SandboxChoicesEditor.tsx; SandboxQuestionInputs.tsx                                     | One-answer editing, no early narration, derived timing, preserved state on failure                   |
| Requirements/wireframes | sandboxLayoutRequirements.ts; SandboxImageRequirements.tsx; quizLayoutUiCatalog.ts; QuizLayoutWireframe.tsx; layoutPreviewCatalog.ts; layoutMiniature.css      | Accurate ratio/fit/size and only one Mystery answer in preview icons                                 |
| Other previews          | episode/services/buildEpisodePreviewRequest.ts; episode/utils/episodePreviewQuestions.ts; QuestionBank editors/form utilities                                  | Correct mode and count through every UI entry point                                                  |
| Test harness            | test/helpers/visualSnapshotHarness.ts; imageSlotMeasurement.ts                                                                                                 | Real image viewports, one-answer Mystery fixture, boundary frame coverage                            |
| Tests                   | All qa-area manifest entries                                                                                                                                   | Update intentional assertions; add exact target and timing regressions                               |

Paths abbreviated in this table are resolved by the machine manifest, not guessed during implementation.

## Mandatory bounded discovery before editing

The manifest cannot enumerate dynamic registry members or files introduced after planning. Use CodeGraph first, then targeted searches for uncovered details:

```powershell
rg -n 'quizChoiceCountForFormat|bankRequiredChoiceCountForArchetype|mystery_reveal' packages/shared/src apps/server/src apps/web/src
rg -n 'calculateThinkingBarTiming|revealStart|timer-duration' apps/server/src/quiz/visual/elements/thinkingBar
rg -n 'choice-label|choice-card-surface|answer-card' apps/server/src/quiz/visual/elements/answerCard/variants
rg -n 'buildQuizVoicePlan|compileQuizAssetPrompt|assetFingerprint' apps/server/src
rg -n 'answer-count-[023]|3 choices|three choices' apps/server/src/quiz/render/layouts/styles/mysteryReveal apps/server/src/quiz/bank/prompts
```

Review matches contextually. Do not delete global count-2/count-3 rules or ordinary three-choice prompts. Add newly discovered in-scope paths to the manifest and phase report.

## Data artifacts

Update the writers/readers, not existing user data:

- quiz JSON: add answer_mode for new Mystery questions.
- Bank JSON and translations: one answer with preserved ID.
- scene_plan.md quiz payload: carry mode and answer consistently.
- voice plan: no Mystery :choice segment.
- timeline: record independent timer-hide/reveal timestamps.
- asset plan and generated metadata: new geometry key, ratio and recommendation.
- render checkpoint/source fingerprint: new render inputs invalidate stale proof for this new run.
- sandbox/preset payload: exactly one Mystery answer.
- visual snapshot PNGs: regenerate only expected changed cases after visual inspection.

Never perform a blanket channels/ or bank data rewrite. The choice audit script's --fix mode is not part of this plan.
