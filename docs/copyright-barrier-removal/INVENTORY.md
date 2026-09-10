# Change Inventory

Planning snapshot: 2026-09-10, HEAD `0e94a9aa58e9ffca89e5823c616311277a97c468`. The working tree differs substantially from HEAD. See `execution/planning-baseline.json` for observed paths and hashes. Re-run CodeGraph and searches before edits; this list is not proof that future files are unaffected.

## Confirmed runtime targets

Paths in the first table are relative to `apps/server/src/`.

| Target                                               | Observed role                                                       | Action / owner phase                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `context/quizDirectPromptBuilder.ts`                 | Injects global and topic-specific copyright guidance                | Remove imports, construction, and injection; P1                                                            |
| `context/quizDirectCopyrightGuidance.ts`             | Global prohibitions, topic detection, proxy instruction             | Delete after callers removed; P1                                                                           |
| `tasks/validators.ts`                                | Research/treatment/script rejection                                 | Remove copyright branches only; P1                                                                         |
| `tasks/handlers/directQuizHandler.ts`                | Early gate before saving balanced QuizV2                            | Remove gate, preserve write/history/invalidation/stage order; P1                                           |
| `quiz/qa/stages/assessSemanticQa.ts`                 | Copyright blocker for visual text; warning for other fields         | Remove both severities, keep other QA; P1                                                                  |
| `quiz/qa/copyrightValidator.ts`                      | Regex table and text/script/research checks                         | Retire after classifier dependency is removed; P4                                                          |
| `quiz/qa/quizV2CopyrightValidator.ts`                | Field-by-field QuizV2 gate                                          | Delete after callers/tests migrate; P1/P4                                                                  |
| `quiz/bank/questionBankAutoQa.ts`                    | Copyright issue creation, reject status, summary                    | Remove issue production in P1; summary cleanup P5                                                          |
| `quiz/bank/prompts/standardBatchPromptBuilder.ts`    | Copyright prohibition mixed with non-IP safety                      | Remove only prohibition; P1                                                                                |
| `quiz/assets/promptCompiler.ts`                      | Rewrites subject and full prompt; publishes cacheVersion            | Preserve subject, remove wrappers, bump version; P2                                                        |
| `quiz/thumbnail/thumbnailPromptCompiler.ts`          | Sanitizes final thumbnail prompt                                    | Remove identity replacement, retain hook/framing; P2                                                       |
| `quiz/assets/visualPromptSanitizer.ts`               | Public IP substitution/safety facade                                | Delete once no callers remain; P2                                                                          |
| `quiz/assets/sanitizer/visualPromptSanitizerCore.ts` | Rules, brand scrubbers, substitution, validation                    | Delete after consumers move; P2                                                                            |
| `quiz/assets/sanitizer/stage1ProxyAdapter.ts`        | Converts IP definitions to proxy rules                              | Delete; P2                                                                                                 |
| `quiz/assets/sanitizer/extendedVisualRules.ts`       | Lion-cub, game, superhero, cinema replacement                       | Delete after review confirms no new non-IP rules; P2                                                       |
| `quiz/assets/sanitizer/sanitizerTypes.ts`            | IP proxy/safety types                                               | Delete when unused; P2                                                                                     |
| `utils/promptSanitizer.ts`                           | Mixed formatting, LLM execution, safety rewrite with copyright rule | Remove copyright instruction and unused rewrite API after P3 call-site audit; retain independent utilities |
| `tasks/imageRunner.ts`                               | On rejection, rephrases and persists visual bible                   | Stop automatic content-filter rewrite/writeback; P3                                                        |
| `quiz/assets/resolvers/providerAssetResolver.ts`     | Gpti2 rejection rephrasing; ordinary retries                        | Stop identity-changing recovery, preserve transport behavior; P3                                           |
| `quiz/bank/knowledgeBase.types.ts`                   | Enforcement metadata mixed with curated asset provenance            | Remove four entity fields and risk type; retain curated fields; P4                                         |
| `quiz/bank/knowledgeBaseLoader.ts`                   | Re-exports risk type; caches entities                               | Remove risk exports; preserve loading; verify legacy compatibility and refresh; P4                         |
| `quiz/bank/assets/entityAssetCollector.ts`           | Currently unused `CollectorEntityInput.safeVisualProxy`             | Verify zero reads then remove property; preserve collection/provenance; P4                                 |
| `quiz/bank/batch/batchChunkScheduler.ts`             | Initializes/aggregates copyrightRejections                          | Remove active summary category; P5                                                                         |
| `quiz/bank/questionBankBatchService.ts`              | Passes summaries to consumers                                       | Verify no hidden mapping and response consistency; P5                                                      |

