# Bank-Topic Independent Review

## Status

- Result: changes required; overall acceptance rejected
- Date: 2026-09-08
- Working mode: main-direct
- Reviewed FINAL-REPORT.md, Stage 2B through Stage 6 handoffs, actual confirmation/localization code and repository writeback call sites.
- Preserved existing dirty work and concurrent refactors. No live migration performed by this review.

## Confirmed Defects

1. `questionBankToQuizBridge.ts` calls `localizeProductContent` without `translateFn`. Every non-English bound Episode reaches `TRANSLATION_PROVIDER_MISSING`; bootstrap occurs before this failure. Provider wiring and complete-before-publication behavior remain unfinished.
2. `shortReel/topicConfirmation.ts` does not invoke product localization. The only production caller found is the Episode bridge. Short-Reel target quiz/description/thumbnail rendering integration is not implemented by this artifact.
3. `routes/questionBank/buildRoutes.ts` still calls `saveQuestionBankTranslation`; `bankTranslationStore.ts` persists translated fields to Bank. English-only storage is not enforced across reachable paths.
4. Episode and Short-Reel confirmation retain legacy unbound fallback, explicitly contrary to the approved requirement to re-suggest. Stage 6 changed behavior to accommodate old tests instead of updating their obsolete expectations.
5. Bound source resolver queries each question separately, does not invoke the shared eligibility policy, and does not hold one snapshot through publication. Receipt reads swallow all errors as missing. Durable receipt existence alone is not proof of concurrency/crash-safe publication.
6. FINAL-REPORT migration section conflicts with Stage 2B handoff: 2,500 questions/knowledge_base/index rebuild versus 1,262 questions/redirected question_bank/index unchanged. Do not execute the report's rollback command without verifying the actual script and manifest.

## Fixed In This Review

`productLocalization.ts` previously accepted missing question, explanation, description and thumbnail translations, substituted English, and returned status applied for a non-English target. Added strict required-text checks with `LOCALIZATION_CONTENT_INCOMPLETE`; retained existing choice-integrity error behavior.

Files changed: `apps/server/src/quiz/bank/localization/productLocalization.ts`, `apps/server/test/productLocalization.test.ts`, this handoff.

## Reproduction And Verification

- In-memory tsx probe, no filesystem/provider: missing provider rejected; choice-only German result previously returned applied with English question/description/thumbnail.
- Four new behavioral tests failed before the fix because the promises resolved instead of rejecting.
- After fix: `pnpm --filter @studio/server exec vitest run test/productLocalization.test.ts test/boundTopicConfirmation.test.ts` passed, 20 tests.
- Server typecheck passed. Scoped ESLint passed after correcting a test callback's unnecessary async declaration.
- Zone validation passed, 1,996 files, no mapping/overlap errors at check time.
- Broader suite result is recorded in the claim verification evidence; these checks do not establish overall upgrade acceptance.

## Remaining Integration Boundary

Active external refactors observed for the Bank bootstrapper, thumbnail manager, Bank form UI and Short-Reel UI/routes tests. Recheck their claims before changing those paths; do not overwrite or bypass their work. Complete provider/renderer integration, publication/replay repair and Bank write-path hardening after coordination. Run real non-English Episode and Short-Reel HTTP workflows against explicit temporary storage; the current English-only happy-path tests do not cover these failures.
