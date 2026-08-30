# Phase 6 New Layouts and UI Test Matrix

Use these IDs in tests or the Phase 6 handoff.

## Shared catalog and compatibility

| ID        | Priority      | Case                                    | Required result                                                      |
| --------- | ------------- | --------------------------------------- | -------------------------------------------------------------------- |
| P6-CAT-01 | MUST_AUTOMATE | Layout schema IDs                       | Existing IDs plus both new IDs parse exhaustively                    |
| P6-CAT-02 | MUST_AUTOMATE | Catalog/renderer/UI parity              | Exact parity for four production layouts                             |
| P6-CAT-03 | MUST_AUTOMATE | `media_top_choices_bottom` capabilities | Text, counts 2/3, declared formats/media/aspects/metrics             |
| P6-CAT-04 | MUST_AUTOMATE | `full_stack_list` capabilities          | Text, counts 2/3, declared formats/no-required-media/aspects/metrics |
| P6-CAT-05 | MUST_AUTOMATE | Existing auto cases                     | Same layout results as Phase 1/2                                     |
| P6-CAT-06 | MUST_AUTOMATE | Explicit new compatible request         | Requested ID preserved and rendered                                  |
| P6-CAT-07 | MUST_AUTOMATE | Explicit new incompatible request       | Structured Phase 2 incompatibility                                   |
| P6-CAT-08 | MUST_AUTOMATE | Four choices                            | Still rejected by domain schema                                      |
| P6-CAT-09 | MUST_AUTOMATE | Director plan round-trip                | Both new explicit IDs parse, validate, persist, and reach rendering  |

## Layout rendering

| ID        | Priority      | Case                     | Required result                                            |
| --------- | ------------- | ------------------------ | ---------------------------------------------------------- |
| P6-LAY-01 | MUST_AUTOMATE | Media-top unified slots  | Question, optional media, choices, and phase arranged once |
| P6-LAY-02 | MUST_AUTOMATE | Full-stack unified slots | Question, choices, and phase arranged without media gap    |
| P6-LAY-03 | MUST_AUTOMATE | Two and three choices    | Both counts fit declared capacity                          |
| P6-LAY-04 | MUST_AUTOMATE | Missing optional hero    | Stable layout without broken media                         |
| P6-LAY-05 | MUST_AUTOMATE | Capability metrics       | Renderer, QA, and optimizer consume catalog data           |
| P6-LAY-06 | MUST_AUTOMATE | No skin internals        | New layout CSS uses Phase 5 tokens/hooks only              |

## Responsive and visual matrix

| ID        | Priority      | Case                            | Required result                                     |
| --------- | ------------- | ------------------------------- | --------------------------------------------------- |
| P6-VIS-01 | VERIFY_VISUAL | Media-top 16:9 and 9:16         | No clipping/occlusion; intended hierarchy preserved |
| P6-VIS-02 | VERIFY_VISUAL | Full-stack 16:9 and 9:16        | Readable balanced stack with no overflow            |
| P6-VIS-03 | VERIFY_VISUAL | Short through overflow tiers    | Shared typography remains legible                   |
| P6-VIS-04 | VERIFY_VISUAL | Four Answer Card skins pairwise | No geometry collision                               |
| P6-VIS-05 | VERIFY_VISUAL | Mascot absent/left/right        | Capacity and important content remain visible       |
| P6-VIS-06 | VERIFY_VISUAL | Choices/thinking/reveal/explain | State and phase content remain clear                |
| P6-VIS-07 | MUST_AUTOMATE | Reduced motion                  | State is clear without decorative transition        |

## UI and synchronization

| ID       | Priority      | Case                                | Required result                                                |
| -------- | ------------- | ----------------------------------- | -------------------------------------------------------------- |
| P6-UI-01 | MUST_AUTOMATE | Four-layout selector                | One grouped scalable control, not four primary buttons         |
| P6-UI-02 | MUST_AUTOMATE | Keyboard and accessible name        | Full selection and explanation access without hover            |
| P6-UI-03 | MUST_AUTOMATE | Immediate selection acknowledgement | Local control and preview pending state update immediately     |
| P6-UI-04 | MUST_AUTOMATE | Duplicate pending selection         | Same submission is prevented; unrelated controls remain usable |
| P6-UI-05 | MUST_AUTOMATE | Rapid layout changes                | Only newest response may update preview                        |
| P6-UI-06 | MUST_AUTOMATE | Error and retry                     | Selection/input preserved with concise retry path              |
| P6-UI-07 | VERIFY_VISUAL | Desktop and mobile widths           | Control, popover/options, preview, and touch targets fit       |
| P6-UI-08 | MUST_AUTOMATE | Metadata labels/icons/previews      | No two-layout conditional branch remains                       |
| P6-UI-09 | VERIFY_VISUAL | Visible-copy and footer audit       | Concise strings, no title period, exact responsive credit once |

## Workflow evidence

Record targeted shared/server/web tests, full workspace gates, rebuilt app verification, production compositions for both new layouts and aspects, and browser evidence for success, slow, error, retry, rapid change, keyboard, desktop, and mobile scenarios.
