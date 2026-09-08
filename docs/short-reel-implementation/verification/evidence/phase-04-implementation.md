# Phase 04 Evidence: Three-Segment Script Generation

## Identity

- **Phase:** 04 — Three-Segment Script Generation
- **Actor:** Antigravity implementation session (fresh implementer)
- **Date:** 2026-09-07
- **Repository Root:** `D:/1a Cursor Project/My 1x Project`
- **HEAD:** `42d2ecd79c2a3e1955499764661d05446a3baf46`, main-direct
- **Implementation Claim ID:** `claim-antigravityp04script-mtrbif87`
- **Owned Planned Files:**
  - `apps/server/src/shortReel/scriptPrompt.ts`
  - `apps/server/src/shortReel/flowPromptCompiler.ts`
  - `apps/server/src/shortReel/revisionPolicy.ts`
  - `apps/server/src/shortReel/scriptService.ts`
  - `apps/server/test/shortReelScript.test.ts`
  - `apps/server/test/shortReelPrompt.test.ts`
  - `apps/server/test/shortReelRevision.test.ts`
  - `docs/short-reel-implementation/verification/evidence/phase-04-implementation.md`
  - `docs/short-reel-implementation/progress.md`
  - `docs/agent-coordination/handoffs/short-reel-phase-04.md`

---

## Requirements And Changes

Covered requirements: **SR-03, SR-04, SR-05, SR-08, SR-09, SR-10, SR-14**.

### Implemented Modules

1. **`apps/server/src/shortReel/scriptPrompt.ts`**:
   - `buildScriptGenerationPrompt(context)`: Builds creative prompt using channel DNA, topic title/premise/hook, mascot anchor, and visual style reference.
   - Embeds source question, choices, correct choice, and explanation strictly inside `<SOURCE_DATA>` ... `</SOURCE_DATA>` XML tags, with explicit instructions treating source material as passive untrusted data to protect against prompt injection.
   - Provides archetype guidance for `versus_faceoff` (2-way contest) and `deep_trivia` (mystery hook and revelation).
   - Informs model of required JSON schema: exactly 3 segments, durations 8-10s (default 8s), text cues in footage (canonical question cue matching source in segment 1; canonical answer cue matching source in segment 3), and continuity handover between segments.
   - `buildScriptCorrectionPrompt(originalPrompt, rawOutput, errors)`: Generates targeted correction prompt including specific schema/fidelity errors.

2. **`apps/server/src/shortReel/flowPromptCompiler.ts`**:
   - `compileFlowPrompts(script, references?, modelNote?)`: Pure, deterministic compiler producing `[string, string, string]`.
   - Prompt 1 specifies `MODE: Initial Generation (9:16 portrait)`.
   - Prompts 2 and 3 specify `MODE: Video Extension (continue from ...s, do NOT restart)`.
   - Embeds local segment seconds, duration targets, and cumulative timing (`0s - 8s`, `8s - 16s`, `16s - 24s`).
   - Explicitly requests in-video visible text cues in footage; strictly prohibits obsolete no-text instructions.
   - Embeds character, camera transitions, key props, audio direction, and boundary handoff states.
   - Invariant: Same saved inputs compiled twice yield byte-identical prompts.

3. **`apps/server/src/shortReel/revisionPolicy.ts`**:
   - `affectedReelUnits(command)`: Implements the Invalidation Table:
     - `replace_source_question`: invalidates all creative units (`references`, `script`, `cover`, `publishing`).
     - `update_references`: invalidates `script` and `cover`.
     - `update_script` / `update_segment`: invalidates `script` (and prompt projections).
     - `update_cover`: invalidates `cover`.
     - `update_publishing`: invalidates `publishing`.
     - `update_model_note`: metadata only (no creative units invalidated).
   - `computeDependencyFingerprint(unitKey, record)`: Computes deterministic SHA-256 hash of the exact input dependencies for each deliverable unit. Sibling unit completions (e.g. cover vs script) do not invalidate each other's dependency fingerprints.
   - `acceptReelUnitResult(repository, key, unitKey, attempt, payload)`: Linearly validates completion against current record; rejects cancelled attempts (`CANCELLED`), superseded in-flight operations (`SUPERSEDED_OPERATION`), or stale upstream dependencies (`STALE_DEPENDENCY`); updates repository record upon acceptance.

