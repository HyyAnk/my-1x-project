# Bank-First Upgrade Progress

Plan: `docs/bank-topic-upgrade/implementation-plan.md`
Spec: `docs/bank-topic-upgrade/design.md`
Baseline: `feaf77a5aa591116fa0f23320943fb1c5da3447c`, 18 pre-existing dirty files, no active claims before coordinator startup.

| Stage                       | State          | Owner                                  | Evidence                                       |
| --------------------------- | -------------- | -------------------------------------- | ---------------------------------------------- |
| 1 Inventory                 | audit_complete | bank_audit, topic_map (read-only Luna) | stage-01-audit.md; code mapping pending        |
| 2 Contracts and eligibility | replanning     | stage02_finish (Luna)                  | Paused for English-only Bank contract revision |
| 3 Bound generation          | planned        | Luna implementer                       | Depends on contract release/review             |
| 4 Safe confirmation         | planned        | Luna implementer                       | Depends on bound generation                    |
| 5 UI synchronization        | planned        | Luna implementer                       | Depends on confirmation contracts              |
| 6 Acceptance                | planned        | Luna reviewer and root                 | Depends on integrated implementation           |

## Preflight And Decisions

- Language architecture revision: Question Bank/source, Topic, Short-Reel narrative/script, visual directions, image prompts, model instructions and UI remain English. Only displayed quiz strings, video description and thumbnail in-image text are localized at product level. Localizations never return to Bank. Choice IDs/correctness mapping are immutable, base language codes are used, and Vietnamese is rejected.
- Stage 2 internal sequencing is now 2A contracts/eligibility, then 2B canonical Bank serialization and the backed-up live metadata repair. Stage 3 cannot create source hashes until the post-migration manifest/revision is recorded.
- Recovery update: `stage02_finish` retained the lease token for `claim-codexstage02recovery-mtskq4r7` and confirmed its partial multilingual eligibility work must be revised before verification. It remains the Stage 2 Luna owner; no code edits resumed before this revised plan was frozen.

- User confirmed all existing Bank questions are English and authorized correcting missing language metadata. The migration adds only missing `language: "en"` under manifest/backup/drift safeguards; product localization storage is separate and Bank translation writeback is removed from the upgraded flow.
- Stage 2 checkpoint: worker reports 5 focused server files/26 tests passing; broader checks and review/release pending. Worker lost lease token after resumption and stopped. Claim claim-stage02contracts-mtsj51z1 remains active; official cleanup dry-run identifies only this claim as heartbeat_timeout. No cleanup or takeover has been performed. Authorized recovery is required before product edits continue. Stages 3-6 are not implemented.

- Stage 1 audit complete: all 150 deep_trivia and 169 versus_faceoff records fail missing English provenance, not topic scarcity. Active redirected Bank has 1262 approved records; 1261 language-unknown. Read stage-01-audit.md.
- topic_map confirmed reuse of canonicalJsonStringify/sha256Hex, optional source binding contracts, strict bound Episode conversion and durable confirmation receipts. Root added BF-13 to prevent invented distractors and truncation in the new path.
- Plan-review follow-up clarified native-English acceptance, provider hard-stop for unavailable scans, option conflict semantics, source-disjoint slots, exact prompt context and ordered snapshot freshness.

- Plan review by plan_review (Luna) identified root/scan status ambiguity, binding hash semantics, Episode language policy, stable slot/capacity semantics, typed recovery and confirmation atomicity. Frozen Behavioral Decisions in design.md now settle these before implementation. Review request to commit audit evidence is superseded by the explicit no-commit rule; audit is persisted under the documentation claim instead.

- Ruling: use main-direct authenticated claims and repository handoffs instead of skill worktree/commit/scratch-deletion defaults — explicit repository and user instructions take precedence — no Git isolation means strict path ownership is essential.
- Ruling: all subagents use requested gpt-5.6-luna; root handles architecture/final decisions — respects model choice — complex failures require narrower tasks rather than silent model changes.
- Ruling: migrate audited missing language metadata only because the user explicitly attested that all existing Bank source questions are English; never use appearance-based inference for other data.
- Ruling: partial results target 3 Episode + 2 Short-Reel, not five mandatory slots — approved by user — historical exact-five tests require intentional updates.

| Boundary                                   | Consistency check                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Stage 1 audit vs data repair               | Audit reads only; future fixes affect producers, never silently label legacy data |
| Stage 2 eligibility vs stages 3/4          | Shared policy and hashes must be frozen before consumers                          |
| Stage 3 generation vs Stage 4 confirmation | Persist exact source IDs/hashes; do not reselect by title                         |
| Stage 4 response vs Stage 5 UI             | Typed errors and availability metadata precede UI wiring                          |
| Stage 5 refresh vs Stage 6 verification    | Latest-only refresh and isolated real browser evidence required                   |
| Stage 1 self-consistency                   | Counts must distinguish unknown metadata from absent archetype                    |
| Stage 2 self-consistency                   | New bindings additive; legacy readable, unknown language rejected for reels       |
| Stage 3 self-consistency                   | Partial plans keep stable provenance; no provider call for zero slots             |
| Stage 4 self-consistency                   | Revalidate before creation; completed replay before checking mutable Bank         |
| Stage 5 self-consistency                   | Availability refresh does not regenerate creative text                            |
| Stage 6 self-consistency                   | Mocked providers disclosed; software acceptance separate from live data/Flow      |
