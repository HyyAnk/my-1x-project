# Work 2: Finish Episode Confirmation And Localization

## Integration files

- `apps/server/src/quiz/bank/questionBankToQuizBridge.ts`
- `apps/server/src/quiz/bank/localization/productLocalization.ts`
- `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts`, `boundSourceResolver.ts`, `topicEpisodeBootstrapper.ts`, `singleQuestionBootstrapper.ts`, `bootstrapperHelpers.ts`, `bootstrapperTypes.ts`
- `apps/server/src/repository/topicConfirmationReceipts.ts`, `topics.ts`
- `apps/server/src/routes/channels.ts`
- Tests: boundTopicConfirmation, productLocalization, questionBankIntegration, topicToEpisodePipelineE2E.

## Required work

- [ ] Inspect the interrupted claim's partial tests/edits. Adapter existence is not production integration.
- [ ] Switch bound conversion to `convertBankQuestionToQuizQuestionLossless`; preserve IDs/order/correct answer and reject unsupported text length/structure rather than truncate/manufacture.
- [ ] Supply actual `llmClient` to `localizeProductContent`; English target bypasses translation. No cached Bank translation or offline-English fallback.
- [ ] Localize before any discoverable Episode record. Reserve deterministic identity or stage complete artifacts outside discoverable directories; publish only after source, quiz, localization and director data are validated.
- [ ] Direct single-question creation follows the same language boundary and leaves no product on translation failure.
- [ ] Keep English Topic/brief/narrative/director instructions. Ensure actual displayed quiz and description/thumbnail consumers use localized fields; returned quiz must match persisted quiz.
- [ ] Reject unbound new Topic creation in every public entrypoint, including repository.confirmTopic; old created products remain readable/replayable.
- [ ] Resolve all bindings from one coherent snapshot using shared eligibility, not independent per-ID reads. Preserve cooldown and source hash checks before publication; do not silently force/reselect.
- [ ] Durable receipt identity includes canonical root/channel/topic/kind and effective normalized options. Same options replay, different options conflict, corrupted/unreadable receipt is not treated as absent.
- [ ] Serialize concurrent confirmations; record preparation/recovery states so process interruption cannot duplicate or publish incomplete Episodes. Reconcile history/selected projection on retry.
- [ ] Test actual temp-storage de/fr success with provider doubles; missing/invalid provider leaves zero discoverable products; concurrent/restart replay; corrupt receipt; source mutation/deletion/cooldown; unbound rejection; Bank bytes unchanged.
- [ ] Review the legacy converter diff: earlier worker rewrote legacy helpers while adding lossless conversion. Avoid accidental legacy behavior changes and remove dead paths only with reachability evidence.

Output: `docs/agent-coordination/handoffs/product-episode-localization.md` with exact contracts, real workflow evidence, claim release and remaining risks.
