# Phase 4 Unified Choice Rendering Test Matrix

Use these IDs in tests or the Phase 4 handoff.

## Semantic renderer

| ID        | Priority      | Case                                  | Required result                                                |
| --------- | ------------- | ------------------------------------- | -------------------------------------------------------------- |
| P4-SEM-01 | MUST_AUTOMATE | Stable choice order and labels        | A/B/C follow normalized order                                  |
| P4-SEM-02 | MUST_AUTOMATE | Canonical correct ID after reordering | Correct state follows ID, not index or text                    |
| P4-SEM-03 | MUST_AUTOMATE | Question/choices/thinking phases      | Normal or pending state; no reveal leakage                     |
| P4-SEM-04 | MUST_AUTOMATE | Reveal/explain phases                 | Correct and incorrect state emitted once                       |
| P4-SEM-05 | MUST_AUTOMATE | Untrusted text and attributes         | Escaped consistently                                           |
| P4-SEM-06 | MUST_AUTOMATE | Text tiers with mascot on/off         | Phase 1 thresholds or intentionally migrated shared thresholds |
| P4-SEM-07 | MUST_AUTOMATE | Missing visual media                  | Deterministic non-broken fallback retains label/text           |

## Skin contract

| ID         | Priority      | Case                           | Required result                                               |
| ---------- | ------------- | ------------------------------ | ------------------------------------------------------------- |
| P4-SKIN-01 | MUST_AUTOMATE | Enum versus skin registry      | Exact parity excluding `auto`                                 |
| P4-SKIN-02 | MUST_AUTOMATE | Every skin with text content   | Stable semantic markup plus selected skin hook                |
| P4-SKIN-03 | MUST_AUTOMATE | Every skin with visual content | Same semantic markup plus selected skin hook and media        |
| P4-SKIN-04 | MUST_AUTOMATE | Auto/missing skin              | Compatibility default remains `glossy_arcade`                 |
| P4-SKIN-05 | MUST_AUTOMATE | Skin responsibility            | No skin repeats list iteration or canonical state calculation |
| P4-SKIN-06 | VERIFY_VISUAL | Intended visual-skin parity    | Visual cards visibly reflect each selected skin               |

## Layout and surface migration

| ID        | Priority      | Case                   | Required result                                                       |
| --------- | ------------- | ---------------------- | --------------------------------------------------------------------- |
| P4-LAY-01 | MUST_AUTOMATE | Layout slot type       | One `choicesHtml` slot; no active split choice slots                  |
| P4-LAY-02 | MUST_AUTOMATE | Baseline renderer      | Unified choices included with preview compatibility                   |
| P4-LAY-03 | MUST_AUTOMATE | Media-left renderer    | Unified text choices and media arranged correctly                     |
| P4-LAY-04 | MUST_AUTOMATE | Visual-three renderer  | Unified visual choices arranged correctly                             |
| P4-SUR-01 | MUST_AUTOMATE | Production composition | Shared renderer used; old text/visual functions absent from call path |
| P4-SUR-02 | MUST_AUTOMATE | Sandbox composition    | Shared renderer used; duplicate visual renderer removed               |
| P4-SUR-03 | MUST_AUTOMATE | Matching reveal state  | Production and Sandbox semantic choice output agrees                  |

## Domain and responsive regression

| ID        | Priority      | Case                 | Required result                                              |
| --------- | ------------- | -------------------- | ------------------------------------------------------------ |
| P4-DOM-01 | MUST_AUTOMATE | Two text choices     | Supported and rendered                                       |
| P4-DOM-02 | MUST_AUTOMATE | Three text choices   | Supported and rendered                                       |
| P4-DOM-03 | MUST_AUTOMATE | Three visual choices | Supported and rendered                                       |
| P4-DOM-04 | MUST_AUTOMATE | Four choices         | Still rejected before renderer                               |
| P4-RSP-01 | VERIFY_VISUAL | 16:9 pairwise set    | All skins covered across representative phases/mascot states |
| P4-RSP-02 | VERIFY_VISUAL | 9:16 pairwise set    | All skins covered across representative phases/mascot states |
| P4-RSP-03 | MUST_AUTOMATE | Reduced motion       | State remains understandable without decorative animation    |

## Workflow evidence

Record focused renderer/registry/layout tests, full workspace gates, Sandbox preview for every skin in text and visual modes, and production compositions covering both layouts, both aspect ratios, reveal state, missing media, and mascot on/off.
