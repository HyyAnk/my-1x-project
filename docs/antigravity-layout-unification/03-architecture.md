# Architecture and Source Map

## Existing responsibilities

| Boundary                         | Existing source                                                                                                                     | Relevant behavior                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Capabilities and media metrics   | `packages/shared/src/quizLayouts.catalog.ts`                                                                                        | Eight active layouts, allowed counts/presentations/aspects, render/asset metrics       |
| Layout selection                 | `packages/shared/src/quizLayouts.policy.ts`                                                                                         | Compatibility and auto selection; preserve these semantics                             |
| HTML slots and renderer contract | `apps/server/src/quiz/render/layouts/types.ts`, `registry.ts`                                                                       | `QuizLayoutSlots`, `QuizLayoutRenderDefinition`, `renderQuizLayoutBody`                |
| Layout geometry                  | `apps/server/src/quiz/render/layouts/*.ts`                                                                                          | Each currently consumes question and phase slots in addition to media/choices          |
| Specialized layout CSS           | `apps/server/src/quiz/render/layouts/styles/`                                                                                       | Split, Mystery, Clue blocks include independent question/phase geometry                |
| Shared CSS assembly              | `apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts`                                                                      | Base styles, mascot overrides, layout CSS, skin CSS, background CSS; already oversized |
| Shared element rendering         | `apps/server/src/quiz/render/scene/renderQuizSceneParts.ts`                                                                         | Question, counter, hero, branding, choices, thinking parts                             |
| Scene model to parts             | `apps/server/src/quiz/render/scene/buildQuizSceneParts.ts`                                                                          | Question text layout, forced landscape occupancy, fact text and visibility             |
| Production question composition  | `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`                                                                       | `questionClip`, phase HTML, common `.game-stage`, header, brand, mascot                |
| Sandbox entry                    | `apps/server/src/quiz/render/sandboxComposition.ts`                                                                                 | Snapshot and rehearsal generate fact/timer slots separately                            |
| Sandbox document                 | `apps/server/src/quiz/render/sandbox/sandboxDocumentTemplates.ts`                                                                   | Shared stage shell plus mode-specific style/timing overrides                           |
| Channel brand                    | `apps/server/src/quiz/render/candyArcade/channelBrandMark.ts`, `channelBrandMarkStyles.ts`                                          | Intrinsic sizing, YouTube icon, name fitting, landscape visibility                     |
| Current font/readiness barrier   | `apps/server/src/quiz/render/candyArcade/candyArcadeFonts.ts`                                                                       | Font wait then choice fit before render-ready flags                                    |
| Choice rendering and fitting     | `apps/server/src/quiz/render/choices/`                                                                                              | Group state, semantic IDs, shared typography and DOM fit measurement                   |
| Element skin system              | `apps/server/src/quiz/visual/elements/`, `apps/server/src/quiz/visual/styleModules/`                                                | Active/pinned style CSS; preserve skin selection and revisions                         |
| Video checking                   | `apps/server/src/tasks/video/videoLayoutChecker.ts`                                                                                 | Checkpoint reuse and HyperFrames checks; no fast-mode QA bypass for this change        |
| Preview refresh                  | `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`, `apps/web/src/features/episode/hooks/useEpisodeStylePreview.ts` | Existing asynchronous preview consumers; regression-test, do not redesign              |

## Measured baseline

At local t=2 seconds, 1920 x 1080 sandbox snapshot, default skins, no mascot:

| Layout                    | Question width | Unanimated question y | Timer x | Timer y | Timer width |
| ------------------------- | -------------- | --------------------- | ------- | ------- | ----------- |
| media_left_choices_right  | 1420           | 53                    | 470     | 822     | 1240        |
| visual_choices_three      | 1380           | 45                    | 470     | 652     | 1240        |
| visual_choices_three_pure | 1380           | 45                    | 470     | 766     | 1240        |
| split_versus_two          | 1380           | 45                    | 450     | 787     | 1280        |
| verdict_true_false        | 1380           | 53                    | 460     | 785     | 1260        |
| full_stack_list           | 1360           | 49                    | 480     | 897     | 1220        |
| mystery_reveal            | 1380           | 45                    | 540     | 848     | 1100        |
| clue_deduction            | 1380           | 49                    | 500     | 825     | 1180        |

Timer height=84 in all measured cases. Values rounded to the nearest pixel; raw measurements are in `evidence/current-layout-measurements.json`. Question motion accounts for its sampled y being about 2.456 px above the anchor.

## Proposed focused modules

Create under `apps/server/src/quiz/render/frame/`:

| File                        | Responsibility                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| `quizFrame.types.ts`        | Immutable rectangle, fixed-role, and frame-slot contracts                   |
| `landscapeFrameGeometry.ts` | Canonical fixed shell constants only                                        |
| `renderQuizFrameBody.ts`    | Shared wrappers around question/content/phase HTML; no timing/data fetching |
| `quizFrameStyles.ts`        | Scoped fixed-anchor CSS, internal resets, and coordinate-safe timer exit    |

