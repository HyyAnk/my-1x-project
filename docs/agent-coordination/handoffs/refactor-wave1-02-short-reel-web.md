# Wave 1 Batch 2: ShortReel Studio Modularization Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave1-02-short-reel-web
- Working mode: main-direct
- Baseline before edits: `git status --porcelain` captured to `/tmp/baseline-wave1-02.txt` (135 dirty entries at claim time); note: an earlier claim for this task expired mid-run due to the 15-minute heartbeat timeout and was re-created (`claim-refactorwave102shortreelweb-mtsy6vf5`), which rebaselined the workspace (232 dirty entries including concurrent wave agents' output). All pre-existing dirty files outside this task's planned scope were left untouched.

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination zone map (`.agent-orchestrator/zones.yml`)
- apps/web/src/features/shortReel/ShortReelStudio.tsx (original, 376 lines)
- apps/web/src/features/shortReel/hooks/useShortReel.ts (original, 371 lines)
- apps/web/src/features/shortReel/hooks/useShortReelDraft.ts (pre-existing, reused as-is)
- apps/web/src/features/shortReel/ShortReelStudio.test.tsx (original, 871 lines)
- apps/web/src/features/shortReel/components/{PublishingPanel,SegmentEditor,ReelAssets,ShortReelSourceCard}.tsx
- apps/web/test/helpers/shortReelFixture.ts
- apps/web/src/api/{shortReelApi,client}.ts, apps/web/src/api.ts
- apps/web/src/components/ChannelView.tsx (consumer of ShortReelStudio)
- packages/shared/src/shortReel/shortReel.types.ts (ShortReelTopicSnapshot, ReelDeliverableUnits, ReelUnitStatus)

## Files Changed

Modified (pre-existing):

- apps/web/src/features/shortReel/ShortReelStudio.tsx — 376 → 198 lines (composition component)
- apps/web/src/features/shortReel/hooks/useShortReel.ts — 371 → 354 lines (composition hook; SSE and export delegated)

Created:

- apps/web/src/features/shortReel/hooks/useShortReelTaskSync.ts — 33 lines (SSE task progress listening, reel_id isolation, terminal-status reload)
- apps/web/src/features/shortReel/hooks/useShortReelExport.ts — 50 lines (PKZIP Blob download via temporary DOM anchor)
- apps/web/src/features/shortReel/utils/shortReelStudioRules.ts — 20 lines (pure rules: canExportReel, hasPendingGeneration, getCleanTopicTitle)
- apps/web/src/features/shortReel/components/ShortReelHeader.tsx — 104 lines (header bar + HeaderActions buttons)
- apps/web/src/features/shortReel/components/ShortReelConflictBanner.tsx — 54 lines (conflict banner + task progress banner)
- apps/web/src/features/shortReel/components/ShortReelTopicCard.tsx — 33 lines (topic concept card)
- apps/web/src/features/shortReel/components/ShortReelDeliverablesGrid.tsx — 46 lines (deliverable units status grid)
- apps/web/src/features/shortReel/components/ShortReelStateError.tsx — 29 lines (not-found/error full-state container)
- apps/web/test/helpers/shortReelStudioTestUtils.tsx — 173 lines (shared mock builders extracted from the god test file)
- apps/web/src/features/shortReel/ShortReelStudio.loading.test.tsx — 143 lines, 7 tests
- apps/web/src/features/shortReel/ShortReelStudio.conflict.test.tsx — 123 lines, 2 tests
- apps/web/src/features/shortReel/ShortReelStudio.export.test.tsx — 120 lines, 3 tests
- apps/web/src/features/shortReel/ShortReelStudio.tasks.test.tsx — 376 lines, 6 tests

Deleted:

- apps/web/src/features/shortReel/ShortReelStudio.test.tsx (871 lines, 18 tests — fully replaced by the 4 split files; test count preserved 18 = 7+2+3+6)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (`/tmp/baseline-wave1-02.txt`)
- Pre-existing dirty files touched: none. All changed paths are in the planned-file list. Concurrent drift from sibling agents (thumbnail manifest, qbank form modal, bank bootstrapper, render styles) was absorbed via `agent-rebaseline` instead of being touched.

## Scope

- Claimed zones: web-api-state, web-layout-style, coordination-handoffs (claim `claim-refactorwave102shortreelweb-mtsy6vf5`)
- Allowed scope used: shortReel feature component/hook/test split + shared test helper under `apps/web/test/helpers/`
- Scope deviations: three extra files beyond the briefed list (ShortReelStateError.tsx, shortReelStudioRules.ts, shortReelStudioTestUtils.tsx) — each was added via `agent-expand` before writing, per protocol. `useShortReelDraft.ts` was NOT modified or duplicated (briefing constraint respected).

## Decisions

- Decision: keep `useShortReel.ts` as the single composition hook owning record fetch, draft state, saves, generate/cancel, and copy-fallback; delegate only SSE listening to `useShortReelTaskSync` and ZIP download to `useShortReelExport`.
- Reason: draft/save flows are tightly coupled to record state (revision + dirty tracking + conflict), so extracting them would require duplicating refs and state up and down. SSE and export are self-contained side-effect domains with clean interfaces, so they extract cleanly. Hook return-shape (public API) is 100% preserved, keeping ShortReelStudio's diff minimal.
- Impact on later phases: further extraction of draft/save logic into a `useShortReelEditor` hook is possible but needs a state-ownership redesign (lifting `reel`/`isDraftDirty` refs); flagged as optional next wave.
- Decision: extract pure presentation rules (`canExportReel`, `hasPendingGeneration`, `getCleanTopicTitle`) into `utils/shortReelStudioRules.ts` instead of leaving them inline in the component.
- Reason: AGENTS.md requires business rules outside the presentation layer; also makes the export-gating rules unit-testable in isolation later.
- Decision: split the 871-line test file by theme: loading (fetch/lifecycle/render states), conflict (draft preservation + revision conflict), export (clipboard fallback, asset URLs, PKZIP gating), tasks (generate/cancel, tabs/stale, SSE isolation, hashtags, duration clamping).
- Reason: each file targets one coherent user-facing concern; the giant task mock objects stay with the tests that use them. Test case bodies were preserved verbatim (only imports switched to the shared test-utils module). 18 cases before = 18 after.
- Decision: shared mock builders (`createMockScript`, `createMockReadyUnits`, `createNoticeSpy`, re-exported fixtures) moved to `apps/web/test/helpers/shortReelStudioTestUtils.tsx`.
- Reason: the four split test files all need the same 150 lines of mock data; DRY without deleting cases. Located under `apps/web/test/helpers/` next to the existing `shortReelFixture.ts` (web-api-state zone).

## Verification

- `pnpm --filter @studio/web test -- src/features/shortReel` → all 4 new shortReel test files pass (18 tests: loading 7, conflict 2, export 3, tasks 6)
- `pnpm --filter @studio/web test` (full suite, run twice including after prettier formatting) → 72 test files passed, 330 tests passed, 0 failed
- `pnpm --filter @studio/web typecheck` → clean
- `pnpm typecheck` (repo-wide, per claim verification requirements) → clean for packages/shared, apps/server, apps/web
- `pnpm --filter @studio/web build` → success (vite build completed, ChannelView chunk builds against the refactored ShortReelStudio)
- `npx prettier --check` on all 15 changed/created files → all pass (5 files were auto-formatted with `--write` first)
- `git status --porcelain` vs baseline → only planned files changed by this task; concurrent drift attributable to sibling wave agents was absorbed via re-baseline

## Open Risks

- Risk: `ShortReelStudio.tasks.test.tsx` is 376 lines because the Task mock objects are large; still under the 200-line target only by exception.
  Suggested next action: extract `createMockTask(statusOverrides)` into `shortReelStudioTestUtils` in a follow-up to shrink it.
- Risk: the earlier claim for this task expired once due to the 15-minute heartbeat timeout (initial briefing said 30 minutes).
  Suggested next action: all future agents should heartbeat every 10 minutes; coordinators should correct the cadence in briefings.
- Risk: `useShortReelDraft.ts` (pre-existing) overlaps conceptually with the fetch logic inside `useShortReel.ts` (two parallel fetch paths exist in the feature).
  Suggested next action: a later wave could consolidate on one fetch hook; no consumer currently imports `useShortReelDraft` besides its own API, so it is dormant but kept per the briefing.

## Next Phase Input

- Files the next agent must read: `apps/web/src/features/shortReel/ShortReelStudio.tsx`, `hooks/useShortReel.ts` (+ TaskSync/Export/Draft hooks), `components/ShortReel*.tsx`, `utils/shortReelStudioRules.ts`, `apps/web/test/helpers/shortReelStudioTestUtils.tsx`, this handoff.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`; `pnpm --filter @studio/web test -- src/features/shortReel`; `pnpm --filter @studio/web typecheck`.
- Important constraints: preserve the `useShortReel` return-shape (consumed by ShortReelStudio) and the named export `ShortReelStudio` (consumed via `import { ShortReelStudio } from "../features/shortReel/ShortReelStudio"` in ChannelView.tsx). Heartbeat claims every 10 minutes. `docs/short-reel-implementation/**` and `docs/agent-coordination/handoffs/short-reel-phase-08.md` are pre-existing dirty — do not touch.
- Remaining god hooks in other features (candidate next waves): inspect `apps/web/src/features/*` for 300+ line hooks (e.g., episode/stageStudio) — wave 1/2 siblings already covered thumbnail, qbank form modal, bank bootstrapper, render styles.
