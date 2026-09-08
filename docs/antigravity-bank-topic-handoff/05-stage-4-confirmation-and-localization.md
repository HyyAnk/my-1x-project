# Stage 4 Confirmation And Product Localization Implementation Plan

**Goal:** Build from exact persisted English sources and translate only approved product fields.
**Dependency:** Accepted Stage 3 bindings and Stage 2B storage boundary.

## Integration files

- `apps/server/src/shortReel/topicConfirmation.ts`: bound source resolution, no archetype reselection.
- `apps/server/src/routes/channels.ts`: thin validated transport; retain Episode request_id.
- `apps/server/src/quiz/bank/questionBankToQuizBridge.ts`: remove hidden JIT/transcreation/Bank translation cache from bound flow.
- `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts`: strict lossless conversion.
- `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts`: stage complete artifacts before discoverable publication.
- `apps/server/src/repository/shortReelWriterAdmission.ts`, `shortReelMutationQueue.ts`: reuse compatible admission without nested locks.
- Locate actual description/thumbnail/script producer and invalidation consumers with CodeGraph before exact claim expansion.

Proposed focused modules: `apps/server/src/quiz/bank/bridge/boundSourceResolver.ts`, `apps/server/src/repository/topicConfirmationReceipts.ts`, `apps/server/src/quiz/localization/productLocalization.ts`. These are proposed paths, not existing APIs; inspect nearby architecture and freeze exact signatures before consumers. Proposed tests: `apps/server/test/boundTopicConfirmation.test.ts`, `productLocalization.test.ts`.

## Confirmation slice

- [ ] RED: edit/delete/unapprove/cooldown after suggestion rejects before publication.
- [ ] RED: concurrent confirmation and restart replay create one product; same options replay before mutable Bank checks; changed options return CONFIRMATION_OPTIONS_CONFLICT with zero side effects.
- [ ] RED: forged client bindings, cross-channel access, unbound legacy Topics and excessive counts reject.
- [ ] GREEN: use server-persisted bindings and immutable snapshot under the shared boundary. No fallback selection, invented choices or truncation.
- [ ] Stage complete products outside discoverable directories. Test crash after preparation, before publish and after publish before receipt update. Reconcile history/topic projection on retry.
- [ ] Do not hold Bank locks during slow provider work unnecessarily; final publication validates required state again under the agreed lock order.

## Localization slice

- [ ] Freeze a versioned product-only localization artifact: target, source IDs/hash, status, quiz strings, description, thumbnail text.
- [ ] RED: en makes zero translation calls; de-DE normalizes to de; fr accepted; vi/vi-VN/unknown fail before provider.
- [ ] RED: dropped/duplicate/changed choice IDs or correctness mappings fail; never infer correctness from translated text.
- [ ] GREEN: only the three approved field groups change; script narrative/instructions, source, Topic and visual/image prompts remain English.
- [ ] Publish the localization artifact atomically; failed attempts preserve English source state and retry safely. Keep downstream description/thumbnail generation consistent with the artifact lifecycle.
- [ ] Channel language changes invalidate localization only, not original source identity or an already-created product receipt.
- [ ] Trace every consumer to prove localized quiz/thumbnail strings reach actual rendering instructions, not just stored JSON.
- [ ] Remove all reachable Bank translation writeback, including legacy quick-build paths. Replace retired Bank translation UI/API behavior explicitly; preserve old created products.
- [ ] Audit historical translation data for a separately reviewed backed-up cleanup; do not conflate field removal with the language metadata migration.
- [ ] Assert Bank batches/index remain byte-identical across non-English product generation.

Output: `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-04.md`, exact artifact schema/paths, provider-double integration evidence, replay/crash tests, and verified release.
