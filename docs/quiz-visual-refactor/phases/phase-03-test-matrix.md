# Phase 3 Shared Scene Pipeline Test Matrix

Use these IDs in tests or the Phase 3 handoff.

## Scene model and adapters

| ID        | Priority      | Case                                     | Required result                                                        |
| --------- | ------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| P3-MOD-01 | MUST_AUTOMATE | Canonical question normalization         | Stable IDs, order, correct choice, text, and assets                    |
| P3-MOD-02 | MUST_AUTOMATE | Resolved layout input                    | Phase 2 result is consumed without downstream re-resolution            |
| P3-MOD-03 | MUST_AUTOMATE | Mascot absent/present left/present right | Occupancy and anchor are explicit, non-duplicated fields               |
| P3-MOD-04 | MUST_AUTOMATE | Missing optional assets                  | Deterministic existing fallback without provider I/O                   |
| P3-ADP-01 | MUST_AUTOMATE | Production timeline states               | Question, choices, thinking, reveal, and explain map deterministically |
| P3-ADP-02 | MUST_AUTOMATE | Sandbox explicit phase                   | Maps to the same scene-state contract                                  |
| P3-ADP-03 | MUST_AUTOMATE | Sandbox scrub time boundaries            | Exact boundary behavior remains characterized                          |

## Shared parts

| ID         | Priority        | Case                                     | Required result                                                 |
| ---------- | --------------- | ---------------------------------------- | --------------------------------------------------------------- |
| P3-PART-01 | MUST_AUTOMATE   | Question box and counter                 | Both surfaces use the same semantic part builder                |
| P3-PART-02 | MUST_AUTOMATE   | Hero/media part                          | Same resolved source, alt text, and fallback semantics          |
| P3-PART-03 | MUST_AUTOMATE   | Thinking and fact phase parts            | Same scene state produces equivalent semantic content           |
| P3-PART-04 | MUST_AUTOMATE   | Brand and mascot occupancy               | Surface adapters place shared results without state duplication |
| P3-PART-05 | VERIFY_EXISTING | Reward/timeline-only production behavior | Production timing remains controlled by compiled events         |
| P3-PART-06 | RECORD_ONLY     | Legacy background part                   | Shared location and Phase 7 removal owner recorded              |

## Cross-surface integration

| ID        | Priority        | Case                            | Required result                                                 |
| --------- | --------------- | ------------------------------- | --------------------------------------------------------------- |
| P3-PAR-01 | MUST_AUTOMATE   | Text layout at matching state   | Production and Sandbox models/parts are semantically equivalent |
| P3-PAR-02 | MUST_AUTOMATE   | Visual layout at matching state | Production and Sandbox models/parts are semantically equivalent |
| P3-PAR-03 | MUST_AUTOMATE   | Reveal state                    | Canonical correct/incorrect identity agrees across surfaces     |
| P3-PAR-04 | MUST_AUTOMATE   | 16:9 and 9:16                   | Aspect ratio reaches the shared model and both adapters         |
| P3-PAR-05 | MUST_AUTOMATE   | Escaping                        | Untrusted question/choice text remains escaped on both surfaces |
| P3-PAR-06 | VERIFY_EXISTING | Latest preview wins             | Web stale-response protection remains unchanged                 |

## Migration boundaries

| ID        | Priority      | Case                                 | Required result                                     |
| --------- | ------------- | ------------------------------------ | --------------------------------------------------- |
| P3-MIG-01 | RECORD_ONLY   | Dual choice renderer adapter         | One isolated adapter with Phase 4 removal condition |
| P3-MIG-02 | RECORD_ONLY   | Legacy split slots                   | One isolated adapter with Phase 4 removal condition |
| P3-MIG-03 | MUST_AUTOMATE | Four choices                         | Still rejected before scene construction            |
| P3-MIG-04 | MUST_AUTOMATE | Existing auto/default style behavior | No precedence change in this phase                  |

## Workflow evidence

Record targeted pure and integration suites, full workspace gates, matching Sandbox/production evidence for one text and one visual scene, both aspect ratios, reveal state, mascot on/off, and a missing-asset fallback.
