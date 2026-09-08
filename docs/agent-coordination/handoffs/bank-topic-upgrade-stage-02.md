# Phase 2A: Bank Contracts And English Eligibility Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: codex-stage02-recovery
- Working mode: main-direct
- Baseline before edits: `feaf77a5aa591116fa0f23320943fb1c5da3447c`, with the pre-existing dirty paths recorded by the claim registry

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/parallel-execution-policy.md
- docs/agent-coordination/templates/phase-handoff-summary.md
- docs/bank-topic-upgrade/design.md
- docs/bank-topic-upgrade/implementation-plan.md
- docs/bank-topic-upgrade/progress.md
- docs/agent-coordination/handoffs/bank-topic-upgrade-coordinator.md
- docs/agent-coordination/handoffs/short-reel-phase-08.md

## Files Changed

- packages/shared/src/index.ts
- packages/shared/src/schemas/channel.ts
- packages/shared/src/schemas/index.ts
- packages/shared/src/schemas/topicRun.ts
- packages/shared/src/schemas/topicSourceBinding.ts
- packages/shared/src/shortReel/shortReel.schema.ts
- packages/shared/src/utils/contentHash.ts
- packages/shared/test/topicSourceBinding.test.ts
- apps/server/src/shortReel/questionEligibility.ts
- apps/server/src/quiz/bank/bankEligibility.ts
- apps/server/src/quiz/bank/bankInventory.ts
- apps/server/src/quiz/bank/batch/batchChunkScheduler.ts
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts
- apps/server/src/quiz/bank/prompts/batchPromptOutputParser.ts
- apps/server/src/quiz/bank/questionJitSeeder.ts
- apps/server/test/bankEligibility.test.ts
- apps/server/test/bankInventory.test.ts
- apps/server/test/batchPromptOutputParser.test.ts
- apps/server/test/questionJitSeeder.test.ts
- apps/server/test/shortReelQuestionEligibility.test.ts
- docs/agent-coordination/handoffs/bank-topic-upgrade-stage-02.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: only files covered by the Stage 2A claim; unrelated pre-existing dirty paths were preserved

## Scope

- Claimed phase: Stage 2A shared contracts, Bank eligibility, inventory, and Bank generation language propagation
- Allowed scope used: shared-contracts, short-reel-application, server-core, server-tests, coordination-handoffs
- Scope deviations: expanded the existing server-tests claim by one concrete path, `apps/server/test/shortReelQuestionEligibility.test.ts`, to update assertions for the approved English-only Bank contract

## Decisions

- Decision: Bank eligibility admits only approved, structurally valid questions with explicit English source metadata (`en` and tolerated legacy English aliases); stored Bank translations and channel target language do not make a source eligible.
- Reason: the approved architecture makes Bank an immutable English-only source store and moves localization to product-owned Stage 4 artifacts.
- Impact on later phases: Stage 3 must allocate only native English source bindings; Stage 4 must localize after exact-source conversion and must never write translations to Bank.

- Decision: `TopicSourceBindingSchema` requires source hash version 1, lowercase SHA-256 content hash, native provenance, and resolved language `en`; binding sets reject duplicate source IDs.
- Reason: source identity must be server-owned and stable across channel language changes.
- Impact on later phases: Stage 3 planners consume these exact binding fields and must not accept model-supplied replacement IDs or hashes.

- Decision: `TopicRunCandidateSchema` enforces one source binding for Short-Reel candidates and `question_count` bindings for Episode candidates.
- Reason: persisted allocation cardinality must match the product contract.
- Impact on later phases: planners must persist exact allocated counts and typed shortages rather than fabricating or duplicating sources.

- Decision: `hashBankQuestionSource` canonicalizes immutable Bank content while excluding translations, timestamps, and cooldown projection. Inventory snapshot tokens exclude channel target language.
- Reason: localized fields and channel settings must not change Bank source identity or availability counts.
- Impact on later phases: Stage 2B must record post-migration hashes as the baseline; Stage 3 and Stage 4 must recheck those hashes before publication.

- Decision: Bank batch and JIT generation normalize English aliases and regional English to `en`, reject Vietnamese and unsupported targets before provider calls, and persist `language: "en"`.
- Reason: generation/import must not create foreign Bank source records or infer unknown language as English.
- Impact on later phases: product localization accepts its own explicit target allowlist independently and remains outside Bank persistence.

## Exact Contracts And Exports

- Shared schemas/types: `TopicSourceBindingSchema`, `TopicSourceBindingSetSchema`, `TopicSourceProjectionProvenanceSchema`, `TopicSourceExclusionReasonCodeSchema`, `TopicSourceShortageSchema`, `TopicInventoryScanStatusSchema`, `TopicAvailabilitySchema`, `TopicAvailabilityBatchSchema`, `TopicRunCandidateSchema`, `TopicRunResultSchema`.
- Shared hash exports: `hashBankQuestionSource`, `sourceCanonicalJsonStringify`, `sourceSha256Hex`.
- Eligibility exports: `evaluateBankQuestionEligibility`, `evaluateEpisodeQuestionEligibility`, `evaluateShortReelQuestionEligibility`, `EvaluatedBankQuestionCandidate`, `BankQuestionEligibilityResult`.
- Inventory exports: `BankInventoryReader`, `BankInventoryScanOptions`, `BankInventoryScan`, `scanBankInventory`.
- Generation language export: `normalizeGenerationLanguage` (also re-exported through `batchGeneratorPrompt.ts`).

