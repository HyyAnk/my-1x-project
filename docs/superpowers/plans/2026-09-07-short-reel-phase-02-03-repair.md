# Short-Reel Phase 02 and 03 Repair Implementation Plan

> **For agentic workers:** Use the host's executing-plans workflow to execute one stage at a time. Repository instructions override generic skill advice: main-direct, no unsolicited commits/worktrees/subagents. Steps use checkboxes. The executor must not self-accept its implementation.

**Goal:** Resolve F03-01 through F03-10, restore the usable one-question draft workflow, and obtain independent acceptance before Phase 04.

**Architecture:** Repair the frozen source/persistence boundary first, then repair topic production, confirmation, selection and the draft UI against that reviewed boundary. Keep routes thin, source transformations pure, I/O inside adapters, and UI state in feature hooks. Preserve existing data and unrelated dirty work.

**Tech Stack:** Existing TypeScript, Zod, Fastify, React, Vitest, node:test and Playwright. No Flow integration or new production dependency is assumed.

**Spec:** [Product specification](../../short-reel-implementation/specification.md), [contract ledger](../../short-reel-implementation/contracts.md), [review findings](../../short-reel-implementation/verification/evidence/phase-03-review.md), [behavioral cases](../../short-reel-implementation/verification/test-cases.md).

## Global Constraints

- Planning only until this plan is delegated for implementation; this document itself does not grant acceptance, deletion or migration authority.
- Work in D:/1a Cursor Project/My 1x Project on the existing main checkout; preserve the dirty baseline.
- Read AGENTS.md, coordination README/master-spec/roadmap/latest handoff, and the Short-Reel required reading before editing.
- Use CodeGraph first where indexed; verify current symbols and zone mappings. Paths below are concrete proposed edit/test paths, not claims already acquired.
- All new code, documentation, fixtures and visible copy remain English. Language-rejection fixtures may use English sentinel strings with explicit non-English language metadata; do not add foreign-language prose to the repository.
- Never assume missing bank metadata means English. Do not change bank records or Episode localization to satisfy Short-Reel eligibility.
- Exactly one approved existing source question; exactly three generate/extend/extend segments when a script exists; exact canonical question/answer preserved.
- No paid/live Flow action, generated video, publishing, portrait retirement, new Phase 04 feature, kit deletion/archive or hidden compatibility shim.
- No new source field may be fabricated from the current bank to reconstruct an older snapshot. No silent schema-version bump or resetting old drafts.
- The existing footer conflict remains explicit. Reuse existing chrome without changing credit text; ask the user if completing the UI requires a copy decision.
- Use strict public types and narrow adapters. Do not add workflows to oversized files: extract cohesive modules and integrate through small changes.
- New persistence or locking dependencies require maintenance/security/license/runtime review and integrator approval; never install one implicitly.
- Every step follows test -> observed behavioral failure -> focused implementation -> passing test. Do not accept missing imports or fixture errors as the intended red result.
- After changing code/config, rebuild/restart and run the actual updated workflow. Builds alone do not close a finding.

## Stage Order and Review Gates

| Stage | Findings                                   | Deliverable                                                                    | Stop condition                                                             |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| A     | F03-08 and source foundation for F03-02/03 | Correct source contract, persistence validation and demonstrated writer safety | Release implementation claim and obtain independent Phase 02 repair review |
| B     | F03-01 through F03-07, F03-09, F03-10      | Working mixed-topic -> one-question draft -> reopen workflow                   | Release implementation claim and obtain independent Phase 03 re-review     |

Do not run B against unreviewed A contracts. Do not run Phase 04 after B automatically. A single executor may work on both stages only after a fresh reviewer/user-integrator has accepted A in between.

A is the critical path. B's selection and topic work both use exclusive application/contracts zones and must be serialized. UI work may be independently reviewed read-only, but no automatic subagent dispatch is required by this handoff. If later explicitly authorized, apply the parallel-execution policy and each writer's own claim; different filenames do not defeat exclusive zones.

## Task 0: Reconcile Evidence, Scope and Authority

**Files to read:** current progress, phase-03-review.md, original phase implementation/review handoffs and registry records. No product edits.

