# Acceptance Matrix

All implementation evidence starts as not_run. Phase authors replace that status with actual links/results; planned case IDs are not proof. Every requirement must remain represented through revisions.

| Requirement | Owner Phase | Automated / Inspection Cases                                      | Human Check                             | Actual Evidence                                                                                                               |
| ----------- | ----------- | ----------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SR-01       | 02, 03, 07  | RP-01, TP-03, RT-01                                               | Distinct workflows                      | Automated coverage passed in [Phase 08 evidence](evidence/phase-08-implementation.md); predecessor repair F07-04 remains open |
| SR-02       | 03          | TP-01, TP-02                                                      | Keyword relevance and discovery variety | Passed in full regression; see [Phase 08 evidence](evidence/phase-08-implementation.md)                                       |
| SR-03       | 02, 03, 04  | SC-04, SC-05, TP-04, TP-05                                        | Source meaning retained                 | Automated fidelity checks passed; manual footage meaning review pending                                                       |
| SR-04       | 02, 04      | SC-01, SC-02, SC-03, SG-03                                        | Actual Flow duration                    | Three-segment contract passed; actual Flow duration pending user evidence                                                     |
| SR-05       | 04          | SC-05, SG-03                                                      | Legible correct in-video text/timing    | Canonical prompt text passed; actual in-video legibility/timing pending user evidence                                         |
| SR-06       | 06, 08      | UI-04, source review for no Flow client                           | User-operated Flow                      | No Flow client/runtime dependency found; user-operated Flow run pending                                                       |
| SR-07       | 05, 06      | PK-01 through PK-06, UI-07                                        | Cover/reference/story consistency       | Package/export regression passed; actual creative consistency pending user review                                             |
| SR-08       | 04, 08      | SC-06, SG-03                                                      | Actual segment continuity               | Structural continuity passed; actual Flow continuity pending user evidence                                                    |
| SR-09       | 04, 05, 06  | SG-04, PK-03, UI-02, UI-05                                        | Editing/retry ergonomics                | Automated edit/retry/draft checks passed; UI inspected at 1440/390/320                                                        |
| SR-10       | 02, 04, 06  | RP-02 through RP-06, SG-05 through SG-07, HTTP-01 through HTTP-05 | No stuck/false state                    | Full regression passed, including restart/cancel/reconnect/concurrency cases                                                  |
| SR-11       | 01, 07      | Source manifest, RT-01, RT-02, RT-05                              | Stage/Sandbox landscape only            | **BLOCKED:** F07-04 retained Episode render-ratio compatibility in thumbnail selection                                        |
| SR-12       | 01, 07      | Data manifest, RT-04                                              | Protected assets still usable           | Phase 07 deletion evidence and current regression passed; no live-data deletion performed                                     |
| SR-13       | 07, 08      | RT-03, IN-01                                                      | Landscape visual regression review      | Landscape visual regression and generic 9:16 capability passed; F07-04 repair still required                                  |
| SR-14       | 06, 08      | UI-07, IN-03 evidence status                                      | Explicit final user acceptance          | Technical checks incomplete; manual Flow and explicit user acceptance pending                                                 |
| SR-15       | 06, 08      | UI-06, string/focus audit                                         | Desktop/mobile accessibility            | E2E and 1440/390/320 inspection passed; documented footer conflict retained; lint/format gates fail                           |
| SR-16       | all         | Claims, release, handoffs, IN-02                                  | User retains folder control             | No runtime/test dependency on kit found; folder retained; Phase 08 blocked evidence recorded                                  |

## Global Gates

- Static: formatter, lint, typecheck and build on final code.
- Behavioral: focused phase tests, full server/web tests and explicitly executed new shared tests.
- Integration: actual updated workflows after process rebuild/restart, not solely mocked unit success.
- Safety: zones valid, scope verified, claims released, protected data preserved, no unsafe deletion.
- Review: fresh diff/contract verification; no unresolved blocking findings. Same-session self-review labeled honestly.
- Manual: both archetypes reviewed in Flow by the user; actual model/duration observations recorded without claims of independent verification.
- Final: explicit user acceptance; no automatic folder deletion regardless of status.

A skipped, unavailable or pre-existing failing check remains visible. It is not a pass and cannot be erased by reducing the test suite. Ask the user to resolve a material blocked gate or explicitly adjust scope.
