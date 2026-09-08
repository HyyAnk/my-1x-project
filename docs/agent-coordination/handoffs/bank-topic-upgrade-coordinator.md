# Bank-First Topic Upgrade Coordinator Handoff

## Status

- Result: in_progress
- Date: 2026-09-08
- Agent: root coordinator; user-requested Luna subagents
- Working mode: main-direct
- Baseline before edits: `feaf77a5aa591116fa0f23320943fb1c5da3447c`, 18 pre-existing dirty paths

## Source Files Read

- AGENTS.md and coordination README/master-spec/phase-roadmap/parallel policy/template
- Latest Short-Reel Phase 08 handoff and original Short-Reel specification
- Current question selection/eligibility/suitability, topic contracts, validation, repository and confirmation seams

## Files Changed

- docs/bank-topic-upgrade/design.md
- docs/bank-topic-upgrade/implementation-plan.md
- docs/bank-topic-upgrade/progress.md
- docs/agent-coordination/handoffs/bank-topic-upgrade-coordinator.md

## Main-Direct Safety

- No branch/worktree/commit/push created
- Baseline captured before edits
- Pre-existing dirty files touched: none
- Coordinator claim covers only the four documentation files; workers must acquire their own claims

## Scope And Decisions

User approved the six-stage Bank-first topic upgrade with flexible counts. Root coordinates and controls final integration. Read-only Luna workers audit Bank and map source contracts; a separate Luna reviews the plan. Product workers start after their prerequisites are frozen. Live Bank mutation is limited to the reviewed, backed-up addition of missing `language: "en"` metadata; hidden provider or Flow operation is not authorized.

## Verification

Initial zone validation passed with 1,929 paths/24 zones; no product changes yet. Final verification/release and implementation evidence remain pending and must not be inferred from this planning handoff.

## Open Risks

The original lost-token claim `claim-stage02contracts-mtsj51z1` was expired through the user-authorized official stale cleanup, with partial work preserved. The recovery worker then created `claim-codexstage02recovery-mtskq4r7`, retained its lease token, and currently owns Stage 2A. Registry status on 2026-09-08 shows that recovery claim active and recently heartbeated. It must revise the partial multilingual assumptions, run fresh verification, write the Stage 2 handoff and release before Stage 2B or Stage 3 advances.

User subsequently attested existing Bank questions are English and authorized metadata correction to base code `en`. New instructions prohibit Vietnamese generation and require base codes for all target languages. See the updated design and plan; no live metadata update has occurred yet.

Actual live metadata and source availability were audited in `stage-01-audit.md`. Missing language remains unknown at runtime except for the exact manifest-scoped records covered by the user's English attestation. Existing exact-five assumptions and Episode confirmation side effects require coordinated consumer changes.

## Next Phase Input

Read docs/bank-topic-upgrade/progress.md, design.md and implementation-plan.md. Continue from actual agent reports and registry status. Do not repeat completed stages or take over claims without authority. Keep all existing implementation documentation intact.

## 2026-09-08 Language Architecture Revision

- Question Bank is an immutable English-only source store. New producers persist `language: "en"`; upgraded eligibility ignores Bank translations and channel language.
- Topic, scripts, visual directions, image prompts, model instructions and all UI remain English.
- Product localization is limited to displayed quiz strings, video description and thumbnail in-image text. It is stored with the Episode/Short-Reel, linked to English source IDs/hash, and never written back to Bank.
- Preserve choice IDs and correct-answer mapping. Use base language codes and reject Vietnamese.
- Stage 2 must revise its paused multilingual assumptions before verification. Stages 3-6 follow the revised design and plan under Luna workers, with root integration control.