## Audit modules to retire

All are under `apps/server/src/quiz/bank/audit/`. Remove exact files only after all references are resolved; do not recursively delete a directory that has gained unrelated files.

- `index.ts`
- `entityCopyrightAuditor.ts`
- `entityCopyrightClassifier.ts`
- `entityCopyrightRules.ts`
- `rules/ruleTypes.ts`
- `rules/gameIpRules.ts`
- `rules/disneyCoreRules.ts`
- `rules/classicCartoonRules.ts`
- `rules/cinemaIpRules.ts`
- `rules/animationStudioRules.ts`

`sanitizeKnowledgeBaseEntitiesDir` currently writes policy fields into JSON. Ensure no script, schedule, barrel export, or dynamic import can invoke it after migration.

## Cross-layer targets

| Exact path                                                         | Action                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `shared/prompt_rules.md`                                           | Remove IP/lion-cub ban; retain valid rendering instructions                 |
| `shared/script_rules.md`                                           | Remove protected-character/franchise ban; retain narrative rules            |
| `apps/web/src/i18n/locales/en/questionBank.ts`                     | Remove two obsolete descriptions of copyright filtering                     |
| `apps/web/src/features/questionBank/types/questionBankUi.types.ts` | Remove active summary property; review legacy input compatibility           |
| `apps/web/src/features/questionBank/questionBankUi.test.tsx`       | Update batch fixture and assert UI state after mutation                     |
| `scripts/generate-question-bank-batch.mjs`                         | Remove copyright log line/category; use structured helper for modified tool |
| `docs/quiz-engine-v2.md`                                           | Update active architecture/QA documentation                                 |
| `eslint-suppressions.json`                                         | Remove only entries made obsolete by deleted files, using supported tooling |

## Integration surfaces to inspect, not blindly rewrite

- `apps/server/src/quiz/assets/resolveQuizAssets.ts`, `assetValidator.ts`, `assetFingerprint.ts`, `assetResolver.ts`, `assetPlanner.ts`, `promptFramingRules.ts`: cache version consistency, explicit assets, semantic match, and requested-logo handling.
- `apps/server/src/providers/googleImagen.ts`, `providers/antigravity/promptExtractor.ts`: appended “no logos” composition instructions must not overrule a requested identifying mark.
- `apps/server/src/providers/antigravityImageChain.ts`, `providers/antigravity/provider.ts`, `providers/imageGeneration/`: existing fallback, error translation, and real failure classification.
- `apps/server/src/shortReel/compiledPromptRefresh.ts`, `coverPrompt.ts`, `stylePrompt.ts`, `visualContextService.ts`, `generationWorkflow.ts`: check indirect use of changed shared builders, caches, and provider errors.
- `apps/server/src/routes/questionBank/`, `apps/web/src/features/questionBank/`: active batch response, pending state, and cache invalidation consumers.
- `packages/shared/src/`: discover any shared contract added since planning; no copyright-specific shared schema was found by the initial narrow scan.
- `templates/`, `channels/`, `.agents/`, `.github/`, `services/`, `apps/server/scripts/`, `scripts/`: active template overrides, import/export tasks, and reintroduction paths.

## Existing tests

