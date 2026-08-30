# Phase 5 CSS and Preset Test Matrix

Use these IDs in tests or the Phase 5 handoff.

## CSS ownership

| ID        | Priority      | Case            | Required result                                                          |
| --------- | ------------- | --------------- | ------------------------------------------------------------------------ |
| P5-CSS-01 | MUST_AUTOMATE | Layout CSS      | Owns placement, dimensions, gaps, aspect rules, and capacity tokens only |
| P5-CSS-02 | MUST_AUTOMATE | Base choice CSS | Owns stable internal structure independent of skin/layout                |
| P5-CSS-03 | MUST_AUTOMATE | State CSS       | Correct/incorrect/pending/reveal semantics shared across skins           |
| P5-CSS-04 | MUST_AUTOMATE | Typography CSS  | One tier system consumes capacity tokens                                 |
| P5-CSS-05 | MUST_AUTOMATE | Skin CSS        | Owns decoration without outer layout placement                           |
| P5-CSS-06 | MUST_AUTOMATE | Normal cascade  | No cross-layer `!important` dependency                                   |
| P5-CSS-07 | MUST_AUTOMATE | CSS assembly    | Required base and variant blocks included once, deterministically        |

## Tokens and responsive capacity

| ID        | Priority      | Case                                 | Required result                                            |
| --------- | ------------- | ------------------------------------ | ---------------------------------------------------------- |
| P5-TOK-01 | MUST_AUTOMATE | Production/Sandbox palette variables | Same semantic names and values for same palette            |
| P5-TOK-02 | MUST_AUTOMATE | Missing token                        | Defined compatibility fallback; no invalid CSS             |
| P5-TOK-03 | MUST_AUTOMATE | 16:9 capacity                        | Both layouts publish complete capacity tokens              |
| P5-TOK-04 | MUST_AUTOMATE | 9:16 capacity                        | Both layouts publish complete portrait tokens              |
| P5-TOK-05 | MUST_AUTOMATE | Mascot occupancy                     | Capacity changes through layout tokens, not skin overrides |
| P5-TOK-06 | MUST_AUTOMATE | Text tiers                           | Short through overflow consume shared tier rules           |

## Style and preset resolution

| ID        | Priority      | Case                                      | Required result                                           |
| --------- | ------------- | ----------------------------------------- | --------------------------------------------------------- |
| P5-RES-01 | MUST_AUTOMATE | Theme defaults only                       | Deterministic fully resolved style                        |
| P5-RES-02 | MUST_AUTOMATE | Channel defaults                          | Override theme defaults                                   |
| P5-RES-03 | MUST_AUTOMATE | Selected preset/episode values            | Override channel defaults                                 |
| P5-RES-04 | MUST_AUTOMATE | Explicit episode custom values            | Override inherited preset values                          |
| P5-RES-05 | MUST_AUTOMATE | Director beat values                      | Override all lower layers for that beat                   |
| P5-RES-06 | MUST_AUTOMATE | `auto` and missing values                 | Inherit rather than erase lower resolved values           |
| P5-RES-07 | MUST_AUTOMATE | Production versus Episode/Sandbox preview | Same inputs resolve identical style IDs and palette       |
| P5-RES-08 | MUST_AUTOMATE | Preset preview layout                     | Affects showcase preview only, never production layout    |
| P5-RES-09 | MUST_AUTOMATE | Legacy `layout_id` preset field           | Read through compatibility adapter with removal condition |

## Visual and workflow regression

| ID        | Priority      | Case                               | Required result                                            |
| --------- | ------------- | ---------------------------------- | ---------------------------------------------------------- |
| P5-VIS-01 | VERIFY_VISUAL | Four skins across existing layouts | Decoration preserved without geometry collision            |
| P5-VIS-02 | VERIFY_VISUAL | 16:9 and 9:16                      | No overflow, clipping, or unreadable tiers                 |
| P5-VIS-03 | VERIFY_VISUAL | Mascot on/off and both anchors     | Layout capacity remains stable                             |
| P5-VIS-04 | MUST_AUTOMATE | Reduced motion                     | Status remains visible and decorative motion is suppressed |
| P5-VIS-05 | MUST_AUTOMATE | Phase states                       | Cascade does not hide or prematurely reveal state          |

## Workflow evidence

Record focused resolver/CSS tests, full workspace gates, production and Sandbox renders for the pairwise matrix, CSS assembly size/deduplication evidence, and explicit review of every intentional visual diff.
