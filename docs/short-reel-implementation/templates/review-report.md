# Phase Review Record Format

## Review Identity

Record phase, reviewer/session/date, independent or self-review, current HEAD/diff fingerprint, implementation evidence path and confirmed registry release state.

## Findings First

For each finding include ID, severity, file/line, reproducible condition, expected/actual behavior, impact, proposed bounded correction, required regression test and disposition. State no actionable findings only after examining the actual code and evidence.

## Requirement Checks

Map the phase's SR IDs to actual tests/workflow evidence. Mark pass/fail/not_run explicitly. Confirm source/contract/state/safety requirements, not only visual polish or build success.

## Verification Performed By Reviewer

List commands rerun with exit codes/counts and workflows inspected. Note evidence trusted from a previous run and why it remains current. Never label an unperformed manual Flow check as reviewed footage.

## Decision

Record accept or reject with concrete reasons and unresolved gates. Phase 02 contracts and Phase 07 deletion scope require independent/user-integrator review. Phase 08 final user acceptance is not yours to grant.

## Progress And Handoff

Link the updated progress row, exact eligible next prompt and review claim ID. Finish documentation edits before verification/release. Do not delete the execution kit.
