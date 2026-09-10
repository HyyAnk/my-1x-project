# Evidence Ledger

## Planning evidence

| ID      | Observation                                                                                                               | Verification method                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| PLAN-01 | CodeGraph index exists and located copyright validator, guidance, and classifier call paths                               | Read-only CodeGraph exploration                    |
| PLAN-02 | Copyright checks affect task validators, direct quiz, semantic QA, bank QA, and generation prompts                        | Current source inspection and targeted `rg`        |
| PLAN-03 | Asset/thumbnail compilers apply IP proxy substitution; provider error recovery can persist rewritten visual prompts       | Current source inspection                          |
| PLAN-04 | `episodeCopyrightRemediation.test.ts` resolves real sibling storage and writes `quiz/qa.json`                             | Current test source inspection                     |
| PLAN-05 | 14 local knowledge files, 2,500 entities, 97 with at least one enforcement key                                            | Read-only JSON property counting                   |
| PLAN-06 | 196 initial Git status entries and 78 relevant file hashes recorded                                                       | `git status --porcelain=v1` and SHA-256            |
| PLAN-07 | Existing completeness check can accept old fingerprint when a path exists; automatic bundle reuse can be labeled explicit | Current asset validator/resolver source inspection |

Planning observations are not test results. No application behavior or provider acceptance is marked verified here.

## Planning package QA

Performed on 2026-09-10 after document creation:

- `pnpm exec prettier --check "docs/copyright-barrier-removal/**/*.md" "docs/copyright-barrier-removal/**/*.json"`: exit 0; all package files formatted.
- Local Markdown link validation: 17 Markdown documents checked, zero broken local links; package contains 18 files including the JSON snapshot.
- SHA-256 comparison against the planning snapshot: 78 relevant existing files checked, zero changed hashes.
- Git status comparison: only the new `docs/copyright-barrier-removal/` directory was added; zero unexpected status changes.
- Placeholder scan: no unfinished instruction markers matched. Language scan: no Vietnamese-specific characters matched; written plan content is in English.
- Source and requirement review: R01-R12 each have implementing phases and matrix cases; live rollout and external provider verification are explicitly separate from isolated acceptance.

No application tests, build, server restart, migration, or provider call was performed for this documentation-only delivery.

## Executor evidence requirements

For each run, append a record with: unique ID, phase, timestamp/timezone, current commit and dirty-snapshot reference, exact working directory, exact command or browser action, fixture root, expected outcome, actual outcome, exit code, test counts, duration, and related changed files. Include a log/screenshot path when useful. Never include API keys, tokens, wallet secrets, or private full prompts.

Example record shape, with actual values required when used:

```text
ID: P1-RED-01
Phase: P1
Kind: targeted regression test
Command: pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts
Expected: named-subject acceptance fails before the copyright checks are removed
Result: record the actual assertion and command exit code from this run
Follow-up: implementation change and the corresponding green run ID
```

## Implementation runs

