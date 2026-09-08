# Phase 07 F07-04 Repair And Self-Review

## Identity

- Date: 2026-09-08
- Actor: Codex, main-direct; implementer self-review, not independent review
- HEAD: 42d2ecd79c2a3e1955499764661d05446a3baf46
- Claim: claim-codex-mts6kesd
- Authority: explicit user request to repair, review, and release F07-04
- Baseline: pre-existing dirty product work preserved; only the four named product/test files and this evidence/handoff changed

## Finding And Repair

F07-04 is resolved. Automatic Episode thumbnail selection returns landscape without consulting retired portrait render metadata. Episode cards prefer an available landscape thumbnail regardless of legacy render metadata. Explicit portrait/both thumbnail preferences and a portrait-only card fallback remain supported.

Files:

- apps/server/src/quiz/thumbnail/thumbnailService.ts: removed legacy render-ratio inference; no provider, persistence, or public contract change
- apps/server/test/thumbnailService.test.ts: reversed the obsolete legacy assertion to require landscape; existing explicit portrait/both and actual service/HTTP tests retained; formatted this claimed file
- apps/web/src/features/channel/utils/episodeCardViewModel.ts: removed legacy render-ratio priority
- apps/web/src/features/channel/utils/episodeCardViewModel.test.ts: landscape priority regression and portrait-only fallback regression

## Verification

All commands ran from the repository root on 2026-09-08.

- Red: focused server and web suites each failed exactly one assertion, expected 16:9 but received 9:16, before production changes.
- Green: server thumbnail service/prompt suites 32/32; web card/view-model suites 9/9; explicit shared portrait regression 3/3; exit 0.
- Final formatted thumbnail service suite: 11/11, exit 0.
- pnpm typecheck and pnpm build: exit 0; web rebuilt 5,038 modules.
- Initial pnpm test: exit 1, 1,303 server tests passed, Auto-QA timed out at 15 seconds; a topicConfirmRoute teardown task write also raised ENOENT. These failures are retained here, not relabeled passed.
- pnpm --filter @studio/server exec vitest run --maxWorkers 2 --minWorkers 1 --testTimeout 15000: exit 0, 177 files / 1,304 tests, no unhandled errors, including 8 landscape visual snapshots. No tests skipped and no timeout increased.
- pnpm --filter @studio/web exec vitest run --maxWorkers 2 --minWorkers 1: exit 0, 68 files / 324 tests.
- Focused web ESLint: exit 0.
- Prettier check of all four changed product/test files: exit 0.
- Zone validation and git diff --check: exit 0.

## Primary Workflow And Boundaries

The thumbnail service tests exercise creation, explicit landscape/portrait/both generation, persistence, version selection and HTTP retrieval in temporary storage with an image-provider double. Card component tests execute the real view-model integration. Full server regression includes the real browser draft/reopen/reconnect harness using the rebuilt web app. No live provider/Flow action, user-data mutation, asset deletion, new UI control, or styling change was performed.

## Review Decision

Accept the bounded F07-04 repair after authenticated implementation release. The root cause is removed rather than hidden behind another type escape. No new mutable state, dependency, compatibility layer, or contract was introduced. Existing unrelated server/test typing debt and the Phase 08 global lint/format failures remain outside this repair; this is not final technical or user acceptance.

## Handoff

See [repair handoff](../../../agent-coordination/handoffs/short-reel-phase-07-f07-04.md). A subsequent documentation claim records the verified release and clears F07-04 in progress. Phase 08 can then resume its outstanding static gates, complete workflow evidence and manual Flow/user acceptance.