- [ ] Capture git status --porcelain and HEAD; compare the current implementation to the reviewed state. Reproduce findings before fixing them; record if concurrent work already resolved one.
- [ ] Inspect the implementation's final plannedFiles and released files. Explain service.ts/channelApi.ts omissions and contracts.md's unchanged baseline as F03-10 evidence. Do not rewrite or fabricate historical authorization.
- [ ] Enumerate existing persisted reel schema versions and topic-run formats read-only. Record counts/IDs/hashes, not private full datasets in evidence.
- [ ] For records lacking original-source fidelity, preserve them and report a typed unsupported/incomplete-source state. Ask for a separately scoped data decision if migration/reset is needed; do not mask the issue with coercion.
- [ ] Resolve the writer model before A code: inspect repository lifecycle, roots, all write entry points and supported Node runtime. Choose either demonstrated cross-process serialization or fail-closed single-writer admission, recording its exact owner/release/crash semantics in contracts.md.
- [ ] Preferred bounded policy is one admitted writer per canonical storage root, retaining existing per-record queues. Use an existing OS-held/process-lifetime locking primitive if available. A PID file, timeout-only lease or per-instance Map is not sufficient. If no supported primitive exists, present a concrete dependency/runtime proposal to the integrator and stop A before inventing one. Multi-writer transactional storage is a broader alternative, not the default repair.
- [ ] Acquire a new authenticated claim per stage with comma-separated concrete files, including all evidence/handoff paths. Expand successfully before discovering additional edits. Respect exclusive shared-contracts, artifact-contracts, api-contracts and task-status-progress boundaries.

Protocol commands, substituting session-owned values only:

```powershell
git status --porcelain
git rev-parse HEAD
node scripts/agent-status.mjs --json
node scripts/agent-claim.mjs --agent repair-executor --task "Short-Reel bounded repair stage" --write "comma-separated-verified-zones" --planned-files "comma-separated-concrete-files" --json
```

The command above is a syntax guide, not a ready-to-run claim: construct the real lists from the task's file inventory and current zones. Never persist the returned lease token.

## Task A1: Preserve Original Source and Validate at Persistence

**Modify:** packages/shared/src/shortReel/shortReel.schema.ts, shortReel.types.ts, index.ts; apps/server/src/repository/shortReels.ts; docs/short-reel-implementation/contracts.md and decisions.md.

**Create:** packages/shared/src/shortReel/shortReelSource.schema.ts and shortReelSource.ts, extracting the source boundary from the oversized schema file; packages/shared/test/shortReelSource.test.ts; apps/server/test/shortReelSourcePersistence.test.ts.

**Tests also affected:** packages/shared/test/shortReel.test.ts and apps/server/test/shortReelRepository.test.ts. Discover every existing snapshot constructor/fixture consumer before changing exports and claim those concrete files.

**Interfaces:** Keep createSourceSnapshot(bankQuestion) as the source-only public constructor for existing consumers, but reject unapproved/non-English input instead of mislabeling it. Add createEnglishSourceSnapshot(bankQuestion, provenance), where provenance is source or verified_translation. Infer ShortReelSourceSnapshot from Zod; store original_question using BankQuestionSchema plus the selected English projection, original timestamp and canonical hash. Do not duplicate BankQuestion types. Record any contract/version change and compatibility handling before implementation.

- [ ] Add failing tests that change the live fixture after snapshot construction: snapshot.original_question must retain every original validated field, including translation verification and correct_choice_id; returned projections must not share mutable references with input.
- [ ] Add tests for approved status, supported archetype, unique original/translated choices, exact canonical answer and stable content hash. Hash a deterministic serialization of both original validated record and selected projection; exclude the hash itself. Test object-key reordering does not change the hash, while a canonical source change does.
- [ ] Extract the cohesive source schema/constructor. Preserve existing imports through explicit barrel re-exports; do not duplicate another hashing/projection algorithm in the server selector.
- [ ] Wire source-aware validation into the persistence boundary, not only standalone helpers. Validate scripts against the current source before saving; return a typed INVALID_SOURCE or INVALID_SCRIPT error without changing disk/revision on failure.
- [ ] Preserve deliberately stale prior payloads after source replacement as historical work. Never mark an old-source payload ready or reject the whole record merely because a retained stale payload belongs to the prior source. Validate current ready script/payload against the current source.
- [ ] Exercise create -> update -> new repository/process read and verify original source/IDs/hash unchanged. Test invalid canonical question/answer writes preserve the previous bytes and revision.