| Test under `apps/server/test/`                                       | Required change                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `episodeCopyrightRemediation.test.ts`                                | FIRST isolate external fixture reads and real `quiz/qa.json` write; later replace proxy expectations   |
| `directQuizCopyrightGate.test.ts`                                    | Replace prohibition tests with public prompt/handler identity behavior                                 |
| `copyrightValidator.test.ts`                                         | Replace deleted-private-API tests with live pipeline regressions                                       |
| `visualPromptSanitizer.test.ts`                                      | Replace proxy expectations with compiler identity tests                                                |
| `entityCopyrightAudit.test.ts`                                       | Replace obsolete classifier tests with metadata-migration/loader compatibility tests                   |
| `questionBankAutoQa.test.ts`                                         | Accept valid IP candidates; retain negative quality/schema/duplicate coverage; adjust aggregate totals |
| `promptSanitizer.test.ts`                                            | Keep provider error and non-IP behavior tests; ensure no copyright rewriting                           |
| `quizAssetsQa.test.ts`                                               | Cache version, exact subjects, required assets, path safety                                            |
| `thumbnailPromptEngine.test.ts`                                      | Both aspect ratios preserve chosen subject names                                                       |
| `thumbnailService.test.ts`, `thumbnailPipelineE2E.test.ts`           | Version persistence and error/preview synchronization                                                  |
| `curatedAssetPriority.test.ts`, `curatedEntityAssetRegistry.test.ts` | Curated preference and provenance preservation                                                         |
| `shortReelWorkflowV2.test.ts`, `shortReelScriptContext.test.ts`      | Shared-context/provider integration smoke                                                              |

Existing test filenames may be retained while behavior changes. Do not keep tests importing deleted modules or delete negative QA coverage merely to make the suite pass.

## Data observations

The local `.quiz-studio/knowledge_base/entities/` snapshot contains 14 JSON files and 2,500 entities. 97 entities have at least one of the four enforcement keys: `mythology_creatures.json` (1), `nature_animals.json` (2), `pop_culture_classics.json` (77), `sports_games.json` (17). Other keyword matches can be ordinary entity text, not enforcement metadata.

These counts are a baseline, not hard-coded migration expectations. The live storage root can be outside this repository. Resolve it read-only at execution time and obtain exact-target approval before applying changes there.

## New implementation files

These are planned files, not files already created by this package.

| Planned path                                                       | Responsibility                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `apps/server/test/helpers/authorizedContentFixtures.ts`            | Valid schema-backed identity fixtures                                        |
| `apps/server/test/authorizedContentGeneration.test.ts`             | Public generation and semantic QA behavior                                   |
| `apps/server/test/authorizedContentVisuals.test.ts`                | Asset and thumbnail identity/cache assertions                                |
| `apps/server/test/authorizedContentProviderErrors.test.ts`         | Provider rejection, retry, cancellation, persistence                         |
| `apps/server/test/knowledgePolicyMigration.test.ts`                | Pure transform and filesystem transaction tests                              |
| `apps/server/test/fixtures/knowledge-policy-removal/entities.json` | Synthetic source file for repeatable migration CLI rehearsal                 |
| `apps/server/test/authorizedContentPipeline.test.ts`               | Hermetic end-to-end repository/API flow                                      |
| `scripts/migrations/knowledge-policy-removal/types.ts`             | Explicit migration plan/manifest contracts                                   |
| `scripts/migrations/knowledge-policy-removal/transform.ts`         | Pure removal of exactly four fields                                          |
| `scripts/migrations/knowledge-policy-removal/files.ts`             | Validated root, hashes, backups, atomic writes, rollback                     |
| `scripts/migrations/knowledge-policy-removal/cli.ts`               | Thin dry-run/apply/rollback entry point                                      |
| `scripts/lib/terminalLogger.mjs`                                   | Reusable structured color-coded CLI logger, only if no fitting helper exists |

If new evidence changes these boundaries, update this inventory and the affected phase before implementation. Record the reason in the evidence ledger.
