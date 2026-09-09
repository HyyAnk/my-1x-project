# Current State And Recovery Gate

## Verified or focused-tested repairs

- Incomplete localization no longer silently fills missing target fields with English and marks applied. Four regressions originally failed; focused tests passed after correction.
- Allocation requires coherent domain/subtopic groups, all keyword tokens, and deduplicates questions projected by both eligibility policies. Unknown provider slots and incorrect response counts reject; topic IDs are server-generated. Latest focused allocation result: 14 tests passed.
- Availability hook clears old channel state, invalidates aborted/disabled requests and avoids internal polling when externally supplied. Eight hook tests, web suite/build and workspace typecheck passed at that checkpoint.
- Bank transcreation endpoint retired with 410; UI/API controls removed, English form metadata explicit. This route/UI slice was released, but downstream repository policy is unfinished.
- Product adapter/lossless converter slice released: existing LLM client adapter added, strict converter preserves choice IDs, rejects incompatible structure. 52 focused tests passed. Actual product bridge wiring is unfinished.
- Migration realpath/junction safety and shared SQLite reader transaction added. Child-process tests exist; a later parallel full run timed out on reader-first test. Do not call lock acceptance complete until reproduced reliably.

## Interrupted work: MUST inspect before editing

Three Codex workers stopped with provider 429 retry-limit failures. They are not continuing implementation. Two implementation claims were still active at this transfer snapshot:

1. `claim-codexbankenglishonly-mttcyqp7`: Bank write policy, batch/mutation/translation storage, serialization files/tests, repository/integration tests, planned handoff `bank-english-only-transcreation-retirement.md`.
2. `claim-codexproductepisodelocalization-mttd0a07`: Episode bridge, bound tests, topic/single bootstrappers/types, planned handoff `product-episode-localization.md`.

Last heartbeats observed: 2026-09-09T00:26:33Z and 00:27:44Z respectively. These are historical observations, not cleanup permission for fresh work.

- [ ] Read current registry and inspect lifecycle history. Never assume active means writing or missing means verified.
- [ ] Confirm stopped owners, run the official stale-cleanup preview, and use authorized recovery only for qualifying stopped claims. Never bypass active ownership or scrape tokens from logs.
- [ ] Preserve partial edits, capture fresh dirty baseline, acquire new exact claims, then re-run tests before accepting them.
- [ ] Keep tokens only in session memory, heartbeat regularly, verify and release before handoff.
- [ ] If current claim ownership cannot be resolved safely, ask the user for coordination rather than force takeover.

Current HEAD at this transfer: `c19612c2fc577b8950da6dda5373e88756c47837`. It changed externally from the prior baseline; preserve this checkout and refactored files. No new commit was made by this repair session.

## Most recent full-suite evidence

Last full server attempt: 202 files, 1,407 passed / 4 failed:

- reader-first separate-process lock test timed out at 15 seconds;
- old transcreate test expected 200 but endpoint now returns 410;
- CRUD fixture omitted language and now receives 400;
- quizV2Route temporary directory cleanup raised EBUSY.

Some were concurrent transitional states. They are NOT a passing final suite and must be resolved/rechecked.

## Live Bank facts

Independent read-only scan verified actual redirected `question_bank`: 143 batches, 1,262 questions, all en; backups/current files match the applied manifest, index unchanged. The old 2,500 knowledge_base migration claim was false and corrected in the old FINAL-REPORT. Do not rerun migration or execute its removed rollback command.

Relevant reports:

- [Independent review](../agent-coordination/handoffs/bank-topic-independent-review.md)
- [Storage repair](../agent-coordination/handoffs/bank-storage-safety.md)
- [Product adapter slice](../agent-coordination/handoffs/finish-product-workflow.md)
- [Allocation](../agent-coordination/handoffs/bank-topic-allocation-fix.md)
- [Deduplication](../agent-coordination/handoffs/bank-topic-source-dedup.md)
- [Hook fixes](../agent-coordination/handoffs/bank-topic-ui-refresh-fix.md)