```text
ID: P0-CMD-01
Phase: P0
Kind: environment and version verification
Command: git rev-parse HEAD; git branch --show-current; git diff --stat; node --version; pnpm --version
Expected: clean command run recording HEAD, branch, diff stat, and tool versions
Result: HEAD=0e94a9aa58e9ffca89e5823c616311277a97c468, branch=main, node=v24.20.0, pnpm=11.5.2, exit code 0
Changed files: none

ID: P0-CODEGRAPH-01
Phase: P0
Kind: CodeGraph symbol exploration
Command: codegraph explore "copyrightValidator handleDirectQuizOutput sanitizeVisualPrompt"
Expected: locate callers, callees, and verbatim source of core copyright gate symbols
Result: located 16 symbols across 5 files, blast radius mapped, exit code 0
Changed files: none

ID: P0-ISO-01
Phase: P0
Kind: test isolation and synthetic fixture
Command: pnpm --filter @studio/server test test/episodeCopyrightRemediation.test.ts
Expected: test runs against synthetic temp root without touching external channel directory, passes
Result: 1 test file passed (5 tests), duration 2.02s, exit code 0
Changed files: apps/server/test/episodeCopyrightRemediation.test.ts, apps/server/test/helpers/authorizedContentFixtures.ts, apps/server/test/fixtures/remediation/*

ID: P0-BUILD-SHARED-01
Phase: P0
Kind: shared build verification
Command: pnpm build:shared
Expected: shared package compiles without error
Result: exit code 0

ID: P0-TYPECHECK-01
Phase: P0
Kind: repository-wide typecheck baseline
Command: pnpm typecheck
Expected: packages/shared, apps/server, apps/web typecheck cleanly
Result: exit code 0

ID: P0-TEST-SHARED-01
Phase: P0
Kind: shared package test baseline
Command: pnpm --filter @studio/shared test
Expected: all tests pass
Result: 15 suites, 80 passed, 0 failed, exit code 0

ID: P0-TEST-SERVER-01
Phase: P0
Kind: server package test baseline
Command: pnpm --filter @studio/server test
Expected: all tests pass in safe isolated environment
Result: 247 passed (1864 passed, 1 todo, 0 failed), duration 41.03s, exit code 0

ID: P0-TEST-WEB-01
Phase: P0
Kind: web package test baseline
Command: pnpm --filter @studio/web test
Expected: all tests pass in safe isolated environment
Result: 91 passed (449 passed, 0 failed), duration 63.06s, exit code 0

ID: P1-RED-01
Phase: P1
Kind: targeted regression test (red)
Command: pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts
Expected: named-subject acceptance fails from current copyright checks
Result: 7 failed, 1 passed; assertions failed on Simba, Spider-Man, Batman, Pikachu, Mario, lion cub, and research dossier quality gate; exit code 1

ID: P1-GREEN-01
Phase: P1
Kind: targeted regression test (green)
Command: pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts
Expected: all 8 tests pass after removal of copyright gates
Result: 8 passed (8 tests), duration 834ms, exit code 0

ID: P1-TEST-DIRECT-01
Phase: P1
Kind: direct quiz prompt and handler test
Command: pnpm --filter @studio/server test test/directQuizCopyrightGate.test.ts
Expected: policy absence in prompt contract, named subjects preserved in writeQuiz, QUIZ_READY stage advanced, malformed/failed write rejected
Result: 7 passed (7 tests), duration 823ms, exit code 0

ID: P1-TEST-QA-01
Phase: P1
Kind: question bank Auto-QA test
Command: pnpm --filter @studio/server test test/questionBankAutoQa.test.ts
Expected: valid named subjects pass Auto-QA, batch totals updated (2 passed, 1 duplicate), schema errors rejected
Result: 13 passed (13 tests), duration 3.15s, exit code 0

ID: P1-TEST-SUITE-01
Phase: P1
Kind: P1 regression test suite
Command: pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts test/directQuizCopyrightGate.test.ts test/questionBankAutoQa.test.ts test/episodeCopyrightRemediation.test.ts test/scriptQuality.test.ts
Expected: all 5 test files pass
Result: 5 test files passed (38 tests passed, 0 failed), duration 3.04s, exit code 0

ID: P1-TYPECHECK-01
Phase: P1
Kind: server typecheck
Command: pnpm --filter @studio/server typecheck
Expected: clean typecheck
Result: exit code 0

ID: P2-RED-01
Phase: P2
Kind: targeted regression test (red)
Command: pnpm --filter @studio/server test test/authorizedContentVisuals.test.ts
Expected: character/subject names fail prompt check due to visual prompt proxy sanitization
Result: 6 failed (Simba, Pikachu, Pac-Man, Mario, Spider-Man, lion cub replaced with generic proxies), exit code 1

ID: P2-GREEN-01
Phase: P2
Kind: targeted regression test (green)
Command: pnpm --filter @studio/server test test/authorizedContentVisuals.test.ts
Expected: all 12 tests pass covering V01-V08 (prompts, thumbnails, mark extraction, fingerprint, cache freshness, bundle provenance, style/provider mismatch, safety validation)
Result: 12 passed (12 tests), duration 2.78s, exit code 0

ID: P2-TEST-SUITE-01
Phase: P2
Kind: P2 full test suite
Command: pnpm --filter @studio/server test test/authorizedContentVisuals.test.ts test/quizAssetsQa.test.ts test/thumbnailPromptEngine.test.ts test/thumbnailService.test.ts test/curatedAssetPriority.test.ts test/visualPromptSanitizer.test.ts
Expected: all 6 test files pass cleanly
Result: 6 test files passed (83 tests passed, 0 failed), duration 4.33s, exit code 0

ID: P2-BUILD-01
Phase: P2
Kind: repository-wide typecheck and shared build
Command: pnpm build:shared; pnpm typecheck
Expected: clean build and typecheck across shared, server, web
Result: packages/shared, apps/server, apps/web all passed cleanly, exit code 0

ID: P3-RED-01
Phase: P3
Kind: targeted regression test (red)
Command: pnpm --filter @studio/server test test/authorizedContentProviderErrors.test.ts
Expected: provider rejection triggers LLM rewrite, retries, or persistence of changed prompt; late success attaches bundle after cancellation
Result: 5 failed (Workflow 1 called provider 2+ times with auto-rephrase attempt, Workflow 2 called provider 3 times with auto-rephrase, Case 2 called 3 times, Case 5 attached bundle reference after cancellation), exit code 1

ID: P3-GREEN-01
Phase: P3
Kind: targeted regression test (green)
Command: pnpm --filter @studio/server test test/authorizedContentProviderErrors.test.ts
Expected: all 9 tests pass covering Observable Rejection Contract and all 7 required boundary cases (First-call success, Terminal filter rejection, Timeout/transient failure then success, Cancellation during request/backoff, Late success after cancellation, Partial parallel assets, Unknown provider category)
Result: 9 passed (9 tests), duration 2.86s, exit code 0

ID: P3-TEST-SUITE-01
Phase: P3
Kind: P3 full regression test suite
Command: pnpm --filter @studio/server test test/authorizedContentProviderErrors.test.ts test/promptSanitizer.test.ts test/gpti2Image.test.ts test/shopAiKeyImage.test.ts test/shortReelWorkflowV2.test.ts
Expected: all 5 test files pass cleanly
Result: 5 test files passed (31 tests passed, 0 failed), duration 5.24s, exit code 0

ID: P3-TYPECHECK-01
Phase: P3
Kind: repository-wide typecheck
Command: pnpm typecheck
Expected: clean build and typecheck across packages/shared, apps/server, apps/web
Result: packages/shared, apps/server, apps/web all passed cleanly with 0 errors, exit code 0

ID: P4-RED-01
Phase: P4
Kind: targeted regression test (red)
Command: pnpm --filter @studio/server test test/knowledgePolicyMigration.test.ts
Expected: transform module does not exist, causing module resolution failure
Result: Failed with Error: Failed to load url ../../../scripts/migrations/knowledge-policy-removal/transform.js, exit code 1

ID: P4-GREEN-01
Phase: P4
Kind: targeted regression test (green)
Command: pnpm --filter @studio/server test test/knowledgePolicyMigration.test.ts
Expected: all 9 tests pass covering field removal, preservation, idempotence, no mutation, plan generation, duplicate ID rejection, malformed JSON rejection, locking, source change detection, and rollback conflict detection
Result: 9 passed (9 tests), duration 419ms, exit code 0

ID: P4-REHEARSAL-01
Phase: P4
Kind: CLI dry-run, apply, second plan, and rollback rehearsal
Command:
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --root $entityRoot --plan $planPath
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --apply --plan $planPath --backup-root $backupRoot
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --root $entityRoot --plan second-plan.json
  pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --rollback $journalPath
Expected: Plan 1 detects 1 changed entity, 4 removed fields; apply succeeds; Plan 2 detects 0 changed entities; rollback restores original bytes with byte-for-byte SHA256 equality
Result: Plan 1 (1 file, 1 changed, 4 removed), apply (state applied, 1 updated), Plan 2 (0 changed entities), rollback restored original SHA256 45AFE0E1454EA5AB2F88D8675C0049F9732843208464957C4AA5E0B500C26A6E matching original (match = True), exit code 0

ID: P4-AUDIT-SCAN-01
Phase: P4
Kind: retired symbols scan
Command: rg -n "validateTextCopyright|validateQuizV2Copyright|STRICT_COPYRIGHT_PATTERNS|KNOWN_TRADEMARK_IP_DEFS|classifyEntityCopyright|sanitizeKnowledgeBaseEntitiesDir" apps/server/src packages/shared/src shared scripts
Expected: zero active references to retired symbols across server, shared, and scripts
Result: 0 matches found, exit code 1

ID: P4-TEST-SUITE-01
Phase: P4
Kind: P4 regression test suite
Command: pnpm --filter @studio/server test test/knowledgePolicyMigration.test.ts test/authorizedContentGeneration.test.ts test/authorizedContentVisuals.test.ts test/curatedEntityAssetRegistry.test.ts
Expected: all 4 test files pass cleanly
Result: 4 test files passed (33 tests passed, 0 failed), duration 1.72s, exit code 0

ID: P4-BUILD-01
Phase: P4
Kind: repository-wide typecheck
Command: pnpm typecheck
Expected: clean build and typecheck across packages/shared, apps/server, apps/web
Result: packages/shared, apps/server, apps/web all passed cleanly with 0 errors, exit code 0

ID: P5-RED-01
Phase: P5
Kind: test failure (red)
Command: pnpm --filter @studio/server test test/questionBankAutoQa.test.ts
Expected: fails assertion because copyrightRejections is still present in runBatchAutoQa summary and route response
Result: 2 failed tests (expected { copyrightRejections: +0, …(3) } to deeply equal { duplicateRejections: +0, …(2) }), exit code 1

ID: P5-GREEN-01
Phase: P5
Kind: test pass (green)
Command: pnpm --filter @studio/server test test/questionBankAutoQa.test.ts test/questionBankRoute.test.ts test/terminalLogger.test.ts
Expected: all 3 server test files pass (41 tests)
Result: 3 test files passed (41 tests passed, 0 failed), duration 5.35s, exit code 0

ID: P5-WEB-01
Phase: P5
Kind: web test pass (green)
Command: pnpm --filter @studio/web test src/features/questionBank/questionBankUi.test.tsx
Expected: 15 web UI tests pass covering active categories, historical payload tolerance, pending state, and retry
Result: 1 test file passed (15 tests passed, 0 failed), duration 3.91s, exit code 0

ID: P5-CLI-01
Phase: P5
Kind: terminal logger and CLI execution (valid + failure)
Command:
  node scripts/generate-question-bank-batch.mjs -a speed_blitz -d nature_animals -s mammals --no-persist --candidates-file apps/server/test/fixtures/cli-batch/candidates-valid.json
  node scripts/generate-question-bank-batch.mjs -a speed_blitz -d nature_animals -s mammals --no-persist --candidates-file apps/server/test/fixtures/cli-batch/candidates-invalid.json
Expected: Valid candidate passes with ISO timestamped logs and summary; invalid candidate fails with clean formatted error and summary
Result: Valid run logged startup summary, Auto-QA, ingest, sample, final summary (Total=1 Success=1 Failed=0, exit code 0); invalid run logged startup summary, Auto-QA, error BANK_ENGLISH_ONLY, final summary (Total=5 Success=0 Failed=5, exit code 1)

ID: P5-TYPECHECK-01
Phase: P5
Kind: repository-wide typecheck
Command: pnpm typecheck
Expected: clean typecheck across packages/shared, apps/server, apps/web
Result: packages/shared, apps/server, apps/web all passed cleanly with 0 errors, exit code 0

ID: P6-INT-01
Phase: P6
Kind: hermetic end-to-end integration test
Command: pnpm --filter @studio/server test test/authorizedContentPipeline.test.ts
Expected: 4 integration tests pass covering bank batch generation, direct QuizV2 persistence & reload, visual identity compilation & cache key, and Observable Rejection Contract
Result: 1 test file passed (4 tests passed, 0 failed), duration 4.06s, exit code 0

ID: P6-SCAN-01
Phase: P6
Kind: residual search pass 1 (source trees)
Command: rg -n -i "copyright|trademark|safe.?visual.?proxy|forbidden.?visual.?keywords|brand_scrubbers|lion.?cub|public.domain.only" apps/server/src apps/web/src packages/shared/src shared templates services scripts
Expected: only migration keys, historical tolerance types, and test code match
Result: 8 matches found across 4 files (scripts/migrations/.../types.ts, transform.ts, questionBankUi.types.ts, questionBankUi.test.tsx), zero active application enforcement, exit code 0

ID: P6-SCAN-02
Phase: P6
Kind: residual search pass 2 (entities and configs)
Command: rg -n -i "copyright|trademark|safe.?visual.?proxy|forbidden.?visual.?keywords" .quiz-studio/knowledge_base/entities channels .agents .github
Expected: unmigrated storage entities (awaiting live approval) and legitimate subject text
Result: Matches in .quiz-studio/knowledge_base/entities/ (legitimate subject facts and unmigrated legacy fields awaiting owner live apply approval), exit code 0

ID: P6-SCAN-03
Phase: P6
Kind: residual search pass 3 (retired validation symbols)
Command: rg -n "validateTextCopyright|validateQuizV2Copyright|STRICT_COPYRIGHT_PATTERNS|KNOWN_TRADEMARK_IP_DEFS|sanitizeVisualPrompt|sanitizeVisualSubject|semantic_copyright_violation" apps/server/src apps/web/src packages/shared/src shared
Expected: 0 matches found across the entire codebase
Result: 0 matches found, exit code 1

ID: P6-REHEARSAL-01
Phase: P6
Kind: migration CLI lifecycle rehearsal
Command: node -e "...execSync tsx cli.ts plan, apply, plan2, rollback..."
Expected: plan 1 detects 1 file / 4 keys, apply updates file, plan 2 detects 0 changed entities, rollback restores exact original SHA256
Result: Original SHA256 45AFE0E1454EA5AB2F88D8675C0049F9732843208464957C4AA5E0B500C26A6E = Restored SHA256 45AFE0E1454EA5AB2F88D8675C0049F9732843208464957C4AA5E0B500C26A6E (Exact Match: true), exit code 0

ID: P6-FORMAT-01
Phase: P6
Kind: format verification
Command: pnpm format:check
Expected: all touched files formatted according to prettier
Result: total=18 success=1 failed=0 skipped=18 retries=0 elapsed=12571ms, exit code 0

ID: P6-AUDIT-01
Phase: P6
Kind: repository audit
Command: pnpm run audit
Expected: choice count and quiz-only audits pass cleanly
Result: total=1671 success=1638 failed=0 skipped=33, exit code 0

ID: P6-BUILD-01
Phase: P6
Kind: workspace build and typecheck
Command: pnpm -r typecheck && pnpm --filter @studio/shared build
Expected: 0 type errors across all packages
Result: packages/shared, apps/server, apps/web all passed cleanly with 0 errors, exit code 0
```

