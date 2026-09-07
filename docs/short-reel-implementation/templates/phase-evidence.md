# Phase Evidence Record Format

Use this structure for the assigned phase. Replace instructional descriptions with observed values, not invented success. Missing evidence must be recorded explicitly as not_run, blocked or pending.

## Identity

Record phase number/title, actor/session/date, repository root, HEAD, dirty baseline summary, implementation claim ID and actual owned file list. Never record the lease token.

## Requirements And Changes

List covered SR IDs, concrete changed files and their responsibilities. Explain any pre-existing dirty file touched and how user work was preserved. Link approved decision/contract changes and the exact scope expansion if used.

## Verification Results

For each command record cwd, timestamp, exact command, exit code, test counts and result. Include intended failing test before the fix, passing test after, formatter/static/build checks and zone validation. A test command that selected zero tests is not success.

## Primary Workflow

Record process start/rebuild method, URL/port when applicable, sample record IDs from isolated data, user actions, expected/actual result and screenshots or log excerpts. Identify mocked adapters versus real provider calls and any unavailable external checks.

## Failure And Concurrency Checks

List tested case IDs from test-cases.md and observable assertions. Record cancellation/restart/retry/stale-result behavior; do not substitute vague statements such as all edge cases handled.

## Review And Remaining Findings

State self-review or independent review, inspected diff/revision, blocking findings, pre-existing unrelated failures and resolutions. Link a separate review report when present. No unresolved required gate may be hidden under a completed status.

## Handoff And Ownership

Link the coordination handoff, prepared progress state and implementation claim ID. Verification/release results are reported by tools/final response and confirmed by the next reviewer; do not predict a future release as already successful.

## Next Agent

List exact next prompt, prerequisites, relevant symbols, still-unverified assumptions and unfinished slices. State whether the next phase is eligible or blocked. Folder retention remains user-owned.
