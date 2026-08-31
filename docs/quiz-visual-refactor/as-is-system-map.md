# As-Is Quiz Visual System Map

Snapshot date: 2026-08-31

Observed Phase 8D execution: branch main, commit 595fc3f, with the cumulative Phase 2–8 implementation uncommitted

This document describes the Phase 8 acceptance-closed implementation. Fresh tasks must still verify it against current source before relying on it.

## System flow

    QuizV2 and DirectorPlan
        ↓
    resolveQuestionLayout
        ↓ returns the accepted Phase 2 capability result once
    candyArcadeTemplate.resolveScene
        ↓ resolves palette, foreground motion, and transition around that layout ID
    buildCandyArcadeCompositionBundle
        ↓ resolves per-beat element styles and timeline values
    questionClip
        ↓ production state adapter and buildQuizSceneRenderModel
    buildQuizSceneParts
        ↓ shared question, counter, hero, choices, phase, brand, and occupancy semantics
    renderChoiceGroup
        ↓ one semantic choicesHtml slot selected by the accepted layout
    candyArcadeCss plus selected background CSS and registered component/skin CSS
        ↓
    HyperFrames HTML composition and final video

The web preview uses the same model and parts through a separate surface adapter:

    SandboxPreviewInput
        ↓ schema/capability validation and Sandbox phase/scrub adapter
    buildSandboxComposition
        ↓ buildQuizSceneRenderModel and buildQuizSceneParts
    renderChoiceGroup and the canonical background registry renderer
    preview HTML returned to the web application

## Canonical quiz and choice constraints

packages/shared/src/schemas/common.ts defines:

- minimum choices: 2;
- standard choices: 3;
- true/false choices: 2;
- maximum choices: 3.

packages/shared/src/schemas/quiz.ts enforces exactly two choices for true_false and exactly three for all other current formats. Four-choice layouts therefore require a separate domain migration; they cannot be introduced as a renderer-only change.

Quiz choice records contain only id and text. Visual option assets are planned and resolved outside the canonical choice object.

## Layout identification and metadata

packages/shared/src/enums.ts declares the persisted layout IDs:

- auto
- media_left_choices_right
- visual_choices_three
- media_top_choices_bottom
- full_stack_list

packages/shared/src/quizLayouts.ts is the public barrel for the production capability contract. The contract is split by responsibility across `quizLayouts.types.ts`, `quizLayouts.catalog.ts`, and `quizLayouts.policy.ts`. Each production entry declares:

- id;
- supported choice presentations;
- supportedChoiceCounts;
- supported formats;
- recommendedFormats.
- supported and required media kinds;
- supported aspect ratios;
- canonical render and asset metrics.

`resolveQuizLayout` preserves the Phase 1 auto policy: `visual_choices_three` for `visual_multiple_choice` or `odd_one_out`, and `media_left_choices_right` otherwise. It tests every candidate against the capability contract. Compatible results and structured incompatibility results are discriminated by `ok`; incompatible explicit requests retain their requested ID in the failure result and are never replaced silently.

Supported formats are validity policy while recommended formats remain advisory. The legacy resolver and unused choice-count helper have no remaining caller and were removed in Phase 2.

## Layout rendering

apps/server/src/quiz/render/layouts contains:

- types.ts: QuizLayoutSlots and QuizLayoutRenderDefinition;
- registry.ts: baseline plus all four production renderers;
- baseline.ts: preview-only compatibility layout;
- mediaLeftChoicesRight.ts;
- visualChoicesThree.ts;
- mediaTopChoicesBottom.ts;
- fullStackList.ts.

QuizLayoutSlots has one active choice contract:

- questionBoxHtml;
- heroHtml;
- choicesHtml;
- phaseHtml.

Baseline and `media_left_choices_right` use `heroHtml` plus `choicesHtml`. `visual_choices_three` uses the same `choicesHtml` slot and omits `heroHtml`. The former text/visual split-slot adapter has no remaining caller and was removed. No downstream renderer resolves layout compatibility again.

Renderer definitions own HTML and layout CSS only. `packages/shared/src/quizLayouts.catalog.ts` is the sole owner of render and asset dimensions. `candyArcadeCss`, `candyArcadeHeroAreaRatio`, image optimization, QA, and preview consumers read its metrics directly; the former `QUIZ_LAYOUT_DIMENSIONS` and `CANDY_ARCADE_LAYOUT_DIMENSIONS` views are removed. `baseline` remains a separate preview-only capability and renderer.

Director validation and visual QA call the same shared resolver through a thin server adapter. Director artifacts still parse with the unchanged persisted ID schema; incompatible explicit beats produce stable blocker codes and next actions without rewriting stored plans. QA evaluates the selected layout capacity before layout-specific checks.

## Production choice rendering

`questionClip` adapts production data into the shared scene model and calls `renderQuizSceneChoicePart`. That function resolves the selected Answer Card skin and delegates all text or visual content to `renderChoiceGroup`.