Concrete regression shape using the existing repository fixture and a valid three-segment script:

```ts
const before = await repo.getShortReel(key);
const changed = structuredClone(validScript);
changed.segments[2].text_cues.find((cue) => cue.role === "answer")!.text = "Wrong answer";
await expect(
  repo.updateShortReel(
    key,
    {
      expected_revision: before.revision,
      request_id: "reject-answer-drift",
    },
    { kind: "update_script", script: changed },
  ),
).rejects.toMatchObject({ code: "INVALID_SCRIPT" });
expect(await repo.getShortReel(key)).toEqual(before);
```

The fixture must contain the answer cue before the mutation; assert fixture validity first. This test belongs at the repository boundary, not only the pure validator.

## Task A2: Atomic Replacement and Writer Safety

**Modify:** apps/server/src/repository/shortReelStorage.ts, shortReels.ts, service.ts, runtime.ts; apps/server/src/app.ts if lifecycle admission is owned there.

**Create:** apps/server/src/repository/shortReelAtomicWriter.ts, apps/server/test/shortReelAtomicWriter.test.ts, apps/server/test/shortReelWriterSafety.test.ts. A lock adapter path must be finalized and claimed only after Task 0's primitive decision.

**Interfaces:** Keep writeShortReelJsonAtomic(targetPath, record). Its dedicated adapter writes/flushes/closes a same-directory temporary file, retries rename within a bound, never copies over an existing target, and propagates exhaustion. Lock ownership is keyed by the canonical storage root, not the caller's alias. All mutation paths obey the chosen writer admission model; other instances must not bypass it through direct repository methods.

- [ ] Add a failing adapter test: inject EPERM for every rename; spy on copy; verify no copy call, old destination bytes unchanged, failure reported and temporary file cleanup bounded.
- [ ] Test write failure and rename failure separately; an interrupted write must never be returned as success. Do not globally change the legacy fs helper for unrelated workflows.
- [ ] Add process-level tests: two child processes target the same canonical root simultaneously. Under single-writer policy exactly one is admitted; the other gets a structured storage-busy error before mutation. Under an approved multi-writer policy exactly one same-revision mutation succeeds and one conflicts.
- [ ] Test alias/canonical path contention, normal owner release, abrupt owner termination and safe subsequent admission. Never steal a live lock merely because a heartbeat is delayed.
- [ ] Test overlapping identical channel/topic creates, normal process restart and recovery from failed creation. Assert one readable record and no fabricated successful result.
- [ ] Verify request replay behavior through a process restart. An identical replay must not execute the mutation again; changed payload with a reused request ID conflicts. Audit the current last-mutation-only receipt limitation and preserve enough durable receipt identity to honor the documented contract; record any retention limit for explicit review rather than silently forgetting requests.

Adapter fault assertion:

```ts
expect(copySpy).not.toHaveBeenCalled();
expect(await readFile(targetPath, "utf8")).toBe(previousBytes);
expect(result).toMatchObject({ status: "rejected" });
```

Use controlled barriers/child-process IPC, not arbitrary sleeps, for contention. Process tests must operate exclusively in test-owned temporary roots.

## Gate A: Release and Independent Contract Review

- [ ] Run all A tests, shared build/tests, typecheck, relevant existing repository tests, lint/format and zones. Run the actual fresh-process storage workflow after the final edit.
- [ ] Write new evidence: docs/short-reel-implementation/verification/evidence/phase-02-repair-01.md and docs/agent-coordination/handoffs/short-reel-phase-02-repair-01.md. Update progress without erasing historical failed evidence.
- [ ] Verify and release the implementation claim; no edits afterward. Record review required, not accepted.
- [ ] STOP and hand A to an independent reviewer or explicit user/integrator. Review must specifically address F03-08 and the exact schema/writer policy. B is ineligible until this approval and release are recorded.

SG-05/06/07 generation cancellation, stale-job acceptance and sibling-generation merge remain future Phase 04 work. Do not build a job runner during A or falsely label those tests passed. Existing repository edits still must preserve correct ready/stale state under the frozen contract.

## Task B1: Strict Topic Contracts and Real Confirmation Route

