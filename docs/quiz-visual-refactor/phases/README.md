# Phase Briefs

Each phase brief is an executable contract for one Codex task. Future briefs are prepared in advance but remain dependency-locked planning snapshots until the preceding handoff and current source confirm them.

Current status: Phase 1–8D are COMPLETE. These briefs are historical contracts; no phase is presently `READY`.

## Rules

- Read the repository AGENTS.md and dossier README first.
- Verify every referenced symbol against current source.
- Implement only the active phase.
- Treat out-of-scope work as a recorded follow-up, not an invitation to expand the diff.
- Update roadmap status and create a handoff record before declaring completion.
- A brief may be amended during execution only when evidence and the reason are recorded.

## Matrix priorities

- `MUST_AUTOMATE`: required deterministic executable evidence before completion.
- `VERIFY_EXISTING`: an existing precise test may satisfy the case; add coverage only when evidence is missing.
- `VERIFY_VISUAL`: inspect the rendered/browser result and record a reviewable artifact or exact observation in the handoff.
- `RECORD_ONLY`: record current structural evidence and rationale when automation would create a brittle or misleading invariant.

## Available briefs

| Phase | Brief                                    | Companion evidence                                        |
| ----- | ---------------------------------------- | --------------------------------------------------------- |
| 1     | `phase-01-baseline.md`                   | `phase-01-test-matrix.md`                                 |
| 2     | `phase-02-layout-capability-contract.md` | `phase-02-test-matrix.md`                                 |
| 3     | `phase-03-shared-scene-pipeline.md`      | `phase-03-test-matrix.md`                                 |
| 4     | `phase-04-unified-choice-rendering.md`   | `phase-04-test-matrix.md`                                 |
| 5     | `phase-05-css-preset-boundaries.md`      | `phase-05-test-matrix.md`                                 |
| 6     | `phase-06-new-layouts-scalable-ui.md`    | `phase-06-test-matrix.md`, `phase-06-interaction-plan.md` |
| 7     | `phase-07-background-registry.md`        | `phase-07-test-matrix.md`, `phase-07-interaction-plan.md` |
| 8     | `phase-08-end-to-end-stabilization.md`   | `phase-08-test-matrix.md`, dated 8A–8D handoffs           |

Before implementing Phase 2–8, compare the planned brief with the immediately preceding dated handoff. Update stale file-level guidance rather than forcing it onto architecture that evolved legitimately.
