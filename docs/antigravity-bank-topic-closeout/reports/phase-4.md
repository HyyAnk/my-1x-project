# Phase 4 Report: Product Localization

## Result

PASS. Phase 4 (Product Localization) complete on working copy checkout.

## Reproduction

- **L1 (Channel Language Change Invalidating / Deleting Confirmed Products):**
  - *Fixture & Setup:* `apps/server/test/productLocalizationConsumers.test.ts` test case `"Finding L1: Channel Language Change Invariance > preserves existing German Short-Reel and Episode localization when channel changes to French"`.
  - *Before Repair:* In `apps/server/src/repository/channels.ts`, `updateChannel` invoked `invalidateShortReelLocalizations` whenever `data.language` changed, physically deleting `localization.json` from disk across all Short-Reels on the channel. In addition, existing Episode products were left susceptible to channel mutation.
  - *Observed Failure:* Changing channel language from `de` to `fr` wiped out `localization.json` for existing German reels, violating the immutable product language contract.
  - *After Repair:* Removed `invalidateShortReelLocalizations` from `channels.ts`. Existing confirmed products retain their immutable target language, `localization.json`, and ready units. Channel language changes apply strictly to future confirmations.

- **L2 (Episode Description Language Boundary & Fallback Integrity):**
  - *Fixture & Setup:* `apps/server/test/productLocalizationConsumers.test.ts` test cases `"Finding L2: Episode Description Language Boundary & Fallback Integrity"`.
  - *Before Repair:*
    - In `apps/server/src/quiz/pipeline/orchestrator.ts`, `generateEpisodeDescription` did not load the product localization artifact or resolve target language, passing `channel.language` to `generateVideoDescription`. If a channel language changed from `de` to `fr`, descriptions for existing `de` episodes were prompted and assembled in `fr`.
    - In `apps/server/src/quiz/description/descriptionPromptCompiler.ts`, prompt compilation did not project localized question and choice text.
    - In `apps/server/src/quiz/description/descriptionGenerator.ts`, fallback handling on LLM failure labeled generic English fallback strings (e.g. `"1 pts: Beginner"`, `"How many did you get right?"`) as `de` or `fr`.
    - When `localization.json` was missing for a non-English confirmed product, `orchestrator.ts` fell back to implicit English projection rather than failing closed with a typed error.
  - *Observed Failure:* Existing German episodes generated French descriptions after channel update; LLM provider failures emitted English strings labeled as German; missing localization silently projected English without recovery error.
  - *After Repair:*
    - In `productLocalization.ts`, added `findConfirmationReceiptForProduct`, `resolveEpisodeTargetLanguage`, and `resolveShortReelTargetLanguage`. If a product was confirmed to non-English and `localization.json` is missing, it throws typed `PRODUCT_LANGUAGE_UNRESOLVED`.
    - In `orchestrator.ts`, `generateEpisodeDescription` resolves product target language and passes both `targetLanguage` and `localization` to `generateVideoDescription`.
    - In `descriptionPromptCompiler.ts`, prompt compiles with localized questions and choices from `localization.json`.
    - In `descriptionFormatter.ts` and `descriptionGenerator.ts`, grounded German and French fallbacks are provided, never labeling English copy as `de`/`fr`, and unsupported languages throw typed `DESCRIPTION_LOCALIZATION_FAILED`.

- **Thumbnail and Script Consumer Boundaries:**
  - *Fixture & Setup:* `apps/server/test/productLocalizationConsumers.test.ts` test cases under `"Thumbnail and Script Prompt Boundaries"`.
  - *Before Repair:*
    - In `apps/server/src/quiz/thumbnail/thumbnailService.ts`, `createThumbnailPlan` received `channel.language || "English"` rather than the confirmed product's target language.
    - In `apps/server/src/shortReel/exportService.ts`, `exportShortReelPackage` did not call `resolveShortReelTargetLanguage`, permitting non-English confirmed reels missing `localization.json` to fall back to English projection.
  - *Observed Failure:* Thumbnail prompt instructed target language `fr` instead of confirmed `de` after channel update; Short-Reel export did not fail closed on missing localization artifact.
  - *After Repair:*
    - `thumbnailService.ts` resolves episode target language via `resolveEpisodeTargetLanguage` and passes `targetLanguage` to `createThumbnailPlan` -> `planThumbnailWithAI`. All visual, atmosphere, camera, and mascot instructions stay English; only `hook_text` and `badge_text` target the product language.
    - `exportService.ts` calls `resolveShortReelTargetLanguage`, throwing typed `PRODUCT_LANGUAGE_UNRESOLVED` when a non-English reel lacks its localization artifact.

- **Zero Bank Write-back Guarantee:**
  - *Fixture & Setup:* `apps/server/test/productLocalizationConsumers.test.ts` test case `"Zero Bank Write-back Guarantee Across Consumers"`.
  - *Assertion:* Verified that after executing confirmation, description generation, thumbnail planning, and export workflows, Question Bank storage files (`index.json` and batch files) remain byte-for-byte identical via SHA-256 digests.

## Implementation

- **`apps/server/src/repository/channels.ts`:**
  - Removed `invalidateShortReelLocalizations` call from `updateChannel`. Channel language changes are advisory for future confirmations and do not mutate or delete existing product localizations.