**Modify:** packages/shared/src/schemas/channel.ts and api/channel.ts; apps/server/src/routes/channels.ts and routes/shortReels.ts; apps/server/src/shortReel/topicConfirmation.ts; apps/web/src/api/channelApi.ts; affected topic producers/fixtures discovered through references.

**Create tests:** apps/server/test/shortReelRoutes.test.ts. Extend apps/server/test/topicConfirmRoute.test.ts and packages/shared/test/shortReel.test.ts.

**Interfaces:** Keep the existing confirm URL and response union. Parse IDs first, load channel/stored topic, then apply the matching body schema. A Short-Reel body permits optional request_id and question_count only as literal 1; current visual_style/auto_start_pipeline fields, if retained for the deployed client, must be typed, inert for reels and explicitly documented. Client content_kind never selects the route. Episode limits remain 3-50 and the existing Episode service remains separate.

- [ ] Add the actual HTTP card-payload regression before editing. Seed a valid stored reel topic and English bank record; assert 201, content_kind short_reel, one source, no Episode or submitted task, then GET list/detail and refresh/reopen.
- [ ] Add 404 cross-channel/missing ID, invalid body/request ID, conflicting count and forged discriminator tests. Return stable safe English codes/messages; never send provider stacks or absolute paths to clients.
- [ ] Remove the legacy TopicCandidateSchema preprocess. Missing content_kind/origin must fail the new boundary; update genuine producers and fixtures explicitly, without rewriting persisted history.
- [ ] Replace new z.any response fields with the current QuizV2/director-plan/curated-source contracts. Preserve public response compatibility; do not drop data just to satisfy strict typing.
- [ ] Make the route call a narrow use case after kind-specific validation. Update the web client to send the minimal reel request and avoid misleading Episode options. Keep the exact old card payload test if it remains part of the supported client boundary.
- [ ] Retain title-contains-shorts counterexample tests. Reconcile the two failing Episode pipeline defaults to landscape based on SR-01, while retaining explicit legacy portrait behaviors scheduled for Phase 07 unless the user separately approves removing them now.

```ts
const response = await app.server.inject({
  method: "POST",
  url: `/api/channels/${channel.channel_id}/topics/${reelTopic.topic_id}/confirm`,
  payload: { question_count: 1, visual_style: "mixed", auto_start_pipeline: true },
});
expect(response.statusCode).toBe(201);
expect(response.json().content_kind).toBe("short_reel");
expect(await app.repository.listShortReels(channel.channel_id)).toHaveLength(1);
expect(taskSubmitSpy).not.toHaveBeenCalled();
```

## Task B2: Eligibility, Translation Fidelity and Cooldown

**Modify:** apps/server/src/shortReel/questionSelection.ts. Consume A's reviewed source constructor rather than duplicating its logic.

**Create:** apps/server/src/shortReel/questionEligibility.ts, questionSuitability.ts; apps/server/test/shortReelQuestionEligibility.test.ts. Extend shortReelQuestionSelection.test.ts.

**Interfaces:** selectShortReelQuestion accepts a ShortReelTopicCandidate, not arbitrary TopicCandidate with a deep-trivia fallback. Its injected bank reader keeps queryQuestionBankQuestions. Eligibility returns a validated source candidate or a typed exclusion; scoring is pure and uses selected English text. Pagination stays bounded with stable ID tie-breaking.

- [ ] Test undefined, empty and unrecognized source language return no eligibility, with no bank mutation. Positive tests use explicit English or a complete verified English translation.
- [ ] Test duplicate, extra and missing translated IDs; wrong translation language; empty question/choice/explanation; unverified translation; source/correct-choice inconsistency. Do not rely on Map to reject duplicate keys.
- [ ] Call A's constructor only after eligibility succeeds; preserve original source and selected English text exactly. Never fall back to original-language explanation.
- [ ] Query with the channel context and honor existing Episode cooldown exclusions when available, as specification requires. Test cooled-down versus eligible candidates without recording publication cooldown for a newly selected draft.
- [ ] Test eligible item on page two, all pages ineligible, stable equal-score selection, max-page exhaustion and no hidden generation/translation or source mutation.

