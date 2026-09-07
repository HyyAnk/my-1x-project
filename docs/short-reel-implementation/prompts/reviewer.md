# Review The Next Short-Reel Phase Awaiting Review

Work in `D:\1a Cursor Project\My 1x Project` or its actual mounted repository root. Review the lowest-numbered implemented Short-Reel phase that is not yet accepted. If this prompt is read by a next-phase executor, review that phase's immediate predecessor. Do not start new product implementation or auto-spawn an agent.

Read AGENTS.md, the coordination README/master-spec/phase-roadmap/latest handoff and `docs/short-reel-implementation/README.md`, agent-runbook.md, specification.md, contracts.md, progress.md, decisions.md, the target phase and verification documents. Resolve the phase from progress and actual evidence; if records disagree, investigate before asserting status.

## Read-Only Review First

1. Inspect current git status, predecessor claim release and recorded file list. Compare actual code/diff to required scope. Do not trust a success message or an unchecked progress box.
2. Confirm requirement IDs map to tests and actual primary workflow evidence. Rerun focused checks if their evidence is stale or critical. Do not run paid/live Flow actions; the user operates Flow.
3. Check contracts, source snapshot fidelity, exact one-question selection, three segments and canonical text. Check route discrimination and no title-based heuristics.
4. Check atomic compare-and-write, restart/idempotency, stale result rejection, cancellation and sibling generation merge. Sequential tests do not prove concurrency.
5. Check layer boundaries, current conventions, duplicate state/types, large-file growth, type escapes, swallowed exceptions and raw provider error leakage.
6. For UI phases, inspect desktop/mobile screenshots and exercise primary actions where possible. Verify input preservation, keyboard/touch controls, reconnect and no stuck loader.
7. For retirement, re-search retained portrait uses and inspect exact deletion evidence/protected assets. No blanket deletion or obsolete compatibility workaround is acceptable.
8. Verify no runtime/test dependency on this temporary kit and no modification outside the claimed scope. All introduced text is English; flag the documented footer conflict instead of inventing a resolution.

## Findings And Decision

Lead with actionable findings ordered by severity, each with current file/line, reproduction or reasoning, expected/actual behavior and required test. Data loss, invalid contracts, source answer drift, broken core workflow, concurrency hazards and missing required verification block acceptance. Distinguish pre-existing unrelated findings from this phase's regressions, but do not call a required failing gate passed.

Record whether this is independent fresh-session review or the implementer's self-review. Self-review must never be mislabeled independent. Phase 02 contract freeze and Phase 07 destructive scope require a fresh reviewer or explicit user/integrator review before advancement/deletion.

## Documentation Mutation Only After Review

Acquire a documentation claim for the exact review report, progress.md, finding/evidence files and a unique coordination handoff. Use comma-separated CLI lists, capture token in memory, and preserve pre-existing dirty files.

Write `docs/short-reel-implementation/verification/evidence/phase-NN-review.md` with NN resolved from the target phase. Use templates/review-report.md. Rejected phases remain blocked/ready_for_review with findings; accepted phases require verified/released implementation and current passing evidence. Final project acceptance cannot be granted by a reviewer in place of the user.

Update progress, run document checks and zone validation, verify and release the documentation claim without subsequent edits. Report accept/reject, evidence links, blocking findings and eligible next prompt. Do not fix product code under this review-only prompt or delete/archive the kit.
