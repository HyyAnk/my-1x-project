# Short-Reel Portrait Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task when available. If this skill is unavailable in Antigravity, follow the same test-first, phase-gated sequence explicitly. Do not spawn agents or delegate unless the user authorizes it. Steps use checkbox syntax for tracking.

**Goal:** Deliver a reliable portrait Short-Reel package using existing provider capabilities, immutable reel assets, LLM-derived publishing, and synchronized UI.

**Architecture:** Existing four-unit record lifecycle remains the source of truth. A repository-independent image-byte adapter feeds dedicated style/cover services; a focused Short-Reel workflow orders script, images and publishing and uses existing task events and atomic transactions. Versioned normalization preserves existing records and publishing content.

**Tech Stack:** Existing TypeScript, Zod, Fastify, React, Sharp, Vitest, Playwright, pnpm, and provider clients. No new production dependencies planned.

**Spec:** `docs/short-reel-upgrade/01-approved-design.md` and `03-contracts-and-state.md`.

## Global constraints

- Keep all new repository content and new UI copy in English.
- Do not change unrelated asset-curation work or user storage during automated tests.
- No Episode-bound image writer may receive a Short-Reel ID.
- No silent template, degraded image, or text-only reference fallback may be marked successful.
- Persisted mutations use existing revision/receipt/atomic writer safeguards.
- Respect the existing footer and UI copy/accessibility rules; do not duplicate the footer.
- Tests precede implementation. Run the changed version before claiming completion.
- Live generation is a separate approval gate for target, cost, and external calls.

## Execution schedule

| Phase | Deliverable                                                     | Depends on | Required gate                                                      |
| ----- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| 00    | Baseline, ownership inventory, isolated test setup              | none       | Baseline evidence and exact target checks                          |
| 01    | v2 record + publishing + request/progress contracts; v1 adapter | 00         | Legacy round-trip and backup tests                                 |
| 02    | Portrait image-byte factory/adapters and deadlines              | 01         | Mocked transport proves reference bytes and no Episode persistence |
| 03    | Genuine script context, existing mascot, generated style        | 02         | No global anchor required; portrait style accepted                 |
| 04    | Reel cover and two-field LLM publishing                         | 03         | Script-aware prompts, correct bytes/storage, no silent fallback    |
| 05    | Acyclic dependencies, orchestration and task integration        | 04         | Full mocked package, cancel/retry/stale tests                      |
| 06    | UI and immediate per-unit synchronization                       | 05         | Race, reconnect, dirty draft, responsive interaction tests         |
| 07    | Export, legacy integration, restart recovery                    | 06         | Consistent ZIP and durable recovery                                |
| 08    | Full regression, rebuilt runtime, approved live smoke           | 07         | Evidence-backed handoff or explicit incomplete live gate           |

Each phase file is part of this plan, not optional reading. Mark steps only after running the corresponding check. Record commands, exit codes, and meaningful output in `execution/EVIDENCE.md`. If a phase spans sessions, record the exact next unchecked step.

## File ownership and decomposition

New shared modules: `shortReelPublishing.schema.ts`, `shortReelVisual.schema.ts`, `shortReelProgress.schema.ts`, `shortReel.legacy.ts`, `shortReel.compat.ts` under `packages/shared/src/shortReel/`.

New provider modules: `imageGeneration.types.ts`, `portraitImageClient.ts`, `gpti2PortraitAdapter.ts` under `apps/server/src/providers/imageGeneration/`. Add another provider adapter only when its reference transport is implemented and verified.

New feature modules under `apps/server/src/shortReel/`: `generation.types.ts`, `generationWorkflow.ts`, `generationPlan.ts`, `generationErrors.ts`, `mascotReferenceService.ts`, `visualContextService.ts`, `stylePrompt.ts`, `styleImageService.ts`, `coverPrompt.ts`, `coverImageService.ts`, `publishingPrompt.ts`, `publishingParser.ts`, `portraitImage.ts`, `compiledPromptRefresh.ts`.

New focused integration: `apps/server/src/tasks/shortReelRunner.ts`; `apps/server/src/repository/shortReelUpgrade.ts`. Retain `packageService.ts`/`thumbnailAdapter.ts` only as thin integrated entry points when needed. Do not add workflows to the existing large runner, route, or repository service file.

New web modules under `apps/web/src/features/shortReel/`: `components/ReelAssetCard.tsx`, `components/ReelGenerationProgress.tsx`, `hooks/useShortReelRecordSync.ts`, `utils/publishingText.ts`. Split further only when responsibilities actually differ.

## Test harness recipes

Use existing `repairFixture`, `repairScript`, `packageFixture` and `packageImage`. Their actual source is listed in the code map. Use `f.cleanup()` in `finally`; do not invent a production repository rooted at the user's channel storage.

Create `apps/server/test/helpers/shortReelUpgradeFixture.ts` during Phase 03 with this public contract, consumed by later phases:

```ts
// Return type is inferred from actual fixture values, not cast to any.
export async function createUpgradeFixture() {
  const f = await packageFixture();
  const mascot = await f.repo.getMascot(f.mascot.id);
  await f.repo.saveMascot({
    ...mascot,
    styles: mascot.styles.map((style) => ({ ...style, anchor_image_url: null })),
  });
  const signal = new AbortController().signal;
  const context = await resolveMascotReference(f.repo, f.key, signal);
  await adoptVisualContext(f.repo, f.key, context);
  const snapshot = await f.repo.updateShortReel(
    f.key,
    {
      expected_revision: (await f.repo.getShortReel(f.key)).revision,
      request_id: "fixture-script",
    },
    { kind: "update_script", script: repairScript() },
  );
  return { ...f, snapshot, signal };
}
```

Imports: existing fixture helpers; new `resolveMascotReference`; new `adoptVisualContext(repository, key, context): Promise<ShortReelRecord>` from `visualContextService.ts`. Adopt the existing `updateShortReel` signature if it has changed; the repository currently accepts `(key, context, command)`. New `adoptVisualContext` applies the dependency matrix through `mutateShortReelRecord`. Define it in Phase 03, do not fake it with direct JSON writes.

Create a pure fake image client in the same test helper:

```ts
export function fakePortraitClient(bytes: Uint8Array): PortraitImageClient {
  return {
    supportsReferenceImage: true,
    generate: vi.fn(async () => ({
      bytes,
      provider: "test",
      model: "fixture-model",
    })),
  };
}
```

Import `vi` from `vitest` and `PortraitImageClient` from the new server-only contract. No real provider call is permitted by unit/integration tests. For full workflow tests, mock the existing LLM execution boundary used by `requestScriptText` and return JSON of `repairScript()` or a two-field publishing object based on the prompt. Restore mocks after each test.

## Gate procedure for every implementation task

1. Read the target module, direct callers, and current tests.
2. Add the named regression test and run it alone. Record a failure proving missing behavior, not a syntax/import typo.
3. Implement the smallest coherent responsibility described by the phase. Keep pure prompt/state functions separate from I/O.
4. Run the new test, the phase suite, shared build and affected type checks.
5. Inspect diff for unrelated changes, unsafe casts, dropped signals, hidden fallback, circular dependencies, and obsolete code.
6. Update progress/evidence. Do not mark live generation as passed based on mocks.
7. Continue to the next phase only after this gate passes; do not commit unless separately authorized.

## Current status

All phases are unstarted. Documentation has been prepared; no application behavior, persisted reel, provider setting, or live task has been modified by this planning handoff.
