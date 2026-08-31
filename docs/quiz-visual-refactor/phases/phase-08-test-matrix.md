# Phase 8 Test and Acceptance Matrix

This matrix is dependency-ordered. A later subphase must retain all earlier evidence while adding its own coverage.

## Phase 8B — Boundary integration tests

| ID         | Priority        | Required evidence                                                                                                                   |
| ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P8B-BND-01 | MUST_AUTOMATE   | A test enters the production render workflow and proves style context survives `videoRunner → HyperframesRenderer → Composition`    |
| P8B-BND-02 | MUST_AUTOMATE   | Table-driven matrix proves `Theme < Channel < Episode < Beat` independently for palette and all element/background style axes       |
| P8B-BND-03 | MUST_AUTOMATE   | Explicit, `auto`, and missing legacy values resolve deterministically with correct provenance and no accidental layer collapse      |
| P8B-BND-04 | MUST_AUTOMATE   | Transition target equals the next scene's already-resolved palette, including inherited/`auto` next beats                           |
| P8B-BND-05 | MUST_AUTOMATE   | Real Channel update boundary persists Answer Card and Background, then API/repository read-back returns both values                 |
| P8B-BND-06 | MUST_AUTOMATE   | Episode creation inherits Channel background; updates persist and invalidate every affected artifact without unrelated invalidation |
| P8B-BND-07 | MUST_AUTOMATE   | Equivalent preview and production inputs produce the same resolved style values and provenance                                      |
| P8B-BND-08 | VERIFY_EXISTING | Tests are deterministic, use no external providers, and cannot pass by bypassing the intermediate boundary under test               |

## Phase 8C — Production/Sandbox parity and visual evidence

| ID          | Priority      | Required evidence                                                                                                                         |
| ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| P8C-PAR-01  | MUST_AUTOMATE | Production and Sandbox emit the same canonical semantic background layer for equivalent scene inputs                                      |
| P8C-PAR-02  | MUST_AUTOMATE | A composition bundles CSS exactly once for each background variant it uses and omits unused variant and duplicate legacy CSS              |
| P8C-PAR-03  | MUST_AUTOMATE | Background markup/CSS remains deterministic; reduced motion removes continuous animation on both surfaces                                 |
| P8C-VIS-01  | VERIFY_VISUAL | Reviewable artifacts cover every one of the four layouts with both 16:9 and 9:16 and both registered backgrounds                          |
| P8C-VIS-02  | VERIFY_VISUAL | The matrix distributes representative Answer Card skins and mascot on/off states, including long text and visual-choice content           |
| P8C-VIS-03  | VERIFY_VISUAL | Artifact manifest records input, surface, viewport/aspect, style IDs, mascot state, output path, reviewer result, and any accepted caveat |
| P8C-UI-01   | VERIFY_VISUAL | Running UI is checked at desktop and mobile widths for concise copy, grouped secondary actions, exact responsive footer, and no overflow  |
| P8C-ASY-01  | MUST_AUTOMATE | Success, slow, error, retry, and rapid selection changes acknowledge immediately and latest request wins without F5                       |
| P8C-A11Y-01 | VERIFY_VISUAL | Keyboard focus, accessible names, focus-triggered explanations, and touch fallback work for layout/background controls                    |
| P8C-E2E-01  | MUST_AUTOMATE | Playwright or equivalent browser-protocol test covers the critical Sandbox style-selection and confirmed downstream synchronization       |

## Phase 8D — Cleanup and acceptance closure

| ID           | Priority        | Required evidence                                                                                                                    |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P8D-DEAD-01  | VERIFY_EXISTING | `legacyBackgroundAdapter.ts` is removed when caller-free, or retained only as a documented derived boundary with a removal condition |
| P8D-DIM-01   | MUST_AUTOMATE   | Layout dimensions have one canonical catalog owner; any compatibility view is derived and contract-tested rather than hard-coded     |
| P8D-COH-01   | RECORD_ONLY     | Structure analysis is reviewed; only genuinely mixed-responsibility modules are split, with rationale recorded                       |
| P8D-DEBT-01  | VERIFY_EXISTING | No stale suppressions, dead exports, temporary bypasses, unexplained TODOs, or duplicated Phase 8 policy remain                      |
| P8D-REG-01   | MUST_AUTOMATE   | All Phase 8B boundary and Phase 8C parity/browser tests remain green after cleanup                                                   |
| P8D-GATE-01  | MUST_AUTOMATE   | Format, lint, typecheck, tests, build, E2E, quiz audit, dossier formatting, structure analysis, and `git diff --check` pass          |
| P8D-DOC-01   | VERIFY_EXISTING | As-Is, inventory, compatibility, target architecture, verification runbook, roadmap, artifacts, and handoffs match current reality   |
| P8D-GIT-01   | RECORD_ONLY     | Checkpoint commit plan is documented; no staging or commit occurs without explicit user authorization                                |
| P8D-CLOSE-01 | RECORD_ONLY     | Phase 8 is marked COMPLETE only with full evidence; four-choice remains a separate DEFERRED project                                  |
