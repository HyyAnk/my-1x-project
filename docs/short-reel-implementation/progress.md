# Progress Register

Only update this register under a claim covering this file. This is a human-readable index, not a replacement for authenticated registry state. No phase is complete merely because a checkbox changed.

## Current Position

- Next eligible phase: 01
- Product implementation: not started by this execution kit
- Final user acceptance: not granted
- Folder retention: user-managed; agents must not delete or archive it

| Phase | Implementation State | Evidence | Review State | Claim / Handoff |
| ----- | -------------------- | -------- | ------------ | --------------- |
| 01    | not_started          | none     | not_reviewed | none            |
| 02    | not_started          | none     | not_reviewed | none            |
| 03    | not_started          | none     | not_reviewed | none            |
| 04    | not_started          | none     | not_reviewed | none            |
| 05    | not_started          | none     | not_reviewed | none            |
| 06    | not_started          | none     | not_reviewed | none            |
| 07    | not_started          | none     | not_reviewed | none            |
| 08    | not_started          | none     | not_reviewed | none            |

## States

- `not_started`: no implementation claim/work for this phase.
- `in_progress`: bounded work active, owner and claim recorded.
- `blocked`: required authority/input/environment missing; record the concrete blocker and safe next action.
- `ready_for_review`: implementation checks and evidence prepared, self-review done. A successful registry release must be independently checked; do not pre-record it as a fact before release.
- `accepted`: subsequent review passed against current code and predecessor claim was released. Set this through a separate documentation review claim, not by editing after implementation verification.
- Phase 08 uses `awaiting_user_acceptance` after technical checks; only an explicit user acceptance can produce `accepted` for the overall project.

## Review Fields

Record review actor/session, inspected revision or dirty diff fingerprint, evidence file, findings disposition and claim ID. A same-session self-review must be labeled self-review, never independent review. A fresh next-phase agent may perform the predecessor review without spawning another agent.

## Findings And Blockers

No implementation findings exist yet because phases have not run. Record each actual finding with ID, phase, severity, reproduction, expected/actual behavior, owner, status and resolving evidence link. Do not delete resolved findings; retain their resolution.

## Resume Rule

Read this file, the latest phase evidence and handoff, then query current registry status. If they disagree, inspect actual files and registry before proceeding. Missing token does not authorize taking over an active claim. See [runbook](agent-runbook.md).