The group renderer sorts normalized choices by `order`, assigns A/B/C labels, derives correctness from canonical choice ID, maps phase state, escapes text and attributes, assigns typography tiers, and emits deterministic media fallback. Production retains compiled timeline ownership: `revealStart` is supplied to the scene snapshot so the canonical reveal classes become visible at the existing CSS boundary.

## Sandbox choice rendering

`buildSandboxComposition` uses its surface/state adapter, the shared scene model and parts, and the same `renderQuizSceneChoicePart` used by production. Text and visual Sandbox previews therefore emit the same semantic group/card structure and selected-skin hook as production. The Sandbox schema and API boundary still evaluate layout capabilities before rendering and return `QUIZ_LAYOUT_INCOMPATIBLE` with structured issues for invalid combinations.

## Element registries

The server has independent registries for:

- Thinking Bar;
- Question Box;
- Counter Badge;
- Answer Card.

Thinking Bar, Question Box, and Counter Badge retain their HTML-rendering variant contracts. Answer Card now uses a narrower `AnswerCardSkin` contract: id/display metadata, a stable skin class, optional per-card class/decorative hooks, and CSS. Registries resolve auto or missing Answer Card styles to `glossy_arcade` and concatenate every skin's CSS into the composition.

No Answer Card skin owns list iteration, correctness, phase workflow, escaping, labels, content type, tiers, or media fallback. Comic Chunky supplies its decorations through the bounded hook; all four registered skins consume the same semantic text and visual markup.

## Presets and style resolution

packages/shared/src/presets.ts defines VisualPresetItem. A preset bundles:

- theme;
- palette;
- Thinking Bar style;
- Question Box style;
- Answer Card style;
- Counter Badge style;
- optional preview layout and mascot presentation values.

preview_layout_id is documented as a Sandbox showcase choice. Production episodes continue resolving layout from question/director semantics. This separation is intentional and preserved by ADR-001.

Web and server code call the shared pure `resolveQuizStyle`/`resolveBeatQuizStyle` policy. The explicit production style context preserves Theme, Channel, Episode, Override, and Beat layers plus provenance across the video runner, renderer, composition, preview, and persistence boundaries.

## CSS, typography, and background

`candyArcadeStyles.ts` assembles base scene CSS with focused layout, shared choice base/state/typography, registered element/skin, selected background, brand, font, and mascot CSS owners.

Layout modules own placement, outer geometry, gaps, aspect adaptation, and capacity tokens. They do not select Answer Card skins or own decorative skin rules.

Shared typography tiers consume layout capacity tokens. Visual QA and renderer calculations consume the accepted capability rather than a parallel layout-dimension table.

Production and Sandbox use the shared palette serializer, including compatibility aliases for persisted output, so precedence and CSS variables remain deterministic across surfaces.

Production and Sandbox call the same background registry and emit one `.quiz-scene-background` semantic layer. Composition CSS includes only selected variants in registry order. The caller-free Phase 7 legacy adapter and its decoration export were removed in Phase 8D.

## Web layout surfaces

`apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts` provides exhaustive UI metadata for all four production layouts. The Sandbox selector is a scalable accessible combobox with keyboard, touch, immediate acknowledgement, and latest-request-wins preview behavior. Episode and Stage Studio preview code resolve metadata from the same UI catalog.

Background selection, Channel synchronization, responsive mobile/desktop layout, pending/error/retry states, and the exact responsive footer are covered by component and running-browser evidence.

## Existing verification surfaces

The most relevant server tests are:

- quizLayoutCapabilities.test.ts;
- quizLayoutPreviewRoute.test.ts;
- quizLayoutRegistry.test.ts;
- sandboxComposition.test.ts;
- quizVisualContractsCharacterization.test.ts;
- sandboxVisualCharacterization.test.ts;
- candyArcadeVisualRegression.test.ts;
- candyArcade.test.ts.

The most relevant web tests are:

- stageStudio/questionLayouts.test.ts;
- episode/utils/episodePreviewQuestions.test.ts;
- sandbox/hooks/useSandboxDesignState.test.ts;
- sandbox/hooks/useSandboxPreviewRenderer.test.tsx;
- episode/hooks/useEpisodeStylePreview.test.tsx.

Phase 1 added the deterministic characterization baseline. Phases 2–7 added capability, shared model/state, renderer, CSS, layout/UI, and background evidence. Phase 8 adds production-boundary, persistence, cross-surface parity, running-browser, visual artifact, and final cleanup contracts while retaining all earlier suites.

## Acceptance-closed boundaries and remaining risk

1. Production and Sandbox intentionally retain separate document/timeline presentation while sharing normalized scene, semantic parts, choice rendering, style resolution, background rendering, and catalog policy.
2. Layout dimensions have one canonical owner and no compatibility view.
3. Backgrounds have one registry/semantic path and no legacy adapter.
4. Structure analysis still reports large modules, but the Phase 8 modules reviewed are cohesive by responsibility; no mechanical split was justified.
5. Supporting four choices remains blocked by domain, generation, timing, history, API, QA, and layout contracts and is a separate `DEFERRED` project.