```ts
await expect(selectShortReelQuestion({ topic, repository: missingLanguageBank })).rejects.toMatchObject({ code: "BANK_EMPTY" });
await expect(selectShortReelQuestion({ topic, repository: duplicateTranslationBank })).rejects.toMatchObject({ code: "BANK_EMPTY" });
expect(await selectShortReelQuestion({ topic, repository: validEnglishBank })).toMatchObject({
  translation_provenance: "source",
  selected_answer_text: canonicalAnswer,
});
```

Fixture reader implementations return real schema-validated questions; a separate malformed-boundary fixture may deliberately exercise rejected untrusted input. No unchecked any casts in production or test mocks.

## Task B3: Durable Topic Selection Projection

**Modify:** apps/server/src/repository/topics.ts, service.ts, runtime.ts and bindings/topicBindings.ts; apps/server/src/shortReel/topicConfirmation.ts.

**Create:** apps/server/src/repository/topicSelectionProjection.ts; apps/server/test/shortReelConfirmationRecovery.test.ts.

**Interfaces:** Keep markTopicSelected(channelId, topicId, questionCount). Serialize the entire read-modify-write at the containing run/root boundary, not only by selected topic ID. Coordinate it with A's writer policy. confirmShortReelTopic returns the already persisted reel on replay and repairs incomplete projection before claiming confirmation success.

- [ ] Port the review's two-arrival barrier reproduction into a regression test. Concurrently select both reel topics in the same run; assert both remain selected after reopening.
- [ ] Separate malformed JSON handling from failed reads/writes; do not catch an operational write failure and continue as success. Surface a safe retryable projection failure while preserving the persisted reel.
- [ ] Inject failure after reel persistence but before projection. Close/reconstruct the application, retry the same request and assert the same reel ID/source, one record, selected projection repaired and no Episode side effects.
- [ ] Test concurrent same-topic confirmation, different-topic confirmation and selected-state refresh. Confirm failed retries do not erase user-visible accepted content.

```ts
await Promise.all([repo.markTopicSelected(channelId, firstTopicId, 1), repo.markTopicSelected(channelId, secondTopicId, 1)]);
const selectedIds = (await reopened.listTopics(channelId)).filter((topic) => topic.selected).map((topic) => topic.topic_id);
expect(selectedIds).toEqual(expect.arrayContaining([firstTopicId, secondTopicId]));
```

This assertion requires controlled overlap; a lucky sequential Promise.all run does not close F03-04. Use the original two-arrival write barrier only to reproduce the broken implementation. For the repaired path, defer the first write, start the second operation, assert that the second read-modify-write has not entered the protected section, then release the first write and await both. Never require two writers to enter a correctly exclusive section before releasing either: that test would deadlock the fix rather than verify it.

## Task B4: Validate the Assigned Mixed Slot Plan

**Modify:** apps/server/src/context/topicMatrixPlanner.ts, tasks/parsers.ts, tasks/handlers/textArtifactHandlers.ts and the owning generation retry boundary discovered before editing.

**Create:** apps/server/src/context/topicCandidateValidator.ts; apps/server/test/topicCandidateValidation.test.ts. Extend topicSuggestionMatrix.test.ts and shortReelQuestionSelection.test.ts.

**Interfaces:** Add validateTopicCandidateSlots(rawOutput, plan, channelId): TopicCandidate[]. The generation attempt carries its immutable TopicMatrixPlan through response validation. Slot kind/archetype/domain come from that plan; origin and keyword theme are assigned by the server only after checking conformity. The parser must not rewrite a conflicting concept into a different archetype.

- [ ] Fail tests for 3/4/6/7 candidates, five Episode concepts, wrong slot archetype/domain, blank fields, missing discriminator and inconsistent keyword guidance.
- [ ] Preserve exactly slots 1/4 as keyword-directed when a trimmed hint exists; the other three remain discovery. Without a hint all five are discovery. Server-owned origin is not trusted from the model.
- [ ] Use one bounded correction request at the existing provider adapter boundary, for at most two attempts total. Include field-level validation errors and the original slot plan. On repeated failure return a structured generation failure and leave previous accepted suggestions unchanged.
- [ ] Save only a fully validated 3:2 run. Keep parser extraction deterministic; external retries/provider errors must not enter shared/domain helpers.
- [ ] Add tests proving two invalid attempts terminate without a stuck task, a valid correction saves exactly once, and a late response from a retired attempt cannot replace the newer result.
- [ ] Record a human semantic relevance check for the keyword fixture. Structural checks do not prove meaningful creative integration; do not require naive exact-string keyword inclusion in every title.

