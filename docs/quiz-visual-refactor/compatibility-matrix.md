# Quiz Visual Compatibility Matrix

Status: Phase 8 acceptance-closed executable policy and cross-surface rendering contract

The production rows below are owned by `QUIZ_LAYOUT_CATALOG`. `baseline` is deliberately separate in `QUIZ_PREVIEW_BASELINE_CAPABILITY` and cannot parse as a persisted production layout ID.

`packages/shared/src/quizLayouts.catalog.ts` is the sole owner of render and asset dimensions. CSS, hero-area calculations, QA, optimization, and preview consumers read those metrics directly; no server dimensions table or legacy dimensions export remains.

## Layout capabilities and metrics

| Layout                   | Scope        | Presentation | Counts | Supported formats                                     | Recommended formats                      | Media             | Aspects    | Render metric | Asset metric |
| ------------------------ | ------------ | ------------ | -----: | ----------------------------------------------------- | ---------------------------------------- | ----------------- | ---------- | ------------- | ------------ |
| baseline                 | Preview only | text         |   2, 3 | multiple_choice, image_guess, true_false, odd_one_out | none                                     | question required | 16:9, 9:16 | 800×284 × 1   | 1080×608     |
| media_left_choices_right | Production   | text         |   2, 3 | multiple_choice, image_guess, true_false, odd_one_out | multiple_choice, image_guess, true_false | question required | 16:9, 9:16 | 840×580 × 1   | 1080×810     |
| visual_choices_three     | Production   | visual       |      3 | multiple_choice, image_guess, odd_one_out             | odd_one_out                              | choice required   | 16:9, 9:16 | 501×500 × 3   | 640×480 each |
| media_top_choices_bottom | Production   | text         |   2, 3 | multiple_choice, image_guess, true_false              | image_guess, multiple_choice             | question optional | 16:9, 9:16 | 840×360 × 1   | 1080×608     |
| full_stack_list          | Production   | text         |   2, 3 | multiple_choice, true_false                           | multiple_choice, true_false              | none              | 16:9, 9:16 | 1440×720 × 1  | none         |

Supported formats determine validity. Recommended formats are advisory only: visual multiple-choice is supported by `visual_choices_three` even though only `odd_one_out` is recommended.

## Resolution behavior

| Request                                                        | Result                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| auto + ordinary text/media semantics                           | media_left_choices_right                               |
| auto + visual_multiple_choice or odd_one_out                   | visual_choices_three                                   |
| explicit + compatible capabilities                             | requested ID                                           |
| explicit + incompatible presentation/count/format/media/aspect | structured failure; requested ID retained; no fallback |
| auto + no compatible candidate                                 | layout_no_compatible_candidate                         |
| baseline through production persisted ID schema                | rejected                                               |
| baseline through Sandbox preview schema                        | accepted                                               |

Compatibility issues carry a stable code, failed capability, actual value, supported values, message, and next action. Director and QA map those reasons to stable blocker codes without rewriting the plan. The Sandbox HTTP boundary returns `QUIZ_LAYOUT_INCOMPATIBLE` plus the same issue records.

## Format and canonical count

| Format          | Canonical count | Auto layout under ordinary archetype | Notes                                         |
| --------------- | --------------: | ------------------------------------ | --------------------------------------------- |
| multiple_choice |               3 | media_left_choices_right             | Visual archetype selects visual_choices_three |
| image_guess     |               3 | media_left_choices_right             | Uses question media intent                    |
| true_false      |               2 | media_left_choices_right             | Only current two-choice domain case           |
| odd_one_out     |               3 | visual_choices_three                 | Uses visual option media                      |

## Answer Card skin behavior

All four surfaces use the same semantic choice-group renderer. The selected skin contributes hooks and CSS without owning workflow logic.

| Skin          | Production text | Sandbox text | Production visual | Sandbox visual |
| ------------- | --------------- | ------------ | ----------------- | -------------- |
| glossy_arcade | Supported       | Supported    | Supported         | Supported      |
| comic_chunky  | Supported       | Supported    | Supported         | Supported      |
| glass_neon    | Supported       | Supported    | Supported         | Supported      |
| minimal_soft  | Supported       | Supported    | Supported         | Supported      |

## Phase behavior

Both surfaces map into one `QuizSceneState` contract. Production derives it from compiled event boundaries; Sandbox derives it from explicit phase or the unchanged 1.2/2.5/7.5/8.8-second scrub boundaries.

| Surface                 | question                                                               | choices              | thinking                     | reveal                            | explain                                  |
| ----------------------- | ---------------------------------------------------------------------- | -------------------- | ---------------------------- | --------------------------------- | ---------------------------------------- |
| Production questionClip | Markup contains canonical reveal state; CSS timing controls visibility | Same scene markup    | Same scene markup plus timer | Reveal CSS becomes visible        | Fact/reward timing becomes visible       |
| Sandbox                 | Choice grid hidden                                                     | Normal state visible | Normal state plus timer      | Correct/incorrect classes visible | Correct/incorrect plus fact card visible |

## Aspect ratio and occupancy cases

| Dimension           | Values                                            |
| ------------------- | ------------------------------------------------- |
| Aspect ratio        | 16:9, 9:16                                        |
| Mascot occupancy    | absent, present bottom-left, present bottom-right |
| Text choice count   | 2, 3                                              |
| Visual choice count | 3                                                 |
| Text tier           | short, medium, long, very_long, overflow          |

All four production layouts declare both current aspect ratios. Bottom-left and bottom-right mascot anchors still share one Mascot-on content layout.

## Background behavior

Production and Sandbox resolve the same registered variants and emit one canonical `.quiz-scene-background` layer with a stable `data-background-style` ID. Composition CSS assembly includes only variants used by that composition, in registry order and at most once.

| Background    | Production | Sandbox   | Reduced motion  | CSS assembly        |
| ------------- | ---------- | --------- | --------------- | ------------------- |
| `candy_rays`  | Supported  | Supported | Static fallback | Selected-only, once |
| `aurora_glow` | Supported  | Supported | Static fallback | Selected-only, once |

## Known unsupported or deferred combinations

- Four choices remain rejected by shared and Sandbox schemas.
- Mixed text/visual items are representable by the renderer content contract but no current persisted layout selects a mixed presentation.
- Selected-layout typography capacity remains limited to the current renderer metrics and 2/3-choice count policy.
- Sandbox/production semantic model, stable parts, semantic choice markup, state, escaping, tiers, and media fallback are shared.
- The legacy background adapter is removed; the registry and canonical semantic layer are the only background renderer/CSS path.
