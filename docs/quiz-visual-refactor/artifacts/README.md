# Verification Artifacts

This directory is an index for deliberately tracked refactor evidence.

## Policy

- Prefer executable tests and small text fixtures over large generated HTML, video, or image files.
- Do not commit runtime logs, full rendered videos, temporary browser profiles, or machine-specific absolute paths.
- Commit snapshots only when they are deterministic, reviewable, and materially stronger than focused assertions.
- Every artifact must be linked from a phase handoff and state what contract it proves.
- Generated artifacts that are useful only during local inspection should be recorded by command and path in the handoff, then left untracked or removed through the normal temporary-output workflow.

Phase 1 owns the first artifact manifest if it creates committed fixtures or snapshots. No placeholder binary artifacts are required before that task runs.

## Expected evidence by phase

| Phase | Preferred durable evidence                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- |
| 1     | Characterization tests and small deterministic fixtures                                         |
| 2     | Capability/resolution contract tests and structured incompatibility fixtures                    |
| 3     | Cross-surface normalized-model or semantic-part fixtures                                        |
| 4     | Focused text/visual skin fragments and reviewed visual diffs                                    |
| 5     | Ownership/precedence tests, token fixtures, CSS deduplication measurements                      |
| 6     | Responsive layout screenshots or render references plus UI workflow results                     |
| 7     | Deterministic background fixtures, reduced-motion references, and performance measurements      |
| 8     | Boundary tests, running-browser E2E, and the inspected 16-case production/Sandbox render matrix |

Store only evidence that is deterministic and useful in review. Handoffs may reference local generated output without committing large binaries.
