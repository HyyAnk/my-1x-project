# Phase 05 - Dependencies and Package Orchestration

This is the highest-risk phase. Do not wire new buttons around the old ordering and call the integration complete.

## Files and interfaces

Create `generationPlan.ts`, `generationWorkflow.ts`, `compiledPromptRefresh.ts`, and `apps/server/src/tasks/shortReelRunner.ts`. Modify `dependencyPolicy.ts`, `unitLifecycle.ts`, `packageAttempt.ts`, `packageService.ts`, `shortReelEdits.ts`, task runtime/bindings, route dependency injection, and task request comparison.

Tests: `shortReelGenerationPlan.test.ts`, `shortReelDependencyV2.test.ts`, `shortReelWorkflowV2.test.ts`, `shortReelRunnerV2.test.ts`, plus existing routes/revision/cancel suites.

Produces: `executeReelGeneration` from the contracts, a pure `planReelGeneration(record, request)` exported by `generationPlan.ts`, and `refreshCompiledReelPrompts(record): void` from `compiledPromptRefresh.ts`. The pure planner returns ordered stages with explicit `dependsOn` stage keys; it does not call I/O or mutate a record. Define `PlannedReelStage` in `generation.types.ts` with `stage`, `action: "run" | "reuse"`, and `dependsOn`.

## Dependency steps

- [ ] Write a test for every row in the normative dependency matrix. Assert both visible state and attempt retirement; an old pending style must be unable to overwrite references after a script edit.
- [ ] Remove the script's dependency on generated style/reference payload. Include visual-context identity instead. Publishing depends on script/source, not cover completion. Cover depends on script and style checksum.
- [ ] Separate normal full-script generation input fingerprint from segment-replacement input fingerprint. A target-script snapshot is relevant only when replacing a segment. Never hash the newly accepted full script as its own generation input.
- [ ] Persist the accepted unit's canonical input fingerprint only after acceptance/validated edit. Repair compares it to current inputs rather than reading only the current attempt. Test that a failed regeneration preserves both previous payload and its accepted fingerprint, but remains failed until explicitly repaired/reaccepted.
- [ ] Make actual `applyShortReelEdit` behavior match `affectedReelUnits`. If both retain tables, make one derive from the other rather than hand-maintaining conflicting copies.
- [ ] Define prompt refresh as deterministic compilation of current script + selected reference labels/asset IDs + model note. Invoke it after accepted script, accepted references and model-note edits. This changes the compiled cache, not the script's readiness or factual content.
- [ ] Preserve segment-1/2 downstream continuity invalidation. A partially stale script blocks new dependent outputs until repaired; do not disable these established correctness checks.

```ts
const before = await f.repo.getShortReel(f.key);
const after = await f.repo.updateShortReel(
  f.key,
  {
    expected_revision: before.revision,
    request_id: "accept-style",
  },
  { kind: "update_references", references: generatedReferences },
);
expect(after.units.script.state).toBe("ready");
expect(after.script).toEqual(before.script);
expect(after.units.script.last_accepted_payload?.compiled_prompts).toHaveLength(3);
```

Prepare `generatedReferences` with the style service from Phase 03. Add the complementary script-edit test proving references, cover and publishing become stale without deleting payloads.

## Workflow steps