- **`apps/server/src/quiz/bank/localization/productLocalization.ts`:**
  - Added `findConfirmationReceiptForProduct(repo, channelId, productId)`.
  - Added `resolveEpisodeTargetLanguage(repo, channelId, episode)`: returns `{ targetLanguage, localization }` from `localization.json` or receipt, throwing typed `PRODUCT_LANGUAGE_UNRESOLVED` if missing for non-English confirmed products.
  - Added `resolveShortReelTargetLanguage(repo, channelId, reel)`: mirrors episode logic for Short-Reels.
- **`apps/server/src/quiz/description/descriptionPromptCompiler.ts`:**
  - Updated `compileVideoDescriptionPrompt` to accept `targetLanguage` and `localization`, projecting localized question titles and choice strings into the LLM context.
- **`apps/server/src/quiz/description/descriptionFormatter.ts`:**
  - Added localized scoring headers and playlist category labels for `de` (`"🏆 PUNKTESTUFEN:"`, `"📂 Playlist-Kategorie:"`) and `fr` (`"🏆 BAREME DE SCORE :"`, `"📂 Catégorie de playlist :"`).
- **`apps/server/src/quiz/description/descriptionGenerator.ts`:**
  - Normalizes target language from `deps.targetLanguage || deps.localization?.target_language || deps.channel.language || "en"`.
  - In `buildGroundedFallbackDescription`: returns fully localized German and French CTA and scoring copy; rejects unsupported non-English targets with typed `DESCRIPTION_LOCALIZATION_FAILED`; never labels English fallback text as `de` or `fr`.
- **`apps/server/src/quiz/pipeline/orchestrator.ts`:**
  - In `generateEpisodeDescription`: calls `resolveEpisodeTargetLanguage(input.repository, input.channelId, episode)` and passes `targetLanguage` and `localization` to `generateVideoDescription`.
- **`apps/server/src/quiz/thumbnail/thumbnailService.ts`:**
  - In `generateEpisodeThumbnail`: calls `resolveEpisodeTargetLanguage(repository, channelId, episode)` and passes `targetLanguage` to `createThumbnailPlan`, ensuring thumbnail AI prompt targets confirmed product language even after channel changes.
- **`apps/server/src/shortReel/exportService.ts`:**
  - In `exportShortReelPackage`: calls `resolveShortReelTargetLanguage(repository, key.channel_id, record)`, ensuring missing localization artifacts for non-English confirmed reels fail closed.
- **`apps/server/test/productLocalizationConsumers.test.ts`:**
  - Created end-to-end integration test suite covering L1, L2, thumbnail boundary, short-reel script boundary, export failure on missing localization, and zero Bank write-back.

## Verification

- **Execution Date:** 2026-09-09
- **Commands Executed:**
  - `npx vitest run test/productLocalizationConsumers.test.ts`
    - Exit Code: 0
    - Tests: 7 passed (7 total)
  - `npx vitest run test/productLocalization.test.ts test/shortReelLocalization.test.ts`
    - Exit Code: 0
    - Tests: 24 passed (24 total)
- **Observed Consumer Payloads (Secrets Redacted):**
  - *Episode Description Prompt (German Product on French Channel):*
    ```
    - Language: de
    - Question Count: 3
    ...
    [QUESTIONS & CHOICES]:
    1. [de] What is planet number 1 from the sun?
       Choices:
       - [c1] [de] Planet 1 name (CORRECT)
       - [c2] [de] Wrong planet 1A
       - [c3] [de] Wrong planet 1B
    ```
  - *Thumbnail AI Planner Prompt (German Product on French Channel):*
    ```
    [EPISODE CONTEXT]:
    - Topic Title: "Solar System Secrets"
    - Topic Summary: "[de] Exploring the inner planets with deep astronomy facts"
    - Target Language: "de"
    - Question Format: "multiple_choice"

    [CRITICAL INSTRUCTIONS]:
    1. hook_text: Catchy headline (2-4 words MAX in de).
    2. badge_text: High-impact curiosity trigger badge (1-3 words + 1 relevant emoji in de).
    ...
    4. environment_atmosphere: A clean minimalist, soft-focus Pixar 3D studio background...
    ```
  - *Short-Reel Script (German Target):*
    ```
    Narrative (English): "Mascot enthusiastically introduces the cosmic showdown between two celestial titans."
    Audio Direction (English): "Dramatic sci-fi synthesizer swell with rising tension."
    Text Cue (German): "[HOOK] [de] Where could humans survive longer?"
    ```
  - *Question Bank Immutability:*
    - Index SHA-256 Before: `ba60cbbbeed63273e93433556ab75086d34bcf1b569bfb47a7407a514d7a86f9`
    - Index SHA-256 After:  `ba60cbbbeed63273e93433556ab75086d34bcf1b569bfb47a7407a514d7a86f9`
    - Match: EXACT (zero byte delta).

## Remaining Work

- None for Phase 4.
- Phase 5 (`phase-5-availability-ui.md`): Fix UI and availability findings U1, U2, U3 in topic list and ChannelTopicsTab.

## Safety

- Temporary isolated storage roots utilized for all test fixtures.
- No live migration or destructive operations against live Bank.
- Zero translated Bank write-back verified by SHA-256 digests.
- Existing dirty edits in working copy strictly preserved.
- No subagents spawned; strictly executed directly in session.
