# Phase 3: Confirmation Recovery Implementation Plan

> Execute directly with deterministic failure injection and restart tests.

Goal: confirmation retries produce one complete product and complete required side effects.
Architecture: a durable preparing receipt reserves identity and immutable effective options; completed means all required effects are reconciled.
Tech stack: TypeScript, repository atomic writers, Vitest.
Spec: [Contract](02-contract.md).

## Files

Modify apps/server/src/repository/topicConfirmationReceipts.ts, apps/server/src/quiz/bank/questionBankToQuizBridge.ts and apps/server/src/shortReel/topicConfirmation.ts.
Inspect apps/server/src/repository/shortReels.ts and question-history persistence before changing publication or idempotency.
Create apps/server/src/repository/confirmationRecovery.ts only for shared durable lifecycle policy if both workflows genuinely use it.
Extend apps/server/test/boundTopicConfirmation.test.ts, shortReelConfirmationRecovery.test.ts, shortReelLocalization.test.ts and topicToEpisodePipelineE2E.test.ts.

## Tasks

- [ ] Episode: inject appendQuestionHistory failure after publication. Reopen repository, retry and assert exactly one Episode, one history entry per source, selected Topic and a genuinely completed receipt.
- [ ] Short-Reel: inject first preparing-receipt failure after product creation. Reopen and retry de/fr; require complete localized product or an explicit recoverable state, never successful receipt-less replay of an incomplete Reel.
- [ ] Inject completed-receipt failure after Reel history write. Retry must not reject its own cooldown and must preserve the reserved product ID/hash/options.
- [ ] Reserve identity durably before discoverable publication. Stage required artifacts, then publish; reconcile history, Topic projection and channel state idempotently before completed. Persist admitted source data needed to recover without reselection.
- [ ] Validate required artifacts during completed replay. Missing/corrupt quiz, director plan or localization must not become empty successful results.
- [ ] Normalize effective count/style/aspect/language once, using documented candidate defaults and persisted options. Omitted values and equivalent explicit defaults replay; different effective options conflict.
- [ ] Run three simultaneous identical requests and simultaneous de/fr requests. Verify serialization, one identity, expected conflicts and no unhandled rejection. Test separate repository instances on the same isolated root; document whether multiple OS processes are supported.
- [ ] Verify pipeline scheduling recovery: after publication failure/retry, auto-start must not silently disappear or launch twice. Record scheduling state or use existing idempotent task keys.
- [ ] Test failures before and after each receipt, localization, publication, history, projection and scheduler boundary. Use deferred gates, not timing sleeps.
- [ ] Write reports/phase-3.md with the state transition matrix and observed restart results.

Do not treat adding preparing to the schema alone as transactional safety. Legacy adoption requires validated complete artifacts and provenance; otherwise return an explicit recovery error.
