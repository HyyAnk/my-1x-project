# Phase 0 + Phase 1: God File Split — Zone Map Patch And Web CSS Modularization Handoff Summary

## Status

- Result: completed (partial scope — see Open Risks for the deliberately deferred remainder)
- Date: 2026-09-07
- Agent: claude
- Working mode: main-direct
- Baseline before edits: 46 dirty entries at base revision `602aa18`, all owned by two concurrent
  in-flight efforts (a seven-step 16:9 layout standardization across `apps/server/src/quiz/render/**`
  plus its visual regression snapshots, and monitor drone work on `scripts/coordination/monitor/web/neural-graph.js`).
  None of them were touched, committed or reverted.

## Source Files Read

- AGENTS.md
- docs/agent-coordination/templates/phase-handoff-summary.md
- .agent-orchestrator/zones.yml
- scripts/coordination/zone-loader.mjs
- scripts/coordination/zone-validator.mjs
- scripts/agent-validate-zones.mjs

## Files Changed

Committed as six separate releases, one claim per commit:

- `.agent-orchestrator/zones.yml` (`5a2a52e`)
- `apps/web/src/styles/features/questionBank.css` + `apps/web/src/styles/features/questionBank/` — 10 modules (`308b987`)
- `apps/web/src/styles/features/mascot/stageStudio.css` + `apps/web/src/styles/features/mascot/stageStudio/` — 15 modules (`ff8812d`)
- `apps/web/src/styles/features/mascot/actions.css` + `apps/web/src/styles/features/mascot/actions/` — 14 modules (`7d294d1`)
- `apps/web/src/styles/features/mascot/wizard.css` + `apps/web/src/styles/features/mascot/wizard/` — 10 modules (`48ca151`)
- `apps/web/src/styles/features/topics.css` + `apps/web/src/styles/features/topics/` — 8 modules (`335ae5b`)

57 new stylesheet modules, 9015 lines total, largest module 295 lines.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none. Every commit staged only its own paths and was
  checked with `git diff --cached --name-only | grep -v <own-path>` returning empty before committing.

## Scope

- Claimed phase: `agent-coordination` (Phase 0 only, exclusive), then `web-layout-style` (five
  separate shared-disjoint claims), then `coordination-handoffs` for this document.
- Allowed scope used: exactly the planned files listed in each claim. No wildcards.
- Scope deviations: none. `agent-rebaseline` was required once (stageStudio claim) because a
  concurrent agent added three handoff/plan documents and modified `neural-graph.js` after the
  claim baseline was taken; the rebaseline was followed by a fresh verification before release.

## Decisions

- Decision: split each oversized stylesheet into a sibling folder and convert the original file into
  an `@import` entry point.
- Reason: this is the convention the repository already uses (`episodes.css` -> `episodes/`,
  `channels.css` -> `channels/`, `mascot.css` -> `mascot/`). It keeps `styles/index.css` and every
  parent entry untouched, so no consumer import changes and the cascade order is preserved exactly.
- Impact on later phases: none. The public CSS surface is unchanged.

- Decision: split along existing section comments and natural selector groupings rather than by
  arbitrary line count, and promote single-line section comments to three-line module banners.
- Reason: cohesion matters more than hitting an exact line target; a rule set must not be cut in half.
- Impact on later phases: module names describe UI regions, so future work can locate a stylesheet
  by feature instead of scrolling a 2000-line file.

- Decision: verify every split as lossless by stripping comments and whitespace from both the
  pre-split file (read from `git show HEAD:<path>`) and the concatenation of the new modules, then
  requiring an empty diff and identical byte counts.
- Reason: this is invariant to Prettier reformatting, so it proves no CSS declaration was lost,
  altered or reordered even though whitespace legitimately changed.
- Impact on later phases: reuse this exact check for the remaining stylesheets. Results:
  questionBank 29772 bytes both sides, stageStudio 33798, actions 28764, wizard 22507, topics 19286.

- Decision: widen the `enums/mascot` glob family in `zones.yml` before any `packages/shared` work.
- Reason: splitting `packages/shared/src/enums/mascot.ts` into siblings would have placed the new
  files in the exclusive `shared-contracts` zone, because that zone excluded only the exact
  `enums/mascot.ts` path. Both the `shared-mascot-contracts` glob and the matching `shared-contracts`
  exclusion are now `enums/mascot*.ts`. Zone map bumped 2.3.0 -> 2.4.0.
- Impact on later phases: the mascot enum family can now be split inside a single shared-disjoint zone.

- Decision: do not move mascot pose data from `packages/shared/src/enums/mascot.ts` into
  `packages/shared/src/mascot/`.
- Reason: every file in `packages/shared/src/mascot/` imports `../enums.js`, so moving data in that
  direction creates an import cycle. Split into siblings inside `enums/` instead.
- Impact on later phases: binding constraint for the deferred Phase 4 work.

- Decision: defer all `apps/server/src/quiz/render/**` layout splits and the
  `scripts/coordination/monitor/**` splits.
- Reason: every render layout file was dirty with uncommitted in-flight work, eleven visual
  regression snapshots had already been regenerated by that work, and `neural-graph.js` was held by
  an active `antigravity` claim (`claim-antigravity-mtqpga19`, write zones `agent-coordination` and
  `coordination-handoffs`). AGENTS.md forbids touching pre-existing dirty files outside assigned scope.
- Impact on later phases: see Next Phase Input.

## Verification

- Command: `pnpm --filter @studio/web build`
- Result: success, 3.13s. Emitted `dist/assets/index-1aa-JPQW.css` kept an identical content hash and
  an identical 332688 byte size across all five stylesheet splits, which is direct evidence that the
  bundled CSS output is byte-identical to before the refactor.
