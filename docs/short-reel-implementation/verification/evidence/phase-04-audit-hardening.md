# Phase 04 Audit and Hardening Evidence

## Context
- **Task:** Comprehensive audit and edge-case hardening for Short-Reel Phase 04 ("Three-Segment Script Generation").
- **Date:** 2026-09-07
- **Claim ID:** `claim-antigravityp04audit-mtrc4h56`
- **Scope:** Edge-case failure modes, concurrency races, prompt breakout sanitization, JSON extraction resilience, downstream segment invalidation, and boundary text handover directives.

---

## Audited Failure Modes & Hardened Remediations

### 1. Concurrent Sibling Unit Acceptance (CAS Race Resolution)
- **Failure Mode:** When two sibling operations (e.g., `script` and `publishing`) finished generation concurrently and dispatched `acceptReelUnitResult` in parallel, both observed the baseline revision $R$. The first writer succeeded, bumping revision to $R + 1$. The second writer encountered a repository `REVISION_CONFLICT`, which was caught and unconditionally reported as `reason: "VALIDATION_FAILED"`, silently discarding valid generation deliverables.
- **Hardening:** Added a bounded Compare-And-Swap (CAS) retry loop (up to 3 retries) in `acceptReelUnitResult`. Upon detecting `REVISION_CONFLICT`, the policy re-fetches the latest record, re-evaluates unit status (rejecting `cancelled` or `superseded` states), and re-computes `computeDependencyFingerprint`. Because sibling completions do not alter input dependencies, the fingerprint remains valid and the write retries with the new revision, successfully merging concurrent sibling units.
- **Verification:** Added `SG-07-CONCURRENT` in `shortReelRevision.test.ts` dispatching parallel `Promise.all` acceptances and asserting atomic merge to revision 3.

### 2. Downstream Segment Invalidation Helper
- **Failure Mode:** Work slice line 34 requires dependency invalidation where segment 1 changes mark segments 2 and 3 stale, and segment 2 changes mark segment 3 stale. While unit-level invalidation existed, the repository lacked a dedicated domain helper to determine downstream segment staleness.
- **Hardening:** Exported `invalidatedDownstreamSegments(segmentIndex: 1 | 2 | 3): (1 | 2 | 3)[]` in `revisionPolicy.ts` mapping index 1 to `[2, 3]`, index 2 to `[3]`, and index 3 to `[]`.
- **Verification:** Unit tested in `shortReelRevision.test.ts`.

### 3. Boundary Text Transition Directives & Rendering Disclaimers
- **Failure Mode:** Work slice line 32 requires: "Include requested text clearing/continuation explicitly across boundaries. Avoid promising exact rendering/timing." The compiler previously only listed active in-frame text without comparing predecessor visible text across the boundary cuts or stating text clearing/reveal instructions.
- **Hardening:** Enhanced `compileSegmentPrompt` and `compileFlowPrompts` in `flowPromptCompiler.ts`:
  - Segment 1 explicitly sets initial text entry guidance.
  - Segments 2 and 3 compare starting visible text and ending visible text with predecessor end state, generating explicit `Boundary Text Transition` directives (`Retain visible text across boundary`, `Clear text from frame before segment conclusion`, or `Reveal text in frame before segment conclusion`).
  - Embedded the explicit generative disclaimer: `"Rendering & Timing Notice: Visible text timings are narrative guidance targets; avoid promising exact millisecond precision or rigid typography. In-video text must appear organically in footage."`
  - Added strict segment length guard ensuring `script.segments.length === 3`.
- **Verification:** Tested in `shortReelPrompt.test.ts` for both empty and active text boundaries.

### 4. Source Tag Delimiter Breakout Protection
- **Failure Mode:** Untrusted strings from `source.question_text`, `source.explanation`, and `source.choices` were interpolated directly into `<SOURCE_DATA>` and prompt constraint blocks. Malicious or malformed inputs containing literal `</SOURCE_DATA>` could prematurely close the XML tag block and break out into the system instruction scope.
- **Hardening:** Added `sanitizeUntrustedSourceText` escaping `</SOURCE_DATA>` and `<SOURCE_DATA>` to `[SOURCE_DATA_TAG_ESCAPED]` across all interpolations in `scriptPrompt.ts`.
- **Verification:** Added dedicated breakout injection test in `shortReelPrompt.test.ts`.

### 5. Conversational Preamble & Multi-Fence JSON Extraction
- **Failure Mode:** Real-world LLMs frequently precede structured JSON with conversational commentary or provide multiple markdown code fences (e.g. an example snippet followed by the actual script). The previous regex only trimmed leading/trailing fences and the fallback bracket index spanned across disjoint JSON blocks.
- **Hardening:** Refactored `extractScriptJson` in `scriptService.ts`:
  1. Direct parse attempt.
  2. Multi-fence extraction searching all code blocks in reverse order (evaluating the final code block first).
  3. Outermost balanced bracket extraction fallback.
- **Verification:** Added multi-fence conversational extraction test in `shortReelScript.test.ts`.

### 6. Signal Abortion Before Correction Dispatch
- **Failure Mode:** If an `AbortSignal` fired after the initial generation call failed but before the correction prompt was dispatched, the service would dispatch an unnecessary second LLM network call.
- **Hardening:** Added explicit `if (signal?.aborted) throw new ScriptGenerationError("ABORTED", ...)` guards immediately preceding the correction prompt execution.
- **Verification:** Added pre-correction abort test in `shortReelScript.test.ts`.

---

## Automated Verification Commands & Results

1. **Phase 04 Test Suites:**
   `pnpm --filter @studio/server test -- test/shortReelScript.test.ts test/shortReelPrompt.test.ts test/shortReelRevision.test.ts`
   - **Result:** 3 test files, 20 passed, 0 failed.

2. **All Short-Reel Server Test Suites:**
   `pnpm --filter @studio/server exec vitest run shortReel`
   - **Result:** 15 test files, 89 passed, 0 failed.

3. **Shared Contracts Tests:**
   `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`
   - **Result:** 25 passed, 0 failed.

4. **Monorepo Typecheck:**
   `pnpm typecheck`
   - **Result:** Exit status 0 across `@studio/shared`, `@studio/server`, `@studio/web`.

5. **Web Production Build:**
   `pnpm --filter @studio/web build`
   - **Result:** Exit status 0 (built in 3.30s).

6. **Zone Validation:**
   `node scripts/agent-validate-zones.mjs --json`
   - **Result:** Valid with 0 unmapped files and 0 overlapping files.