- [ ] Implement pure planner tests for a new reel, fully ready reel, one failed style, failed publishing only, changed script and explicit Regenerate All. A complete repair run has no paid provider calls.
- [ ] Preflight only capabilities needed by requested work. An individual publishing/script operation must not fail just because image provider credentials are absent. Package preflight should identify image blockers before spending on new images. Missing mascot is required for the new visual script workflow, with a clear remediation action.
- [ ] Resolve/adopt current visual context before planning paid generation. Re-read the updated record; do not plan against a stale pre-adoption snapshot.
- [ ] Execute/reuse script first. After acceptance emit progress with its accepted revision. Start style and publishing branches from the same current accepted script, but use independent unit fingerprints.
- [ ] Await successful current style before starting cover. If style fails, do not generate a cover from a stale old style. Allow publishing to complete independently and preserve its result.
- [ ] Use `Promise.allSettled` for independent branches and collect all failures. Do not reject early and leave a sibling operation unmanaged. Cancellation must reach both branches and wait/settle safely before task teardown.
- [ ] Retain one server task per reel; individual targets reject missing prerequisites with `VALIDATION_FAILED`. Only package may automatically create prerequisites.
- [ ] Implement repair vs regenerate semantics. Before each stage, recheck readiness and dependencies. Regenerate All creates fresh attempts for required units but preserves previous accepted bytes until replacements are accepted.
- [ ] Reuse `runPackageAttempt` for atomic start/accept/fail. Extend it to pass operation identity to image services and safe error mapping; do not bypass admission or call direct JSON writes.
- [ ] Ensure changed external mascot bytes/context are revalidated before acceptance. Rejected stale output may remain as an unselected immutable file; do not eagerly delete arbitrary assets. Record any unselected artifact in diagnostics without exposing secrets.
- [ ] Finalization requires current script with no stale segments, exactly one mascot and one generated style reference, current cover, current publishing and three compiled prompts. Only then mark task complete. Partial completion is a failed task with a clear stage summary, not a false complete package.

## Runner and route steps

- [ ] Extract Short-Reel execution from large `codexRunner.ts` into `shortReelRunner.ts`; keep other task types unchanged. Compose the portrait client and LLM in this boundary; feature services do not pull mutable global engine settings.
- [ ] Pass one root AbortSignal to every target and child call, including standalone cover/references. Ensure controller registration/removal occurs in `try/finally`.
- [ ] Persist structured stage progress through `runtime.update` after start, reuse, acceptance and failure. Emit after durable acceptance, not before. Use `progress_percent: null` for unpredictable generation; stage count is not a fabricated image-generation percentage.
- [ ] Extend route replay equality to normalized mode. Same request ID + changed mode is 409; same ID + identical body returns the original task and never recharges.
- [ ] Keep expected-revision checks and active-task conflict behavior. Update server task persistence/restart parsing for additive request/progress fields.
- [ ] For the route's task-manager-free branch, inject the same executor dependencies in tests. In a production configuration without required generation dependencies, return an explicit 503-style unavailable response; no fake completed task or baseline script.
- [ ] Add queued and direct-route tests proving identical validation semantics, correct HTTP errors and segment target dispatch (no accidental fallthrough to full package).

## Required concurrency tests

- [ ] Use deferred promises, not real sleeps, to prove `script -> style -> cover` ordering and that publishing can settle while style is pending.
- [ ] Hold style pending, edit the script, resolve old style: assert no accepted new style or cover from old script.
- [ ] Complete publishing while style is pending: assert no sibling fingerprint invalidation.
- [ ] Cancel while both branches are pending: resolve both late and assert neither late payload is accepted.
- [ ] Send duplicate request, then same ID with different mode; assert one provider operation and conflict respectively.
- [ ] Let cover fail but publishing pass; repair again and assert only cover is generated.
- [ ] Fail style after script success; repair and assert script is reused, style is retried and cover follows the new style.

For ordering evidence, mock provider/LLM boundaries to append `script`, `style`, `publishing`, `cover` labels to a local test array. Assert indexes only for actual dependencies, not a fixed order between independent branches.

```powershell
pnpm --filter @studio/shared build
pnpm --filter @studio/server test -- shortReelGenerationPlan shortReelDependencyV2 shortReelWorkflowV2 shortReelRunnerV2
pnpm --filter @studio/server test -- shortReelRoutes shortReelRevision shortReelPhase04 shortReelDrainLifecycle
pnpm typecheck
```

## Exit gate

A complete mocked package succeeds with no global style anchor and no Episode. Regeneration has no circular dependency, cancelled/stale results cannot be accepted, partial successes survive failure, and every accepted unit generates a refreshable progress event.