- Notes: questionBank styles are emitted into their own code-split chunk
  `dist/assets/QuestionBankView-Cdwi-W4F.css` (29528 bytes), not the main bundle.

- Command: `pnpm --filter @studio/web test`
- Result: 67 test files passed, 346 tests passed, 0 failed.

- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: `valid: true`, 1686 files, 23 zones, 0 definition errors, 0 unmapped, 0 overlapping.

- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
- Result: 78 passed, 0 failed (run for the Phase 0 zone map change).

- Command: `npx prettier --check` over all 62 changed and created paths
- Result: all clean.

- Command: brace balance check (count `{` versus `}` per module) plus `prettier --write` as a CSS
  syntax gate, run on every module before verification
- Result: all 57 modules balanced, no `CssSyntaxError`.
- Notes: this gate caught one real defect. The first stageStudio cut placed the boundary at source
  line 1222, which left a dangling `.inspector-icon-action,` selector at the end of
  `layoutMiniature.css`. Prettier rejected it, the boundary was corrected to 1221/1222, and the
  module was regenerated before verification. Boundary positions are now verified empirically
  (previous line blank, boundary line is a comment or a selector) before any cut is made.

- Command: `node scripts/check-format.mjs`
- Result: 107 pre-existing failures repository-wide. None of them are paths created or modified by
  this work — confirmed by grepping the failure list for `styles/features/questionBank`,
  `styles/features/mascot/stageStudio`, `.../actions`, `.../wizard` and `styles/features/topics`,
  all of which returned empty. The stale `.prettier-baseline.json` versus the concurrent uncommitted
  work is the cause and is out of scope here.

## Open Risks

- Risk: three oversized stylesheets remain unsplit — `apps/web/src/styles/features/tasks.css` (1060),
  `apps/web/src/styles/layout.css` (1060) and `apps/web/src/styles/features/episodes/shotPlan.css` (1113).
  Suggested next action: apply the identical procedure. Section boundaries were already surveyed and
  are recorded in Next Phase Input, so no re-analysis is needed.

- Risk: the deferred server-side god files are still the largest in the repository.
  `scripts/coordination/monitor/web/neural-graph.js` is 2487 lines in a single class of 34 methods,
  and its `animate()` method alone spans lines 1742 to 2486 (745 lines) with 16 clearly commented
  internal phases that are natural split boundaries. `createAgentDrone()` is 274 lines.
  Suggested next action: wait for `claim-antigravity-mtqpga19` to be released and the working tree to
  be committed, then claim `agent-coordination` exclusively.

- Risk: `apps/server/test/candyArcade.test.ts` grew from 1187 to 1318 lines while this survey was
  running, confirming another agent is editing it live.
  Suggested next action: do not split it until that work is committed. Note that both the
  `test:visual` script in the root `package.json` and the `render-implementation` zone verification
  command reference that filename explicitly, so renaming it requires updating both in the same claim.

## Next Phase Input

- Files the next agent must read:
  - this handoff
  - `.agent-orchestrator/zones.yml` (zone globs and per-zone verification commands)
  - `apps/web/src/styles/index.css` and `apps/web/src/styles/features/mascot.css` (the entry-point
    pattern that must be preserved)
  - `apps/web/src/styles/features/episodes.css` (the cleanest existing example of the target shape)

- Commands the next agent should run first:
  - `git status --porcelain` (record the baseline; expect other agents' work to still be dirty)
  - `node scripts/agent-status.mjs --integrator --json` (confirm no active claim on the target zone)
  - `node scripts/agent-validate-zones.mjs --json` (confirm a valid starting point)

- Important constraints:
  - The server workspace is `"type": "module"` with `moduleResolution: Bundler` and imports carry
    explicit `.js` extensions, so a directory import will not resolve. When splitting a TypeScript
    module that other files already import, keep the original filename as a facade or barrel and add
    siblings. Never convert `foo.ts` into `foo/index.ts`.
  - New files must map to exactly one zone. `auditZoneCoverage` rejects both unmapped and
    overlapping paths, so check the glob coverage of every new path before creating it.
  - Preserve concatenation order for CSS and template strings. The visual regression snapshots under
    `apps/server/test/__snapshots__/visual/` are sensitive to it.
  - `packages/shared/src/enums/mascot.ts` (482 lines) mixes Zod schemas, roughly 260 lines of pose
    preset data and seven pose selection functions. Split it into `enums/mascot*.ts` siblings and keep
    `enums/mascot.ts` as an `export *` barrel so `enums.ts` and `index.ts` stay untouched.

- Surveyed boundaries for the three remaining stylesheets, ready to use:
  - `tasks.css` (1060) into 8 modules: 1-117 toolbar filters, 118-273 toolbar actions,
    274-346 priority groups, 347-527 card grid and header, 528-606 date grouped grid,
    607-809 card anatomy, 810-939 detail drawer shell, 940-1060 drawer content.
    Existing banners at 1, 274, 347, 810; section comments at 11, 20, 118, 211, 409, 474, 528.
  - `layout.css` (1060): banners at 1 (App Shell), 11 (Sidebar Navigation), 543 (Main Content And
    Topbar), 826 (Sticky Task Activity Bar), 975 (Breadcrumbs); comments at 204 (Sidebar Queue
    Widget), 654, 693, 733, 784. The 204-542 sidebar queue widget block needs a selector-level
    survey before cutting.
  - `shotPlan.css` (1113): banners at 1 (Anchor Image Bundles And Lightbox), 277 (Shot Plan And Scene
    Cards), 643 (Filtering And Quick Access Toolbar), 797 (Prompt Focus Editor Modal); comment at 185
    (Image Preview Lightbox). The 277-642 and 797-1113 blocks need a selector-level survey before cutting.