## Deviations and decisions

No executor deviations recorded. If current source differs, append the exact old/new assumption, affected requirement, revised files, reason, and whether owner approval is needed before editing. Never silently weaken acceptance.

## Residual match register

1. `scripts/migrations/knowledge-policy-removal/types.ts`: `PolicyKey` ("copyright_risk", "is_trademark_ip", "forbidden_visual_keywords", "safe_visual_proxy"). Classification: migration-only legacy key. Used exclusively by the migration CLI to identify legacy fields for safe removal. Verification: P4-GREEN-01, P6-REHEARSAL-01.
2. `scripts/migrations/knowledge-policy-removal/transform.ts`: `POLICY_KEYS_TO_REMOVE`. Classification: migration-only legacy key. Target field array pruned by pure migration transformer. Verification: P4-GREEN-01, P6-REHEARSAL-01.
3. `apps/web/src/features/questionBank/types/questionBankUi.types.ts`: `copyrightRejections?: number`. Classification: historical record. Boundary tolerance for pre-existing batch responses in persisted history without crashing UI or activating policy. Verification: P5-WEB-01.
4. `apps/web/src/features/questionBank/questionBankUi.test.tsx`: test case asserting historical payload tolerance. Classification: test/documentation. Verification: P5-WEB-01.
5. `.quiz-studio/knowledge_base/entities/pop_culture_classics.json`: legitimate subject content (e.g. Peter Pan copyright history, Donkey Kong trademark tie) and unmigrated storage fields awaiting owner live apply authorization. Classification: legitimate subject text / unmigrated storage. Runtime loader does not read policy keys. Verification: P4-AUDIT-SCAN-01, P6-SCAN-02.

## Rollout evidence

Live apply, live restart, paid provider calls, and bulk regeneration: NOT_RUN / NOT_APPROVED per explicit user constraint ("Do not mutate live storage, restart unrelated processes, make paid provider calls, commit, or push without my explicit approval"). All verification executed hermetically using temporary roots and synthetic fixtures.