4. **`apps/server/src/shortReel/scriptService.ts`**:
   - `generateReelScript(context, llmClient, options)`: Invokes LLM, extracts JSON, validates against schema and source fidelity (`validateReelScript`).
   - Allows at most 1 correction attempt when validation fails (`maxCorrectionAttempts = 1`), throwing `ScriptGenerationError` if still failing.
   - Cleanly propagates `AbortSignal` (`code: "ABORTED"`) and bounds timeouts (`code: "TIMEOUT"`).

---

## Verification Results

| Command | Exit Code | Results |
| :--- | :--- | :--- |
| `pnpm --filter @studio/server test -- test/shortReelScript.test.ts test/shortReelPrompt.test.ts test/shortReelRevision.test.ts` | 0 | 3 files, 13 tests passed |
| Vitest on all 15 Short-Reel server suites | 0 | 15 files, 82 tests passed |
| `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts` | 0 | 25 / 25 tests passed |
| `pnpm typecheck` | 0 | Clean across `@studio/shared`, `@studio/server`, `@studio/web` |
| `pnpm exec eslint apps/server/src/shortReel/*.ts apps/server/test/shortReel*.test.ts` | 0 | 0 problems (0 errors, 0 warnings) |
| `pnpm exec prettier --check apps/server/src/shortReel/*.ts apps/server/test/shortReel*.test.ts` | 0 | All matched files use Prettier style |
| `pnpm --filter @studio/web build` | 0 | Production web build clean (3.95s) |
| `node scripts/agent-validate-zones.mjs --json` | 0 | 24 valid zones, 0 unmapped, 0 overlapping |
| `git diff --check` | 0 | Clean diff formatting |

---

## Failure And Concurrency Checks (Test Cases SG-01 through SG-07)

- **SG-01 (Valid 3-part script generation):** Verified in `shortReelScript.test.ts`. Stub LLM produces valid JSON; service validates structure, cue text, and reveal order; compiler derives exactly 3 prompts.
- **SG-02 (Bounded correction on invalid JSON & timeout):** Verified in `shortReelScript.test.ts`. Exactly 1 correction attempt allowed; persistent invalidity throws typed `PARSE_ERROR` or `VALIDATION_FAILED`; timeouts throw `TIMEOUT`.
- **SG-03 (Byte-identical prompt compilation):** Verified in `shortReelPrompt.test.ts`. Compiling same inputs twice produces byte-identical strings with exact cues, timing, and boundary handoffs.
- **SG-04 (Invalidation ledger adherence):** Verified in `shortReelRevision.test.ts`. `affectedReelUnits` maps each edit kind to exact affected units from the Invalidation Table.
- **SG-05 (Stale result discard on upstream edit):** Verified in `shortReelRevision.test.ts`. User editing topic premise while script generation is in-flight causes older result to be discarded with `STALE_DEPENDENCY`, preserving newer premise.
- **SG-06 (Linearized honest cancellation):** Verified in `shortReelRevision.test.ts`. Cancelled units reject incoming results; accepted results cannot be retroactively superseded by older cancelled operation IDs.
- **SG-07 (Sibling unit concurrency):** Verified in `shortReelRevision.test.ts`. Concurrent completion of script and publishing from the same snapshot are both accepted despite revision increment because sibling units do not alter each other's dependency fingerprints.

---

## Boundary Disclosure

- **Mocked / Stubbed:**
  - LLM client interactions in automated tests use controlled stub implementations (`createStubLlm`) without invoking paid/live APIs.
  - No live Flow automation or external video generation was executed; generated prompts represent structured manual Flow requests per product specification.

---

## Handoff And Next Phase Input

- **Implementation Claim ID:** `claim-antigravityp04script-mtrbif87`
- **Progress Register:** Updated in `docs/short-reel-implementation/progress.md` marking Phase 04 `ready_for_review`.
- **Handoff Summary:** `docs/agent-coordination/handoffs/short-reel-phase-04.md`.
- **Next Step:** Independent fresh review of Phase 04 using `prompts/reviewer.md` before proceeding to Phase 05 (Package Assembly, References, and Cover Generation).
