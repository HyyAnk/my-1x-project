# Wave 2 Batch 10b: Smoke Spec Split Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave2-10b-smoke-spec (replacement for a prior failed agent that produced no output)
- Working mode: main-direct
- Baseline before edits: `git status --porcelain` saved to `$TEMP/baseline-wave2-10b.txt` (225 dirty files from concurrent agents; base revision `feaf77a5aa591116fa0f23320943fb1c5da3447c`)
- Claim: `claim-refactorwave210bsmokespec-mtsyixgp` (write zones: `web-api-state`, `coordination-handoffs`)

## Source Files Read

- AGENTS.md
- apps/web/test/smoke.spec.ts (original, 1121 lines, 10 tests — read in full)
- apps/web/test/helpers/shortReelFixture.ts (helper conventions reference)
- apps/web/playwright.config.ts
- apps/server/src/index.ts, apps/server/src/app.ts (lines 55-125, 185-215), apps/server/src/env.ts, apps/server/src/runtimePaths.ts
- apps/server/src/repository/service.ts (storage root resolution), apps/server/src/config/configWriter.ts (`loadStorageRoot`), apps/server/src/config/configReader.ts (`loadConfig`)
- .github/workflows/ci.yml (e2e job), .gitignore
- docs/agent-coordination/templates/phase-handoff-summary.md

## Files Changed

- Deleted: `apps/web/test/smoke.spec.ts` (1121 lines)
- Created: `apps/web/test/helpers/smokeFixtures.ts` (82 lines) — shared `smokeTest` fixture (baseline `**/api/tasks` + `**/api/storage` route mocks, localStorage init, MockWebSocket init script) and the shared `assessment` constant, exported for reuse
- Created: `apps/web/test/smokeWorkspace.spec.ts` (68 lines, 3 tests) — workspace empty state, channel creation modal, channel library
- Created: `apps/web/test/smokeChannelLifecycle.spec.ts` (146 lines, 2 tests) — channel deletion confirmation, episode deletion confirmation
- Created: `apps/web/test/smokeTaskRecovery.spec.ts` (338 lines, 2 tests) — failed task retry, scene audio inline update + duration match
- Created: `apps/web/test/smokeTopicGeneration.spec.ts` (518 lines, 3 tests) — topic generation progress, topic confirmation question count, episode script→scene→render realtime pipeline
- Created: `docs/agent-coordination/handoffs/refactor-wave2-10-smoke-spec.md` (this file)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (225 pre-existing dirty files, none touched)
- Pre-existing dirty files touched: none (verified via sorted diff of baseline vs final `git status --porcelain`: zero baseline lines lost)
- Heartbeats sent on ~10-minute cadence; claim never expired

## Scope

- Claimed phase: split the Playwright smoke god spec into focused specs + shared fixtures
- Allowed scope used: `apps/web/test/smoke*.spec.ts`, `apps/web/test/helpers/smokeFixtures.ts`, this handoff — all within planned files; no `agent-expand` needed
- Scope deviations: none

## Order-Dependency Analysis (final)

All 10 tests are **order-independent**; the split into 4 files is behavior-safe:

- Every test from line 96 onward installs its own `page.route(...)` mocks for channels, tasks, topics, episodes, files, and config before navigating. All mutations (channel/episode DELETE with `?confirm=true`, task POST retry, topic confirm POST, scene audio POST) are intercepted by Playwright route handlers and never reach the real backend.
- Tests at original lines 65 ("workspace opens...") and 82 ("channel creation requires...") hit the real backend, but are read-only: they never submit the create form, and no test asserts on channels created by an earlier test (each test defines its own channel fixtures inline).
- The proposed grouping was verified against actual couplings: tests 342/410/604 form a natural topic-generation workflow group but do not share state; test 857 (scene audio) does NOT depend on test 604's channel (`ch_episode` vs `ch_audio` are distinct mocked channels), so it stays in `smokeTaskRecovery.spec.ts` as planned — no regrouping needed.
- Note: within-file serial order is preserved per Playwright defaults, but since no test depends on another, running files in parallel workers (config default) is safe.

## E2E Run Decision

The live e2e suite was **not run locally**. Justification:

1. **No local e2e data isolation exists.** `playwright.config.ts` webServer commands set no environment variables. The server resolves its storage root to the repository working directory when `.quiz-studio/storage.json` is absent (`loadStorageRoot` returns null locally; `channels/` in the repo root currently holds only `.gitkeep`). CI only avoids this because it runs on ephemeral runners — there is no env-var or script mechanism in the repo that points e2e at a scratch storage dir. Running the suite would risk writing real channel/episode data into the shared workspace storage (zone `generated-artifacts` runtime policy: no concurrent writers).
2. **Concurrent agents.** 8+ sibling claims are actively editing the entire server tree (225 dirty files); the Playwright webServer boots `pnpm --filter @studio/server start` from that in-flight tree, so any failure would be unattributable and a pass would not validate committed code.
3. The read-only tests (65, 82) that hit the real backend are covered by `--list` compile validation; their bodies are byte-identical to the originals, and CI runs the full suite on every push.

## Decisions

- Decision: Implement the shared setup as a `smokeTest = test.extend({...})` fixture exported from `helpers/smokeFixtures.ts`, rather than copying a `test.beforeEach` into every spec file.
- Reason: Mirrors the original `beforeEach` semantics exactly (runs per test, before each test's own routes; Playwright route order = last-installed wins, and every test that overrides `**/api/tasks` or `**/api/storage` installs its own handler after the fixture, preserving the original behavior). This follows the existing helper convention (`shortReelFixture.ts`) and keeps specs declarative.
- Impact on later phases: Spec files import `{ smokeTest }` instead of Playwright's `test`; adding new shared setup goes into `smokeFixtures.ts` once. The `expect` re-export keeps imports uniform.
- Decision: Keep the `assessment` module-level constant in the helper (verbatim) since it is shared by two specs (tests at original lines 604 and 857).
- Reason: DRY without altering payloads; byte-identical to the original literal.

## Verification

- Command: `cd apps/web && npx playwright test --list`
- Result: PASS — 13 tests in 7 files: exactly the 10 smoke tests across the 4 new files with identical titles, plus the 3 unchanged non-smoke specs (quizPhase08c, quizV2, shortReel)
- Command: `pnpm --filter @studio/web typecheck`
- Result: PASS (exit 0, no errors)
- Command: `npx prettier --check <the 5 new files>`
- Result: PASS ("All matched files use Prettier code style!")
- Command: `node scripts/check-format.mjs`
- Result: FAILED on 16 files — all owned by OTHER active claims (apps/server/src/tasks/**, quiz/render/**, candyArcade tests, quizAnalyticsReconciler, apps/web/src/** intro-outro files). None of my files appear; out of my scope, not touched.
- Content preservation: extracted every `test(...)`/`smokeTest(...)` block from the original and all 4 new files via a Node script — all 10 titles unique and bodies byte-identical (10/10 IDENTICAL). Fixture body identical to the original `beforeEach` after indentation normalization (the fixture wraps setup in `test.extend`, adding one indent level); `assessment` constant byte-identical.
- Command: `git status --porcelain` vs saved baseline
- Result: only my 6 claimed paths changed (smoke.spec.ts deleted, 5 files added); every other diff line belongs to concurrently active sibling claims; zero pre-existing dirty files modified or lost.
- E2E run: NOT RUN — see "E2E Run Decision" above.

## Open Risks

- Risk: The live e2e suite was not executed locally, so runtime behavior is validated by compile + `--list` + byte-identical content rather than a green run. CI is the safety net.
- Suggested next action: After concurrent claims are released and the tree is clean, run `pnpm test:e2e` (or each smoke spec individually) on an isolated machine/CI to confirm green.
- Risk: `smokeTopicGeneration.spec.ts` (518 lines) and `smokeTaskRecovery.spec.ts` (338 lines) still exceed the 150-200 line guideline — inherent to preserving test bodies verbatim; per-test mocks are large.
- Suggested next action: If further reduction is desired later, extract per-test mock payload builders into `helpers/` in a separate task (would alter test bodies, so out of scope for this verbatim split).

## Next Phase Input

- Files the next agent must read: `apps/web/test/helpers/smokeFixtures.ts`, the 4 new smoke spec files
- Commands the next agent should run first: `cd apps/web && npx playwright test --list` (expect 13 tests / 7 files), `pnpm --filter @studio/web typecheck`
- Important constraints: use `smokeTest` from `helpers/smokeFixtures.ts` for any new smoke-style test needing the baseline task/storage mocks; avoid glob patterns like `**/api/...` inside JSDoc comments in this directory (Playwright's transform mis-parses them as invalid regex literals and the file fails to load).
