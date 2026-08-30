# Phase 2 Layout Capability Test Matrix

Use these IDs in tests or the Phase 2 handoff.

## Catalog contract

| ID        | Priority      | Case                                           | Required result                                                                                |
| --------- | ------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P2-CAT-01 | MUST_AUTOMATE | Persisted production layout IDs versus catalog | Exact exhaustive parity                                                                        |
| P2-CAT-02 | MUST_AUTOMATE | Catalog versus server renderer registry        | Exact parity; `baseline` excluded from production set                                          |
| P2-CAT-03 | MUST_AUTOMATE | Catalog versus web UI metadata                 | Exact exhaustive parity and unique IDs                                                         |
| P2-CAT-04 | MUST_AUTOMATE | Capability fields                              | Every layout has typed presentation, counts, formats, media policy, aspect ratios, and metrics |
| P2-CAT-05 | MUST_AUTOMATE | Preview baseline                               | Available only through preview contract and renderer                                           |

## Compatibility and resolution

| ID        | Priority      | Case                                          | Required result                                                |
| --------- | ------------- | --------------------------------------------- | -------------------------------------------------------------- |
| P2-RES-01 | MUST_AUTOMATE | Auto ordinary text question                   | Existing `media_left_choices_right` result preserved           |
| P2-RES-02 | MUST_AUTOMATE | Auto visual archetype or odd-one-out          | Existing `visual_choices_three` result preserved               |
| P2-RES-03 | MUST_AUTOMATE | Explicit compatible layout                    | Requested ID preserved with compatible result                  |
| P2-RES-04 | MUST_AUTOMATE | Explicit unsupported choice count             | Structured incompatibility; no silent fallback                 |
| P2-RES-05 | MUST_AUTOMATE | Explicit unsupported format/presentation      | Structured reason identifies the failed capability             |
| P2-RES-06 | MUST_AUTOMATE | Unsupported aspect ratio or media requirement | Typed reason when the contract declares incompatibility        |
| P2-RES-07 | MUST_AUTOMATE | Auto has no compatible candidate              | Structured failure or documented deterministic fallback policy |

## Consumer integration

| ID        | Priority        | Case                 | Required result                                                               |
| --------- | --------------- | -------------------- | ----------------------------------------------------------------------------- |
| P2-INT-01 | MUST_AUTOMATE   | Director validation  | Incompatible explicit beat produces stable issue code and next action         |
| P2-INT-02 | MUST_AUTOMATE   | Visual QA            | Uses selected layout capacity/metrics rather than layout-agnostic assumptions |
| P2-INT-03 | MUST_AUTOMATE   | Image optimizer      | Reads catalog metrics; no duplicated layout-string dimension branch           |
| P2-INT-04 | MUST_AUTOMATE   | Sandbox/API boundary | Rejects or reports incompatible requests deterministically                    |
| P2-INT-05 | VERIFY_EXISTING | Episode Preview      | Valid resolved layout reaches preview unchanged                               |
| P2-INT-06 | VERIFY_EXISTING | Production renderer  | Valid resolved layout selects the expected renderer                           |

## Migration safety

| ID        | Priority      | Case                                 | Required result                                           |
| --------- | ------------- | ------------------------------------ | --------------------------------------------------------- |
| P2-MIG-01 | MUST_AUTOMATE | Current persisted layout IDs         | Parse without migration                                   |
| P2-MIG-02 | MUST_AUTOMATE | Current canonical 2/3-choice quizzes | Remain compatible with their existing auto results        |
| P2-MIG-03 | RECORD_ONLY   | Legacy resolver adapter              | Remaining callers and explicit removal condition recorded |
| P2-MIG-04 | MUST_AUTOMATE | Four choices                         | Still rejected by the domain boundary                     |

## Workflow evidence

Record focused shared/server/web commands, full workspace gates, one compatible Sandbox preview, one incompatible preview/validation path, and one production composition using each existing production layout.
