# Question bank and source-bound topics

Reviewed against working-tree source on 2026-09-09. The bank stores reusable English source questions; Episodes and Short Reels consume source-bound selections and own localized output.

## Boundaries and entry points

| Concern                           | Source                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Shared schemas                    | [questionBank.ts](../packages/shared/src/schemas/questionBank.ts)                          |
| Curation and generation           | [quiz/bank](../apps/server/src/quiz/bank/)                                                 |
| Durable storage and serialization | [repository/quiz/bank](../apps/server/src/repository/quiz/bank/)                           |
| Topic allocation                  | [bankTopicAllocation.ts](../apps/server/src/context/bankTopicAllocation.ts)                |
| Confirmation source validation    | [boundSourceResolver.ts](../apps/server/src/quiz/bank/bridge/boundSourceResolver.ts)       |
| Episode publication               | [questionBankToQuizBridge.ts](../apps/server/src/quiz/bank/questionBankToQuizBridge.ts)    |
| Short-Reel confirmation           | [topicConfirmation.ts](../apps/server/src/shortReel/topicConfirmation.ts)                  |
| Receipts                          | [topicConfirmationReceipts.ts](../apps/server/src/repository/topicConfirmationReceipts.ts) |
| Localization                      | [productLocalization.ts](../apps/server/src/quiz/bank/localization/productLocalization.ts) |

Use repository operations for reads and mutations; do not edit batch files or rebuild indexes ad hoc. Preserve path containment, serialized writes, snapshot identity and recovery behavior. An atomic rename of one file does not make an entire multi-file workflow atomic.

## Source policy

Canonical question content remains English. Product translations must not overwrite bank source text, question IDs or correct-answer identity.

Eligibility is product-specific and includes approval, English source, required shape and channel cooldown. See [bankEligibility.ts](../apps/server/src/quiz/bank/bankEligibility.ts). The same eligibility policy must feed availability and authoritative confirmation; a client-side enabled button is not authorization.

Source-bound candidates record source IDs and content hashes. Confirmation rechecks the current bank snapshot, required count and source identity. Missing, modified, ineligible or unbound legacy sources must be handled explicitly rather than silently replaced. A cooldown override is not a bypass for all source validation.

Bank generation/seeding modules exist separately from source-backed allocation. Do not infer that a shortage automatically authorizes fabricated questions or that the presence of a JIT module means every confirmation invokes it. Trace the actual caller and retain honest shortage reporting.

## Matrix and archetypes

[ALL_MATRIX_ARCHETYPES](../apps/server/src/quiz/bank/matrix/matrixCoverageCalculator.ts) currently includes:

```text
verdict_true_false  speed_blitz  deep_trivia  versus_faceoff
visual_spotting  visual_identification  mystery_reveal  clue_deduction
```

The matrix combines entities with archetypes; do not describe it as only a difficulty grid. [matrixDeficitPlanner.ts](../apps/server/src/quiz/bank/matrix/matrixDeficitPlanner.ts) owns deficit selection. [quizArchetypes.ts](../packages/shared/src/quizArchetypes.ts) describes gameplay blueprints; bank IDs, question formats and layout IDs are related but distinct contracts.

## Confirmation and localization

1. Resolve an authoritative candidate and validate its bound sources.
2. Compare any existing receipt with product kind and normalized options.
3. Prepare or recover the product using the recorded identity.
4. Localize audience-facing content at the product boundary.
5. Publish product artifacts and complete the receipt; enqueue further work only according to the flow's options.

Receipts have `preparing` and `completed` states. Their options fingerprint is a SHA-256 hash of canonicalized options, not a digital signature. Replays and conflicts are enforced by application logic, not by a signed-token authentication system.

Localized artifacts/projections retain source identity. The language resolver owns supported target languages and explicit rejection of unsupported targets. Existing products resolve their confirmed language through persisted product/receipt state; changing a channel is not an implicit translation migration for old products. Missing or corrupt localization requires explicit recovery, not mislabeled English fallback.

## UI synchronization and verification

[useTopicAvailability.ts](../apps/web/src/features/channel/hooks/useTopicAvailability.ts) owns availability refresh behavior. Preserve cancellation and stale-response guards; mutation completion must refresh affected topic/product views.

Useful regression entry points include [boundTopicConfirmation.test.ts](../apps/server/test/boundTopicConfirmation.test.ts), [topicAvailabilityRoute.test.ts](../apps/server/test/topicAvailabilityRoute.test.ts), [shortReelLocalization.test.ts](../apps/server/test/shortReelLocalization.test.ts), and [bankSerializationBoundary.test.ts](../apps/server/test/bankSerializationBoundary.test.ts). Exercise replay, conflicts, shortage, concurrent writes and corrupt persisted state using isolated fixtures. Historical reports are not evidence that these tests pass in the current checkout.
