# Phase 1 Characterization Test Matrix

Use case IDs in test names or the Phase 1 handoff so coverage can be audited without relying on file position.

## Priority meanings

- MUST_AUTOMATE: required executable evidence before Phase 1 completes.
- VERIFY_EXISTING: an existing test may satisfy the case; add nothing if evidence is already precise.
- RECORD_ONLY: document the current observation unless a stable, low-cost automated assertion is available.

## Domain and resolver

| ID   | Priority        | Case                                          | Current expected observation                                      |
| ---- | --------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| D-01 | VERIFY_EXISTING | true_false with two choices                   | Accepted                                                          |
| D-02 | VERIFY_EXISTING | non-true_false with three choices             | Accepted                                                          |
| D-03 | MUST_AUTOMATE   | non-true_false with four choices              | Rejected before rendering                                         |
| D-04 | VERIFY_EXISTING | Sandbox request with four choices             | Rejected by Sandbox schema                                        |
| R-01 | MUST_AUTOMATE   | auto plus ordinary text/illustrated archetype | media_left_choices_right                                          |
| R-02 | MUST_AUTOMATE   | auto plus visual_multiple_choice              | visual_choices_three                                              |
| R-03 | MUST_AUTOMATE   | auto plus odd_one_out format                  | visual_choices_three                                              |
| R-04 | MUST_AUTOMATE   | explicit layout request                       | Returned unchanged even when catalog compatibility is not checked |
| R-05 | RECORD_ONLY     | supportsQuizLayoutChoiceCount usage           | No production caller found at dossier snapshot                    |

## Layout registry and slots

| ID   | Priority        | Case                                              | Current expected observation                               |
| ---- | --------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| L-01 | VERIFY_EXISTING | production catalog IDs versus server renderer IDs | Exact parity excluding baseline                            |
| L-02 | MUST_AUTOMATE   | baseline body                                     | Includes question, hero, text choices, phase               |
| L-03 | VERIFY_EXISTING | media_left body                                   | Includes hero and text choices; excludes visual choices    |
| L-04 | VERIFY_EXISTING | visual-three body                                 | Includes visual choices; excludes hero and text choices    |
| L-05 | MUST_AUTOMATE   | renderer dimensions                               | Stable current dimensions for all three registered layouts |
| L-06 | RECORD_ONLY     | optimizer metrics                                 | Hard-coded by layout string rather than derived capability |

## Choice and skin rendering

| ID   | Priority        | Case                                                 | Current expected observation                                             |
| ---- | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| C-01 | MUST_AUTOMATE   | production auto/glossy text path                     | Uses base answer-card markup rather than ac-glossy-arcade variant markup |
| C-02 | MUST_AUTOMATE   | production explicit non-default text skin            | Emits selected variant class and canonical answer states                 |
| C-03 | MUST_AUTOMATE   | production visual choices under a selected text skin | Visual markup remains base visual-answer-card structure                  |
| C-04 | MUST_AUTOMATE   | Sandbox text skin                                    | Emits selected Answer Card variant class                                 |
| C-05 | MUST_AUTOMATE   | Sandbox visual layout with selected Answer Card skin | Visual markup remains base visual-answer-card structure                  |
| C-06 | MUST_AUTOMATE   | Answer Card enum IDs versus registry IDs             | Exact parity excluding auto                                              |
| C-07 | MUST_AUTOMATE   | auto/missing Answer Card style                       | Resolves to glossy_arcade                                                |
| C-08 | VERIFY_EXISTING | canonical correct choice state                       | Derived from correct_choice_id, not label text or position               |

## Phase, typography, aspect ratio, and mascot

| ID   | Priority        | Case                                              | Current expected observation                          |
| ---- | --------------- | ------------------------------------------------- | ----------------------------------------------------- |
| P-01 | VERIFY_EXISTING | Sandbox question phase                            | Choice grid hidden                                    |
| P-02 | VERIFY_EXISTING | Sandbox choices/thinking phase                    | Normal choices visible; timer present when applicable |
| P-03 | VERIFY_EXISTING | Sandbox reveal phase                              | Correct and incorrect classes visible                 |
| P-04 | VERIFY_EXISTING | Sandbox explain phase                             | Reveal states plus fact card                          |
| T-01 | MUST_AUTOMATE   | short/medium/long/very-long/overflow choice tiers | Deterministic current thresholds                      |
| T-02 | MUST_AUTOMATE   | mascot versus no-mascot tiering                   | Mascot uses tighter current thresholds                |
| T-03 | RECORD_ONLY     | layoutId passed to textLayout                     | Does not currently alter calculated tier or metrics   |
| A-01 | VERIFY_EXISTING | 16:9 layout CSS                                   | Both production layout selectors emitted              |
| A-02 | MUST_AUTOMATE   | 9:16 layout CSS                                   | Portrait-specific selectors emitted for both layouts  |
| M-01 | VERIFY_EXISTING | mascot bottom-left versus bottom-right            | One shared Mascot-on content layout                   |

## Preview and UI synchronization

| ID   | Priority        | Case                                            | Current expected observation                            |
| ---- | --------------- | ----------------------------------------------- | ------------------------------------------------------- |
| U-01 | VERIFY_EXISTING | shared production layouts versus UI definitions | Unique exhaustive mapping                               |
| U-02 | VERIFY_EXISTING | Director-selected question layout               | Reaches Episode Preview request                         |
| U-03 | VERIFY_EXISTING | inferred question layout                        | Matches current format/archetype resolver               |
| U-04 | MUST_AUTOMATE   | Sandbox selected layout mutation                | Next preview request carries the new layout             |
| U-05 | VERIFY_EXISTING | superseded preview response                     | Cannot overwrite the latest selected question/layout    |
| U-06 | RECORD_ONLY     | current two-button selector                     | Adequate for two layouts; scalability redesign deferred |

## Tokens and background

| ID   | Priority        | Case                                             | Current expected observation                                  |
| ---- | --------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| B-01 | RECORD_ONLY     | production versus Sandbox palette variable names | Serialization is duplicated and names are not fully aligned   |
| B-02 | RECORD_ONLY     | production versus Sandbox background layers      | Markup is duplicated; Sandbox emits an additional shape layer |
| B-03 | VERIFY_EXISTING | reduced-motion CSS                               | Composition emits a reduced-motion override                   |

## Minimum pairwise render set

Avoid the complete Cartesian product. At minimum, obtain structural or visual evidence for:

| Case  | Layout                   | Skin                   | Phase    | Aspect | Mascot        |
| ----- | ------------------------ | ---------------------- | -------- | ------ | ------------- |
| PW-01 | media_left_choices_right | glossy_arcade          | choices  | 16:9   | absent        |
| PW-02 | media_left_choices_right | comic_chunky           | reveal   | 16:9   | present left  |
| PW-03 | media_left_choices_right | glass_neon             | explain  | 9:16   | present right |
| PW-04 | media_left_choices_right | minimal_soft           | thinking | 9:16   | absent        |
| PW-05 | visual_choices_three     | glossy_arcade selected | choices  | 16:9   | absent        |
| PW-06 | visual_choices_three     | comic_chunky selected  | reveal   | 9:16   | present left  |

For visual cases, the expected As-Is result is that the selected Answer Card skin does not alter visual-choice markup. This is a characterized migration target, not desired final behavior.
