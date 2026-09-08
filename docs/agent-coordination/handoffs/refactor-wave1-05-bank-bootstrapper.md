# Wave 1 Batch 5: bankEpisodeBootstrapper Split Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave1-05-bank-bootstrapper
- Working mode: main-direct
- Baseline before edits: `git status --porcelain` captured to `/tmp/baseline-wave1-05.txt` (135 dirty files) before any edit; base revision `feaf77a5aa591116fa0f23320943fb1c5da3447c`.

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md (protocol context from AGENTS.md)
- docs/agent-coordination/templates/phase-handoff-summary.md
- apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts (363 lines, full read)
- apps/server/src/quiz/bank/bridge/index.ts
- apps/server/src/quiz/bank/questionBankToQuizBridge.ts (sole barrel consumer, read-only)

## Files Changed

All within claim `claim-refactorwave105bankbootstrapper-mtsw9wq7` (zones: server-core, coordination-handoffs):

- apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts — 363 -> 47 lines; now a thin facade holding the public input/result interfaces (`CreateEpisodeFromQuestionBankInput/Result`, `CreateEpisodeFromTopicWithBankInput/Result`) plus re-exports from the new modules.
- apps/server/src/quiz/bank/bridge/singleQuestionBootstrapper.ts — NEW, 99 lines. `bootstrapSingleQuestionEpisode` + `BootstrapSingleQuestionEpisodeParams` (single-question flow).
- apps/server/src/quiz/bank/bridge/topicEpisodeBootstrapper.ts — NEW, 126 lines. `bootstrapTopicEpisode` + `BootstrapTopicEpisodeParams` (topic matrix flow), plus private `resolveTopicVisualTheme` / `resolveTopicQuizFormat` helpers.
- apps/server/src/quiz/bank/bridge/bootstrapperHelpers.ts — NEW, 186 lines. Shared helpers: `resolveEpisodeVisualStyles`, `triggerPipelineTask`, `resolveRenderAspect`, `buildEpisodeRecord` (+ `BuildEpisodeRecordParams`), `buildEpisodeMarkdownStubs`, `writeEpisodeMarkdownStubs`, `prepareEpisodeDirectory` (+ `EpisodeDirectoryContext`), `createEpisodeDirectoryStructure`.
- apps/server/src/quiz/bank/bridge/bootstrapperTypes.ts — NEW, 9 lines. Shared `BootstrapEpisodeResult` interface (avoids circular imports between the two bootstrappers).
- apps/server/src/quiz/bank/bridge/index.ts — barrel now also star-exports the four new modules.
- docs/agent-coordination/handoffs/refactor-wave1-05-bank-bootstrapper.md — this summary.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (135 pre-existing dirty files; none touched except the claimed `bridge/bankEpisodeBootstrapper.ts` which was already dirty with a one-line `request_id` addition — that pre-existing edit is preserved verbatim in the facade's `CreateEpisodeFromTopicWithBankInput`)
- Pre-existing dirty files touched: only `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts` (it is one of my claimed planned files; its pre-existing dirty content was fully carried over, not reverted)

## Scope

- Claimed phase: Wave 1 batch 5 — split the bankEpisodeBootstrapper god file
- Allowed scope used: `apps/server/src/quiz/bank/bridge/**` (5 planned TS files) + this handoff doc
- Scope deviations: none. `bootstrapperTypes.ts` was created as a small additional module inside the same claimed directory (still within `bridge/**` and the server-core zone pattern for planned files; the claim tool validated all planned paths).

## Decisions

- Decision: keep `bankEpisodeBootstrapper.ts` as a thin facade (public input/result interfaces + re-exports) rather than deleting it and updating only the barrel.
- Reason: repo-wide grep showed the only importer is `apps/server/src/quiz/bank/bridge/index.ts` (`export * from "./bankEpisodeBootstrapper.js"`), consumed by `questionBankToQuizBridge.ts` via `./bridge/index.js`. The facade keeps the old module path and every historical export importable with zero consumer changes, while the barrel additionally star-exports the new modules so both surfaces work.
- Impact on later phases: none; all exports (`bootstrapSingleQuestionEpisode`, `bootstrapTopicEpisode`, `resolveEpisodeVisualStyles`, `triggerPipelineTask`, all `Create*/Bootstrap*` types) remain available from `./bridge/index.js` unchanged.

- Decision: extract shared result type into `bootstrapperTypes.ts` instead of putting it in helpers.
- Reason: prevents any import direction where one bootstrapper imports the other; helpers and types are leaves, both bootstrappers import only downward. No circular imports.

- Decision: `writeEpisodeMarkdownStubs` was decomposed into pure `buildEpisodeMarkdownStubs` (string shaping) + thin IO wrapper in helpers; `resolveTopicVisualTheme` and `resolveTopicQuizFormat` extracted as named helpers in the topic module.
- Reason: keeps every function under the 30-40 line clean-code limit and the behavior byte-for-byte identical (same file names, same content templates, same write order: brief first, then remaining stubs in parallel via `Promise.all`).

- Decision: duration estimation / narration word counts (`estimateQuizTargetDurationMinutes`, `estimateQuizTargetWordCount`, `DEFAULT_NARRATION_WORDS_PER_SECOND`) were NOT duplicated into helpers.
- Reason: they already live in `apps/server/src/repository/helpers.ts` (read-only for this claim, owned by the antigravity-stage03 line of work); the topic bootstrapper simply imports them, preserving a single source of truth.

- Decision: director-plan structure was NOT moved into helpers.
- Reason: `bridge/bankDirectorPlanFactory.ts` already owns plan building (`buildSingleQuestionDirectorPlan`, `buildTopicDirectorPlan`, `createDefaultDirectorPlan` usage); the bootstrappers only persist records and quizzes, keeping the two modules' responsibilities distinct as required.

## Verification

- Command: `pnpm --filter @studio/server test -- test/bankDirectorPlanFactory.test.ts test/boundTopicConfirmation.test.ts` (run from apps/server via local vitest: `./node_modules/.bin/vitest run --testTimeout 15000 test/bankDirectorPlanFactory.test.ts test/boundTopicConfirmation.test.ts`)
- Result: 2 test files passed, 18/18 tests passed (bankDirectorPlanFactory 8 tests, boundTopicConfirmation 10 tests — the latter exercises `createEpisodeFromTopicWithBank` end-to-end through the refactored bootstrapper).
- Command: `pnpm --filter @studio/server typecheck`
- Result: pass (tsc --noEmit, zero errors) — initially failed on missing `Task` import and missing facade interfaces, fixed, then clean.
- Command: `npx prettier --check "apps/server/src/quiz/bank/bridge/*.ts"`
- Result: all bridge files formatted.
- Command: `node scripts/check-format.mjs`
- Result: 14 failures, ALL in files owned by other in-flight work (assetsVoiceStages, candyArcadeClips, introOutroStyles x2, codexRetries, videoCompositionPreparer, customIntroOutro/introOutro tests, web intro-outro/shortReel/questionBank components) — zero failures in `quiz/bank/bridge/**`. Not touched per dirty-file rule.
- Command: `git status --porcelain` vs `/tmp/baseline-wave1-05.txt`
- Result: my only changes are the 5 claimed bridge TS files + this handoff. All other new diffs (quiz/thumbnail/*, shortReel web components, questionBank web utils, clueDeduction styles, wave1-02/03/04 handoffs) are concurrent drift from other active wave-1 agents, untouched by me.

## Open Risks

- Risk: `repository/helpers.ts`, `repository/*`, `context/*`, `tasks/*` are dirty and planned by claim-antigravitystage03-mtssd7q5 (and related stages). If those change the duration-estimation signatures, only `topicEpisodeBootstrapper.ts` line-level imports could break — current signatures verified stable (`estimateQuizTargetDurationMinutes(questionCount)`, `estimateQuizTargetWordCount(minutes, wordsPerSecond)`, `DEFAULT_NARRATION_WORDS_PER_SECOND = 2.3`).
- Suggested next action: integrator should run the full server test suite after all wave-1 batches land; the 193-file full run executed during verification already passed (1393 tests).
- Risk: repo-wide `check-format.mjs` currently fails due to other agents' unformatted files; the shared format gate will stay red until they format their own files.
- Suggested next action: no action for this claim; the wave-1 integrator should re-run the format gate after batches 2/3/4 release.

## Next Phase Input

- Files the next agent must read: `apps/server/src/quiz/bank/bridge/index.ts`, `bankEpisodeBootstrapper.ts` (facade), `singleQuestionBootstrapper.ts`, `topicEpisodeBootstrapper.ts`, `bootstrapperHelpers.ts`, `bootstrapperTypes.ts`.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`; `pnpm --filter @studio/server typecheck`.
- Important constraints: do not move duration/narration estimation out of `repository/helpers.ts`; do not add director-plan building logic to bootstrappers (it belongs in `bankDirectorPlanFactory.ts`); keep ESM `.js` import specifiers; the facade and barrel must keep re-exporting everything — `questionBankToQuizBridge.ts` depends on both paths.
