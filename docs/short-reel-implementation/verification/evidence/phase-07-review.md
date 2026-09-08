# Phase 07 Review And Repair Record

## Review Identity

- Phase: Phase 07 — Controlled Portrait Retirement
- Reviewer: Codex integrator, under the user's explicit review-and-repair instruction
- Date: 2026-09-08
- Review type: Adversarial integrator review of the implemented Phase 07 and prior Antigravity review; repairs in this session are self-verified, not a fresh independent review
- Working mode: main-direct
- Baseline HEAD: `42d2ecd79c2a3e1955499764661d05446a3baf46`
- Implementation evidence: [phase-07-implementation.md](phase-07-implementation.md)
- Current claim: `claim-codex-phase07-adversarial-review`

## Findings First

| ID / Severity    | Current Location                                                                                                                                                               | Reproduction, Expected/Actual Behavior, and Required Test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Disposition                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| F07-03 / Blocker | `packages/shared/src/schemas/mascot.ts:182`; `apps/web/src/features/sandbox/hooks/useSandboxMascotState.ts:14`; `apps/web/src/features/stageStudio/hooks/useStageStudio.ts:38` | Before repair, `ChannelMascotConfigSchema.safeParse({ placements: { "9:16": validPlacement } }).success` was `true`; Sandbox could accept `9:16`, move the mascot to the retired portrait placement, and persist dual placements; Stage retained dual-aspect state despite hiding its portrait control. Expected: Episode/Stage/Sandbox have no reachable portrait calibration/state/persistence while generic portrait media and Short-Reel remain supported. Actual after repair: the channel schema is strict and landscape-only, Sandbox has no aspect-ratio transition, Stage has a landscape constant, and save/sync paths serialize only `16:9`. Required regression: reject a `9:16` channel placement and prove landscape-only state/save behavior. | Repaired and verified.               |
| F07-01 / Info    | `docs/short-reel-implementation/decisions.md:57`                                                                                                                               | The documented footer wording conflicts with the repository English-only rule. No unapproved resolution was invented and no new non-English repository text was added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Retained as documented conflict.     |
| F07-02 / Info    | `.prettier-baseline.json`                                                                                                                                                      | Repository-wide formatting includes pre-existing dirty work. Unrelated dirty files were preserved; `git diff --check` is the scoped whitespace gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Non-blocking pre-existing condition. |

The earlier Antigravity review reported no actionable finding. F07-03 shows that conclusion was incomplete; this repaired snapshot supersedes its no-findings conclusion while retaining it as historical evidence.

## Repair Summary

- Narrowed channel mascot placements and Stage defaults to strict optional `16:9` keys.
- Preserved generic mascot `9:16` capability for protected media and Short-Reel consumers, but channel calibration can no longer supply a portrait override.
- Removed dual-placement initialization, preset copying, reset behavior, save serialization, and Sandbox channel synchronization.
- Removed Sandbox portrait transitions, dead aspect-ratio props, and portrait-only position behavior.
- Reduced Stage aspect state to the single supported `16:9` value and removed its dead setter and compatibility branch.
- Replaced obsolete dual-placement tests with landscape-only contract and persistence regressions.

## Requirement Checks

| Requirement | Evidence                                                                                                                                                         | Result                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| SR-01       | `portraitRetirement.test.ts` rejects portrait Episode settings and channel mascot calibration. Route discrimination remains based on `content_kind`, not titles. | PASS                     |
| SR-11       | Portrait quiz IDs/renderers/styles and controls are deleted; Stage and Sandbox state, schemas, preview requests, and persistence are landscape-only.             | PASS after F07-03 repair |
| SR-12       | `generated-data-cleanup.md` records an empty runtime deletion set. Protected data and the temporary kit were not deleted.                                        | PASS                     |
| SR-13       | Generic image/mascot portrait capability and Short-Reel `9:16` remain valid; retained quiz layouts and production snapshots are landscape-only.                  | PASS                     |

## Verification

- Regression red step: focused `useSandboxMascotState.test.ts` failed with `expected bottom_left, received bottom_right` before the Sandbox state repair.
- Focused repaired web set: 6 files / 20 tests passed.
- `node --import tsx --test packages/shared/test/portraitRetirement.test.ts`: 3/3 passed.
- `pnpm --filter @studio/shared test`: 3/3 passed.
- `pnpm --filter @studio/shared test -- test/mascotStyleSchema.test.ts`: 17/17 passed.
- `pnpm typecheck`: passed across shared, server, and web.
- `pnpm --filter @studio/server test`: 176/177 files and 1,303/1,304 tests passed in the full parallel run; unrelated `questionBankAutoQa.test.ts` exceeded the 15-second timeout. Immediate isolated rerun passed 13/13 in 5.10 seconds, including the timed-out case in 760 ms.
- `pnpm --filter @studio/web test`: 68/68 files and 323/323 tests passed.
- `pnpm --filter @studio/web build`: passed, 5,038 modules transformed.
- `node scripts/agent-validate-zones.mjs --json`: valid, 24 zones / 1,923 files / zero errors, unmapped files, or overlaps.
- `git diff --check`: passed after removing one Phase 07 CSS trailing blank line.
- `pnpm format:check`: repository-wide gate remains failed because 150 pre-existing dirty files differ from `.prettier-baseline.json`; all files changed by this Phase 07 repair were formatted explicitly without rewriting unrelated files.
- No paid or live Flow action was executed.

## Decision

**ACCEPT Phase 07 after F07-03 repair, subject to successful authenticated claim verification and release.**

The destructive-scope implementation had an independent reviewer, but the repairs above are Codex self-verification and are labeled accordingly. The retirement boundary is now enforced at contracts, state, persistence, and tests. Phase 08 becomes eligible only after the current claim verifies and releases. Final project acceptance remains reserved for the user.

## Progress And Handoff

- Progress register: [progress.md](../../progress.md)
- Current handoff: [short-reel-phase-07-review-codex.md](../../../agent-coordination/handoffs/short-reel-phase-07-review-codex.md)
- Eligible next prompt after release: [08-final-acceptance.md](../../prompts/08-final-acceptance.md)
