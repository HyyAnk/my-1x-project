# As-Is Quiz Visual System Map

Snapshot date: 2026-08-31

Observed baseline: branch main, commit fd8e877

This document describes the current implementation before Phase 1. Fresh tasks must verify it against current source before relying on it.

## System flow

    QuizV2 and DirectorPlan
        ↓
    candyArcadeTemplate.resolveScene
        ↓ resolves palette, layout, foreground motion, transition
    buildCandyArcadeCompositionBundle
        ↓ resolves per-beat element styles and timeline values
    questionClip
        ↓ renders question, both choice representations, phase, chrome, mascot
    renderQuizLayoutBody
        ↓ selected layout chooses pre-rendered HTML slots
    candyArcadeCss plus all registered variant CSS
        ↓
    HyperFrames HTML composition and final video

The web preview uses a separate path:

    SandboxPreviewInput
        ↓
    buildSandboxComposition
        ↓ separately resolves and renders elements, choices, scene chrome, and tokens
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

packages/shared/src/quizLayouts.ts owns the production catalog. Each entry currently declares:

- id;
- one choiceMode value, text or visual;
- supportedChoiceCounts;
- recommendedFormats.

resolveQuizLayoutId selects visual_choices_three for visual_multiple_choice or odd_one_out when requestedLayout is auto; every other auto case becomes media_left_choices_right. Explicit layout requests are returned without compatibility checks.

supportsQuizLayoutChoiceCount exists, but repository search at this snapshot found no caller outside its definition. supportedChoiceCounts and recommendedFormats therefore document intent without enforcing it in Director validation, QA, preview, or rendering.

## Layout rendering

apps/server/src/quiz/render/layouts contains:

- types.ts: QuizLayoutSlots and QuizLayoutRenderDefinition;
- registry.ts: baseline plus both production renderers;
- baseline.ts: preview-only compatibility layout;
- mediaLeftChoicesRight.ts;
- visualChoicesThree.ts.

QuizLayoutSlots requires all of these strings even when a layout does not use them:

- questionBoxHtml;
- heroHtml;
- textChoicesHtml;
- visualChoicesHtml;
- phaseHtml.

questionClip renders text answers and visual answers for every question before the layout selects one slot. The media-left layout uses heroHtml and textChoicesHtml. The visual-three layout uses visualChoicesHtml and omits heroHtml.

QUIZ_LAYOUT_DIMENSIONS manually repeats renderer dimensions in registry.ts. candyArcadeHeroAreaRatio special-cases visual_choices_three. imageOptimizer.ts independently hard-codes dimensions by layout string.

## Production choice rendering

apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts contains two paths:

- answerCards renders text choices;
- visualAnswerCards renders visual choices.

answerCards has another internal split:

- auto and glossy_arcade use bespoke base markup;
- other explicit styles call the Answer Card variant registry.

The variant input receives choices as string arrays and has no visual-choice model. Production visualAnswerCards does not receive answerCardStyle, so selected Answer Card skins do not apply to visual layouts.

Production choice markup is emitted with reveal-state classes. Timeline CSS determines when reveal styling becomes visible.

## Sandbox choice rendering

buildSandboxComposition always resolves an Answer Card variant for text choices. It separately calls renderSandboxVisualChoices for visual layouts. The visual Sandbox renderer does not consume the selected Answer Card variant.

Consequences:

- default glossy text markup differs between Sandbox and production;
- visual choices ignore the selected Answer Card style in both paths;
- state, escaping, tiering, status icons, and wrappers are duplicated;
- preview/production parity is not guaranteed by construction.

## Element registries

The server has independent registries for:

- Thinking Bar;
- Question Box;
- Counter Badge;
- Answer Card.

All use VisualElementVariant-style contracts with id, display metadata, renderHtml, and renderCss. Registries resolve auto or missing values to a default variant and concatenate every variant's CSS into the composition.

Answer Card variants repeat list mapping, correct/incorrect state selection, text tier calculation, escaping, letter generation, and most structural markup. Comic Chunky adds meaningful custom decorations; the other variants mostly differ through CSS.

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

Web and server code resolve auto, channel defaults, episode settings, and beat overrides in more than one place. Phase 1 records this behavior; centralization belongs to a later phase.

## CSS, typography, and background

candyArcadeStyles.ts contains base component CSS, layout CSS injection, global state CSS, background CSS, typography tiers, and registered skin CSS.

Layout modules currently target internal Answer Card selectors and set padding, badge size, border width, and font size. This couples layout geometry to skin implementation.

textLayout accepts layoutId in TextLayoutOptions, but its calculation currently depends on role and hasMascot rather than layoutId. Layout-specific font sizing is then repeated in layout CSS. Visual QA calls textLayout without selected-layout capacity.

Production and Sandbox serialize palette variables separately. At this snapshot production uses names including --badge and --ink, while Sandbox emits --answer-badge and --text. The shared CSS primarily consumes production names.

Scene background markup and CSS are fixed rather than registry-driven. Production and Sandbox duplicate background layer markup; Sandbox includes a second shape that production questionClip does not emit.

## Web layout surfaces

apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts provides exhaustive UI metadata for the two production layouts. The Sandbox selector renders a fixed two-column button grid and branches between two icons. Episode and Stage Studio preview code resolve metadata from the same UI catalog.

This is adequate for two layouts but does not scale to a large catalog. UI redesign is outside Phase 1.

## Existing verification surfaces

The most relevant server tests are:

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

Phase 1 added an explicit deterministic baseline for layout resolution and dimensions, slot selection, production and Sandbox choice-skin divergence, phase behavior, text tiers, portrait CSS, reduced motion, preview mutation synchronization, and the six pairwise render cases. The broader existing suites continue to cover mascot geometry, selected layout propagation, stale preview response handling, schemas, and CSS contracts.

## Confirmed coupling gaps

1. Layout capabilities are declared but not enforced.
2. Text and visual choices use separate renderers.
3. Answer Card variants mix repeated workflow logic with skin concerns.
4. Layout CSS reaches into skin internals.
5. Sandbox and production assemble scenes separately.
6. Palette token serialization is duplicated and inconsistent.
7. Background layers are fixed and duplicated.
8. Layout-specific dimensions are repeated across render and optimization code.
9. Supporting four choices is blocked by domain contracts, not only layout code.

Phase 1 must characterize these facts without fixing them.