## Verification

- Command: `pnpm --filter @studio/shared build`
- Result: passed
- Notes: shared TypeScript build completed successfully.

- Command: `pnpm --filter @studio/shared test`
- Result: passed
- Notes: 3 tests passed.

- Command: `pnpm --filter @studio/server test`
- Result: passed
- Notes: 181 test files and 1,323 tests passed.

- Command: `pnpm typecheck`
- Result: passed
- Notes: shared, server, and web typechecks passed.

- Command: `pnpm build`
- Result: passed
- Notes: shared, server, and web builds passed.

- Command: focused shared/server tests for topic bindings, Bank eligibility/inventory, parser, JIT seeding, and Short-Reel eligibility
- Result: passed
- Notes: 18 focused Stage 2 tests plus 13 Short-Reel contract tests passed; the inventory suite includes translation-hash exclusion and language-independent snapshot coverage.

- Command: scoped ESLint and Prettier checks for all changed Stage 2 source/test files
- Result: passed
- Notes: no lint errors and all checked files use Prettier style.

- Command: `git diff --check`
- Result: passed
- Notes: no whitespace errors.

- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: passed
- Notes: 1,942 files and 24 zones validated with zero definition errors, unmapped files, or overlaps.

## Open Risks

- Risk: Stage 2A does not implement the canonical Bank read/write serialization boundary or the backed-up missing-language migration.
- Suggested next action: after this claim is released, a separate Stage 2B worker must enumerate every cooperating Bank writer, freeze lock order, add race-barrier tests, build the exact manifest with byte and semantic hashes, apply only the user-attested missing `language: "en"` metadata, and record the post-migration revision/hash baseline.

- Risk: direct filesystem edits outside cooperating writers cannot be transactionally excluded.
- Suggested next action: Stage 2B and later confirmation must detect revision/hash drift and reject mixed snapshots rather than promise OS-level exclusion.

- Risk: existing legacy translation storage and transcreation paths remain in the repository for legacy product flows.
- Suggested next action: Stage 4 must keep the upgraded flow product-localized and verify Bank bytes/index remain unchanged during product creation.

## Next Phase Input

- Files the next agent must read: docs/bank-topic-upgrade/design.md, docs/bank-topic-upgrade/implementation-plan.md, docs/bank-topic-upgrade/progress.md, this handoff, and the latest agent registry status.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`, `git status --porcelain`, and the Stage 2B focused tests after claiming concrete migration/writer files.
- Important constraints: do not apply live Bank migration under this released Stage 2A claim; do not add provider spending or Flow operations; preserve the English-only Bank boundary; do not create branches or worktrees; acquire a new claim after this one releases; Stage 3 hashes only the verified post-migration state.

## Review Fix Round 1

- Fixed critical raw-candidate bypass: `validateBankRawCandidateLanguages` now rejects every direct candidate whose language is not exactly `en` before QA, persistence, job launch, or provider resolution. The service applies the guard to direct callers; the batch route returns typed `400 BANK_ENGLISH_ONLY` before starting synchronous or background work.
- Fixed source hash contract: `hashBankQuestionSource` now accepts only the Bank question and excludes translation fields without an optional translation argument. Its public function arity and localized-field invariance are covered by `packages/shared/test/contentHash.test.ts`.
- Added producer-path coverage: raw `fr`, `vi`, unknown, missing, and legacy `English` candidates are rejected with zero save calls; invalid scheduler language invokes zero provider calls; reverse parser output persists `language: "en"`; existing direct imports now declare explicit `en`.

### Review Fix Verification

- `node --import tsx --test packages/shared/test/contentHash.test.ts`: passed, 1/1.
- `pnpm --filter @studio/server test -- questionBankBatchService.test.ts questionBankRoute.test.ts batchPromptOutputParser.test.ts bankInventory.test.ts`: passed, 42/42.
- `pnpm --filter @studio/server exec vitest run test/questionBankReverseMatrixE2E.test.ts test/questionBankBatchService.test.ts test/questionBankRoute.test.ts test/questionBankAutoQa.test.ts`: passed, 68/68.
- Full required verification: shared build passed; shared tests passed (3/3); workspace typecheck passed; server suite passed (181 files, 1,330 tests).
- Scoped ESLint and Prettier checks passed; `git diff --check` passed; `node scripts/agent-validate-zones.mjs --json` passed with zero definition errors, unmapped files, or overlaps.
- The reverse-matrix REST fixture was updated with explicit `language: "en"` so the reviewed English-only boundary is represented correctly. No live Bank migration or coherent snapshot boundary was attempted.
