# Quiz Visual Compatibility Matrix

Status: As-Is baseline for Phase 1

The tables record current behavior, not the desired target. Phase 1 converts these observations into executable tests.

## Layout catalog and rendered slots

| Layout                   | Scope                      |     Catalog mode |          Counts | Recommended formats                      | Rendered content                    |      9:16 CSS |    Mascot CSS |
| ------------------------ | -------------------------- | ---------------: | --------------: | ---------------------------------------- | ----------------------------------- | ------------: | ------------: |
| baseline                 | Preview compatibility only | text by behavior | 2 or 3 by input | Not cataloged                            | question, hero, text choices, phase | Base fallback | Base fallback |
| media_left_choices_right | Production                 |             text |            2, 3 | multiple_choice, image_guess, true_false | question, hero, text choices, phase |           Yes |           Yes |
| visual_choices_three     | Production                 |           visual |               3 | odd_one_out                              | question, visual choices, phase     |           Yes |           Yes |

Explicit incompatible layout requests are currently accepted by resolveQuizLayoutId. The table expresses catalog intent, not enforced policy.

## Format and canonical count

| Format          | Canonical count | Auto layout under ordinary archetype | Notes                                           |
| --------------- | --------------: | ------------------------------------ | ----------------------------------------------- |
| multiple_choice |               3 | media_left_choices_right             | Visual archetype can force visual_choices_three |
| image_guess     |               3 | media_left_choices_right             | Uses hero media intent                          |
| true_false      |               2 | media_left_choices_right             | Only current two-choice domain case             |
| odd_one_out     |               3 | visual_choices_three                 | Uses visual option assets                       |

## Answer Card skin behavior

| Skin          | Production text                 | Sandbox text                    | Production visual     | Sandbox visual        |
| ------------- | ------------------------------- | ------------------------------- | --------------------- | --------------------- |
| glossy_arcade | Bespoke base answer-card markup | ac-glossy-arcade variant markup | Base visual card only | Base visual card only |
| comic_chunky  | Variant markup and skin         | Variant markup and skin         | Selected skin ignored | Selected skin ignored |
| glass_neon    | Variant markup and skin         | Variant markup and skin         | Selected skin ignored | Selected skin ignored |
| minimal_soft  | Variant markup and skin         | Variant markup and skin         | Selected skin ignored | Selected skin ignored |

## Phase behavior

| Surface                 | question                                                               | choices              | thinking                     | reveal                            | explain                                  |
| ----------------------- | ---------------------------------------------------------------------- | -------------------- | ---------------------------- | --------------------------------- | ---------------------------------------- |
| Production questionClip | Markup contains canonical reveal state; CSS timing controls visibility | Same scene markup    | Same scene markup plus timer | Reveal CSS becomes visible        | Fact/reward timing becomes visible       |
| Sandbox                 | Choice grid hidden                                                     | Normal state visible | Normal state plus timer      | Correct/incorrect classes visible | Correct/incorrect plus fact card visible |

## Aspect ratio and occupancy cases

Phase 1 must preserve evidence for these dimensions:

| Dimension           | Values                                            |
| ------------------- | ------------------------------------------------- |
| Aspect ratio        | 16:9, 9:16                                        |
| Mascot occupancy    | absent, present bottom-left, present bottom-right |
| Text choice count   | 2, 3                                              |
| Visual choice count | 3                                                 |
| Text tier           | short, medium, long, very_long, overflow          |

Bottom-left and bottom-right mascot anchors currently share one Mascot-on content layout. Anchor-specific differences belong to the mascot layer, not the quiz content geometry.

## Element registry coverage

| Element       | Registered styles |       Auto/default behavior currently tested |
| ------------- | ----------------: | -------------------------------------------: |
| Thinking Bar  |                 6 |                                    Partially |
| Question Box  |                 4 |                                          Yes |
| Counter Badge |                 4 |                                          Yes |
| Answer Card   |                 4 | Indirectly; no complete registry parity test |

Phase 1 should add explicit Answer Card registry parity without expanding the Cartesian product of every style combination unnecessarily.

## Known unsupported or unproven combinations

- Four choices are rejected by shared and Sandbox schemas.
- Visual choices do not receive selected Answer Card skins.
- mixed text/visual choice presentation has no contract.
- Catalog count and format compatibility is not enforced.
- Selected-layout-aware typography QA is not proven.
- Sandbox/production markup parity is not guaranteed.
- Background variants do not exist.