Create `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts` for the eight content definitions. Split it into per-layout geometry files if it grows beyond cohesive limits. Keep layout markup in existing per-layout files.

Create `apps/server/src/quiz/render/facts/` with `factTextFitPolicy.ts` (pure fitting search) and `factTextFitScript.ts` (DOM measurement/readiness integration). Do not hide DOM I/O in a generic utility file.

## Compatibility-preserving integration

Keep `renderQuizLayoutBody(layoutId, slots)` and `QuizLayoutSlots` usable by existing callers. Internally, each migrated layout calls `renderQuizFrameBody(slots, contentHtml)`. Only `contentHtml` is layout-specific. Its rendering may inspect the existing choice group count/presentation via existing CSS classes; it must not parse HTML strings or infer the correct answer.

For migrated landscape layouts, production and both sandbox modes wrap timer and fact separately with `renderQuizPhaseSlots(thinkingHtml, factHtml)` **before** passing their combined HTML as `phaseHtml`. Baseline and non-migrated paths retain their legacy phase HTML structure. Do not split combined HTML with regex. Each function receives already escaped/trusted renderer output.

Suggested markup anatomy:

```html
<section class="candy-scene quiz-question-clip quiz-frame-unified layout-media_left_choices_right">
  <!-- Existing background and timed clip attributes stay unchanged -->
  <header class="game-header" data-quiz-fixed="counter">...</header>
  <div class="game-stage">
    <div class="quiz-question-anchor" data-quiz-fixed="question">...</div>
    <div class="quiz-content-anchor" data-quiz-content>...</div>
    <div class="phase-region">
      <div class="quiz-thinking-anchor" data-quiz-fixed="thinking">...</div>
      <div class="quiz-fact-anchor" data-quiz-fixed="fact">...</div>
    </div>
  </div>
  <div class="channel-brand-mark" data-quiz-fixed="brand">...</div>
  <!-- Existing mascot and reward effects stay in their current layer -->
</section>
```

This is an anatomy example, not literal replacement HTML. Preserve existing tags, classes, escaped content, data attributes, and accessibility semantics. Empty phase slots may remain as invisible wrappers; do not create visible timer/fact content in a hidden phase. The brand node may be absent under its existing visibility policy.

Add `quiz-frame-unified` only for active landscape layouts through a typed `isUnifiedQuizFrame(layoutId, aspectRatio)` helper shared by production and sandbox builders. Do not rely on `:has()` or per-layout ancestor padding for fixed positioning.

## CSS ownership and migration traps

1. Remove migrated `.game-stage` grid ownership and fixed element positioning from all eight layout files. Their grid/flex rules move to `.quiz-content-anchor` and its children.
2. Scope shared shell rules under `.quiz-frame-unified`. Keep legacy/baseline/portrait behavior intact. Make `.game-stage` fill the canvas with zero margin/padding, independent of the scene's current `33px 80px 16px` padding.
3. Do not append more responsibilities to the large `candyArcadeStyles.ts`; integrate one imported frame CSS fragment and remove/guard conflicting migrated rules.
4. `.has-mascot` currently changes title/phase widths. It must not override the shared shell, even though parts currently force landscape choice occupancy. Test actual with/without mascot DOM, not only class presence.
5. Element skin CSS is emitted after layout CSS. Audit computed styles under every registered skin; do not assume source order alone wins. Fixed wrappers own geometry; skins own their internal appearance.
6. Snapshot fact HTML currently hardcodes `transform: translateX(-50%)`, while layout CSS expects other centering. Remove coordinate-bearing inline transforms in the migrated snapshot path, not just production CSS.
7. Current `timer-exit-fade` contains `translateX(-50%)`; moving positioning to an outer anchor requires a new inner-only exit (opacity/scale), otherwise the bar jumps sideways at the end. Preserve the duration and timing, not that centering transform.
8. Mystery's `.mystery-revealed-inner` currently fixes width=1100. Rebind every masked/unmasked layer to the same 920 x 360 viewport. Clue's hero, answer and phase descendant selectors also need migration.
9. Do not use new `data-layout-ignore`, allow-occlusion flags, overflow clipping, or blanket `!important` rules to silence genuine collisions. Existing intentionally masked layers may retain precisely scoped allowances.
10. `QUIZ_LAYOUT_CATALOG.metrics.render` feeds `candyArcadeHeroAreaRatio` and asset-related consumers. Reconcile metrics with actual rendered visual regions; do not report answer text/background area as hero media. Keep accepted media kinds/counts and asset resolution ceilings unchanged unless a specific test proves adjustment necessary.

## Data and failure boundaries

The source of truth remains quiz/director/timeline/style context -> scene model -> scene parts -> shared shell plus content renderer. No new database fields or persisted layout copies.

Fit failures must pass through the existing readiness and preview/render error boundaries with a question ID and actionable message. Browser font failure is not text overflow. A failed fit must not set `__renderReady` to true, produce a partial video, or invalidate unrelated user edits.

Store measurement evidence outside runtime outputs. Rebuild/restart affected processes before preview verification. Inspect source fingerprint/checkpoint reuse to confirm the changed composition is used; do not manually delete unrelated caches.