```ts
expect(() => validateTopicCandidateSlots(allEpisodeOutput, mixedPlan, channelId)).toThrow();
expect(() => validateTopicCandidateSlots(wrongArchetypeOutput, mixedPlan, channelId)).toThrow();
const accepted = validateTopicCandidateSlots(validMixedOutput, mixedPlan, channelId);
expect(accepted.filter((topic) => topic.content_kind === "episode")).toHaveLength(3);
expect(accepted.filter((topic) => topic.origin === "keyword").map((topic) => topic.content_kind)).toEqual(["episode", "short_reel"]);
```

## Task B5: Recoverable Responsive Draft UI

**Modify:** apps/web/src/features/shortReel/ShortReelStudio.tsx, api/shortReelApi.ts, features/channel/hooks/useChannelDetail.ts, features/channel/components/TopicCard.tsx; existing AppViewRouter/ChannelView/router adapters only where required.

**Create:** apps/web/src/features/shortReel/hooks/useShortReelDraft.ts; components/ShortReelSourceCard.tsx; ShortReelStudio.css; ShortReelStudio.test.tsx. Extend TopicCard.test.tsx, AppViewRouter.test.tsx and hooks/router/hashCodec.test.ts.

**Interfaces:** useShortReelDraft(channelId, reelId) returns an explicit discriminated load state plus retry(). The API client accepts an optional AbortSignal using the existing request transport. Preserve existing notice callback contracts; keep notice callback identity from causing refetch loops.

### Interaction Plan

| Action/state                          | Immediate response                                | Completion/recovery                                                        |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Confirm topic                         | Pending button; block duplicate confirmation only | Navigate only after server confirmation; refresh affected topic/list cache |
| Empty bank                            | Keep topic and input visible                      | BANK_EMPTY inline/recoverable notice; no hidden generation                 |
| Open/reopen draft                     | Content skeleton                                  | Source summary on success; distinct not-found versus retryable error       |
| Retry read                            | Pending retry action                              | Preserve previously loaded content; settle loader on every terminal path   |
| Switch reel during read               | Abort/retire old request                          | Old response cannot overwrite new reel                                     |
| Reconnect/focus after external update | Quiet refresh where appropriate                   | Reconcile authoritative state; retain context, no F5 requirement           |
| Back to channel                       | Immediate navigation                              | Current selected state visible; no orphaned loading indicator              |

- [ ] Add failing component tests for delayed response, error -> retry, switching IDs with out-of-order completion, unmount, and back/reopen.
- [ ] Extract API effects/recovery into the hook. Render typed state in small components; do not add a generic state framework or duplicate server readiness rules.
- [ ] Use shrinkable grid tracks, wrapping header content and existing styles. Replace minmax(340px, 1fr) with a layout whose minimum can fit the container; ensure long IDs/titles wrap.
- [ ] Remove phase-number implementation promises and redundant badges; keep useful draft/source/selection information. All visible titles must lack trailing periods, including user/generated title presentation without mutating the stored source.
- [ ] Add accessible Retry and Back buttons, concise pending/error messages and reduced-motion behavior. Preserve the established footer without resolving the conflict implicitly.
- [ ] Replace new z.any/unchecked escapes and fix the two unused imports. No unrelated mass formatting or refactor.

## Task B6: Integrated Evidence, Scope Closure and Re-review

**Create:** apps/web/test/shortReelDraft.spec.ts; apps/web/playwright.short-reel.config.ts only if needed for an isolated harness; test fixtures under apps/web/test/helpers/shortReelFixture.ts and apps/server/test/helpers/shortReelFixture.ts. All new harness paths must be claimed before creation.

The current default Playwright config reuses servers at 2244/4310. Do not run this suite against unknown live services. Start test-owned isolated storage and provider stubs on free ports; point a dedicated config at those servers, disallow reuse and shut them down afterward. The config/harness change itself requires rerun. Browser automation must use Playwright/CDP, not OS input.

