# Short-Reel Phase 04 Review and Repair Handoff

## Status

- Date: 2026-09-07. Agent: Codex. Working mode: main-direct.
- Result: implementation repairs complete; final tests passing; prepared for verified release and documentation acceptance.
- Claim: `claim-codexp04reviewrepair-mtrch3ln`.
- Baseline: HEAD `42d2ecd79c2a3e1955499764661d05446a3baf46`, fingerprint `7a244d7d591185d946ef0f80b36b6358334406519b9573ccdf166860ec58428b`, 186 pre-existing dirty files.
- Independent inspection of Antigravity's Phase 04; self-verification of Codex repairs. Do not relabel the repairs fresh independent review.

## Source Files Read

AGENTS.md; coordination README/master-spec/phase-roadmap/parallel policy and handoff template; Short-Reel README/runbook/specification/architecture/contracts/roadmap/progress/decisions; Phase 04 and Phase 05 documents; acceptance matrix/test catalogue; predecessor acceptance; Phase 04 implementation and audit evidence/handoffs; actual code and tests. CodeGraph was used before code discovery. No additional agents were spawned; the phase prompt prohibits unrequested delegation and the repair crosses shared boundaries.

## Files Changed

- `apps/server/src/shortReel/scriptService.ts`
- `apps/server/src/shortReel/scriptProvider.ts`
- `apps/server/src/shortReel/scriptPrompt.ts`
- `apps/server/src/shortReel/flowPromptCompiler.ts`
- `apps/server/src/shortReel/revisionPolicy.ts`
- `apps/server/src/shortReel/dependencyPolicy.ts`
- `apps/server/src/shortReel/unitLifecycle.ts`
- `apps/server/src/repository/shortReels.ts`
- `apps/server/src/repository/shortReelEdits.ts`
- `apps/server/src/repository/shortReelTransaction.ts`
- `packages/shared/src/shortReel/shortReel.schema.ts`
- `apps/server/src/utils/promptSanitizer.ts`
- `apps/server/src/quiz/bank/batch/batchChunkScheduler.ts`
- `apps/server/test/shortReelPhase04Repair.test.ts`
- `apps/server/test/shortReelPhase04Lifecycle.test.ts`
- `apps/server/test/shortReelPrompt.test.ts`
- `apps/server/test/shortReelRevision.test.ts`
- `docs/short-reel-implementation/contracts.md`
- `docs/short-reel-implementation/decisions.md`
- `docs/short-reel-implementation/progress.md`
- `docs/short-reel-implementation/verification/evidence/phase-04-review.md`
- This handoff.

## Main-Direct Safety and Scope

Final scope verification detected concurrent changes to `scripts/coordination/monitor/web/neural-graph.js` and four drone handoffs. Registry history identifies released Antigravity drone claims (`mtrcjqri`, `mtrctn4u`, `mtrd40ff`, `mtrddslf`), plus an unrelated active laser-size claim. These files were not edited by this task. An authenticated rebaseline preserves that unrelated work; no ownership expansion or product regression rerun is needed for isolated monitor graphics. This handoff certifies only the Short-Reel claim, not integration of the other agent's active work.

No branch/worktree, commit, live Flow call, provider generation, protected-data deletion or kit archival. Existing dirty Short-Reel files were modified only within claimed scope to repair the reviewed behavior. Other dirty work, including coordination monitor edits and earlier Stage A/B changes, was retained. Scope expansions were authenticated before repository/shared/adapter edits. The one Question Bank integration change preserves intentional cancellation after the shared adapter became stricter; its existing test exposed and verifies that regression. No Phase 05 product code was started.

## Decisions and Next Consumer Contract

- See [current contracts](../../short-reel-implementation/contracts.md) and [review findings](../../short-reel-implementation/verification/evidence/phase-04-review.md).
- Optional `stale_segments` is persisted, not a helper-only claim. Upstream edits preserve downstream text and invalidate it. Only draft editing may defer continuity at stale incoming boundaries; export/generation must validate strictly and reject stale mandatory content.
- Use `beginReelUnitAttempt` before provider dispatch. Pass its persisted operation ID/fingerprint to `acceptReelUnitResult`. Use cancel/fail helpers for matching pending work. All use the same repository record queue as edits. Unknown, superseded and terminal attempts cannot restore ready state. User edits retire affected attempts.
- `revisionPolicy.ts` re-exports pure dependency policy and separately owned lifecycle orchestration; no generic framework or duplicate UI state was introduced.
- Accepted generated scripts store three deterministic prompt projections. Later exports must compile from the current consistent snapshot with the resolved reference labels and reject stale/failed/pending mandatory units. Script/model-note edits invalidate cached prompts.
- One correction, whole-operation deadline, propagated cancellation, safe provider errors and reversible source encoding are enforced. No software check proves actual video meaning, text quality or continuity.

## Verification

- `pnpm --filter @studio/server test -- --maxWorkers=4 --minWorkers=1`: final 175 files / 1,340 tests passed; 99.45 seconds; exit 0.
- `pnpm --filter @studio/web test -- --maxWorkers=2 --minWorkers=1`: 68 files / 353 tests passed; exit 0.
- Explicit `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`: 25 passed. Standard shared command: 30 passed.
- Five Phase 04 files: 40 tests passed. New tests include red-green reproduction of extra correction calls, unbounded providers, late cancellation, source encoding, overwritten edits, missing stored stale state/projections, unknown operations, replay, and malformed result handling. Controlled atomic-writer barriers prove both cancellation orderings and sibling merging.
- Real integration: fake LLM generates script, real repository accepts/persists all three prompt projections, repository reopens and preserves content/replay. Real browser draft confirmation/reload/reconnect also passes against rebuilt web assets. No new Phase 04 UI screenshots or live video checks are claimed.
- Typecheck, server build, web build, focused ESLint, zone validation and diff whitespace check passed. Formatting/link checks are included in final claim verification.
- Failed intermediate gates remain documented: Question Bank cancellation regression (fixed); intermittent `quizV2Route.test.ts` temporary-directory EBUSY (final entire suite rerun passed); new replay fixture cleanup order (fixed). No tests skipped or weakened.

## Open Risks and Next Phase Input

No unresolved identified Phase 04 product blocker remains after repair. New repairs are self-verified, not independently certified. Phase 05 must perform the normal predecessor check against current evidence and registry releases, then implement only references/cover/publishing/export. Phase 06 still owns UI/task routing and recovery integration. Actual Flow footage and final project acceptance remain the user's responsibility. Footer-language conflict remains unchanged.

Eligible next product prompt after the review gate: [05-assets-export.md](../../short-reel-implementation/prompts/05-assets-export.md). Read this handoff and the current review/contract ledger first; preserve other dirty work; no automatic Phase 06 continuation or deletion.