- [ ] Run a stubbed-provider but real HTTP/storage/UI flow: keyword suggestion -> five candidates -> confirm Short-Reel -> draft source display -> browser refresh -> server restart -> reopen -> retry failed read. Separately confirm an Episode and verify its landscape defaults and independent count rules.
- [ ] Assert the reel creates no Episode artifacts, no rendered/published history and no bank/cooldown mutation. Compare fixture source before/after.
- [ ] Exercise 1440, 390 and 320px with keyboard and touch emulation. Save screenshots to concretely claimed evidence paths, inspect them, and verify no horizontal overflow, clipped content or inaccessible essential controls.
- [ ] Run slow/error/empty/concurrent/reconnect scenarios; loaders stop, no stale response overwrites newer state and affected views update without F5.
- [ ] Map every F03 ID and TP/RP/SC requirement to a named test, command and observed result. Classify inherited failures separately, but do not mark failing required gates passed.
- [ ] Append an F03-10 scope correction, preserving original handoffs and release history. Explain current claim expansion and the original discrepancy; a new claim does not legalize old scope retrospectively.
- [ ] Write docs/short-reel-implementation/verification/evidence/phase-03-repair-01.md and docs/agent-coordination/handoffs/short-reel-phase-03-repair-01.md. Update progress to ready_for_review, not accepted, only when repaired implementation evidence is complete.
- [ ] Verify/release the implementation claim, stop editing, and give the user the reviewer prompt. A fresh reviewer writes a new numbered review rather than overwriting the original rejection.

### Verification Commands

Execute from the repository root. Confirm exit codes and test counts, not just command startup. Include any extra tests created during concrete scope discovery.

```powershell
pnpm --filter @studio/shared build
pnpm --filter @studio/shared test
node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts
pnpm --filter @studio/server exec vitest run test/shortReelRepository.test.ts test/shortReelSourcePersistence.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelRoutes.test.ts test/shortReelQuestionSelection.test.ts test/shortReelQuestionEligibility.test.ts test/shortReelConfirmationRecovery.test.ts test/topicCandidateValidation.test.ts test/topicSuggestionMatrix.test.ts test/topicConfirmRoute.test.ts test/topicToEpisodePipelineE2E.test.ts
pnpm --filter @studio/web exec vitest run src/features/shortReel/ShortReelStudio.test.tsx src/features/channel/components/TopicCard.test.tsx src/components/AppViewRouter.test.tsx src/hooks/router/hashCodec.test.ts
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @studio/server test
pnpm --filter @studio/web test
pnpm build
node scripts/agent-validate-zones.mjs --json
git diff --check
rg -n "short-reel-implementation" apps packages package.json
```

The final rg command is expected to have no matches (exit 1). It is not a runtime test. Run the isolated Playwright config after it is implemented and validated; record exact command, owned ports, fresh-process startup and artifact paths. Run all stage-specific tests before its own review gate rather than waiting until B6.

## Acceptance Checklist

- [ ] F03-01: actual one-question HTTP/UI confirmation succeeds; Episode validation remains independent
- [ ] F03-02/03: no invented English provenance, malformed translations rejected, immutable original snapshot preserved
- [ ] F03-04: overlapping selections both survive; failed projection is reported and restart retry repairs it
- [ ] F03-05/06: validated mixed plan, bounded correction and no silent legacy coercion
- [ ] F03-07: required pipeline/draft/browser tests executed and passing; no reduced-suite acceptance
- [ ] F03-08: independently reviewed source/persistence repair and demonstrated writer policy; future generation tests not falsely claimed
- [ ] F03-09: cohesive typed modules, static checks pass, reviewed responsive screenshots and recoverable UI
- [ ] F03-10: truthful scope ledger, exact authenticated claims, no historical authorization fabrication
- [ ] No live data changes, paid provider calls, Flow automation, portrait deletion or kit removal
- [ ] Implementation released, independent review pending/passed explicitly; final product acceptance reserved for the user

## Handoff Format and Stop Rules

Report the completed stage, exact changed files, red/green tests, primary workflow, unresolved findings, data/contract decisions, evidence/handoff links and verified release. Do not commit automatically. Do not stop at a successful build while a safe in-scope required test remains.

Stop for real missing authority: unsafe record migration/reset, absent supported writer primitive, unresolved footer decision that prevents delivery, denied claim expansion or a frozen contract change outside the admitted stage. Record the concrete decision needed and preserve the work. Do not convert such a blocker into a compatibility workaround.
