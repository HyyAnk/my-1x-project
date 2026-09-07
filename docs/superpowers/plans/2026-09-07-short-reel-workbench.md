# Short-Reel Workbench Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement sequentially with review checkpoints. Do not dispatch agents without user authorization. Steps use checkbox syntax for tracking.

**Goal:** Replace legacy portrait quiz production with a manual-Flow Short-Reel preparation workflow while retaining landscape Episodes.

**Architecture:** Separate Episode and Short-Reel domain records and workflows. Share Question Bank, channel identity, existing LLM/image clients and storage primitives, not Episode rendering or stage placement. Compile a structured three-segment story into three human-operated Flow prompts.

**Tech Stack:** Existing TypeScript, Zod, Fastify, React, filesystem repository, Vitest, Node test runner and Playwright. No new production dependency is assumed.

**Spec:** The approved requirements below supersede conflicting statements in `D:/short_reel_concept_specification.md`, as clarified by the user in this task on 2026-09-07. This document is the repository-local design and implementation reference.

## Approved Requirements

- Episodes are exclusively 16:9. Short-Reels are exclusively 9:16 and use exactly one existing Question Bank question of archetype `versus_faceoff` or `deep_trivia`.
- Suggest exactly five topics: three Episodes and two Short-Reels. With a keyword, one candidate in each pillar incorporates it; other candidates explore channel DNA.
- Produce exactly three consecutive script segments: initial generation, extension, extension. Target 8-10 seconds per segment and 24-30 seconds total.
- Treat duration as creative intent, not a verified Flow capability or guaranteed generated runtime. Default to 8/8/8 seconds; allow editing within the target range. Export local timing for each segment and derived cumulative timing.
- The user manually operates https://flow.google.com/ with their reported model label `Omni 1.1 Flash`, mascot reference, style reference and prompts. The public page only exposed sign-in during planning; model availability and extension increments were not independently verified. Store a user-editable model note, not an API model ID.
- Prompts request in-video question and answer text with explicit timing. No post-production text compositor, automatic video generation, encoding, TTS or audio muxing in this MVP.
- User performs final script/video review and publication. Software validates package structure and source consistency; it cannot certify generated pixels, text timing or actual footage quality.
- Four deliverable groups: mascot/style reference assets; three-part script and prompts; 1080x1920 cover; hook/description/CTA/hashtags. Do not claim hashtags are trending without a source.
- Use the channel's cinematic stylized 3D direction and reference assets. Do not treat a style name as a safety guarantee or a reference image as an identity lock.
- Fully remove legacy portrait quiz layout, rendering, stage calibration and Sandbox modes. No compatibility layer or legacy playback is required. Only identified obsolete test products may be deleted; preserve Question Bank, channels, mascot/style references and unrelated work.

## Global Constraints

- Planning only in this task; implementation requires a separate user go-ahead. Work on current main, no branches/worktrees, no unsolicited commits.
- Before each implementation claim read coordination source documents, capture dirty baseline, claim concrete paths and required zones. Expand successfully before adding paths; verify, hand off and release each phase.
- Planning baseline contained 46 dirty paths, including active-looking landscape standardization changes. Preserve them; refresh baseline at execution and integrate overlapping work deliberately.
- All new repository content and UI copy must be English. The earlier footer-credit instruction conflicts with the later strict English-only rule; reuse the existing footer without changing its copy and obtain a decision before introducing a new conflicting credit string.
- Thin UI/routes, dedicated services and repositories, explicit shared contracts, bounded failures and no hidden mutable workflow singleton.
- Never globally replace `9:16`: Short-Reel covers and references still require portrait media support.

## Current Integration Findings

- `apps/server/src/context/topicMatrixPlanner.ts` currently selects five archetype/layout slots with portrait alternatives. Replace this with a mixed-pillar topic policy, not a portrait variant of quiz layout selection.
- `apps/server/src/repository/topics.ts` currently confirms into an Episode and infers portrait from a title containing `shorts`. Remove that heuristic; route by an explicit discriminator.
- `apps/server/src/routes/channels.ts` uses the Question Bank bridge for Episode creation and initializes both mascot stage ratios. Keep the Episode bridge separate from Short-Reel allocation.
- `packages/shared/src/schemas/channel.ts` owns TopicCandidateSchema; `packages/shared/src/api/channel.ts` owns suggestion/confirmation input. Add discriminated contracts rather than weakening Episode question-count validation to admit one.
- Reuse bank access from `apps/server/src/repository/quiz/questionBankRepository.ts` and storage primitives from the existing repository. Thumbnail service entry is `apps/server/src/quiz/thumbnail/thumbnailService.ts`; extract only an actually reusable boundary if it assumes an Episode.
- Shared test script currently runs only quiz layout tests. Explicitly run new contract tests; do not assume the default script discovers them.

## Interaction And State Plan

1. Suggest topics: immediate pending acknowledgement; preserve previous results while loading. Validate 3:2 server-side and reject malformed output. Retry keeps the keyword. Selecting a card routes by content kind, never its title.
2. Create Short-Reel: select one eligible bank question, snapshot its ID and source content. Empty bank matches return a recoverable empty state; never invent a replacement question or create an Episode.
3. Generate package: acknowledge task submission, show named stages and per-deliverable status. Use existing task/event machinery where compatible, with scoped refetch after reconnect. No invented percentage.
4. Review: three numbered segment tabs, editable narrative/text cues and compiled prompt preview; separate assets and publishing tabs. Save explicitly with pending/saved/error state. Keep unsaved edits on failure.
5. Revision: changes to question invalidate the entire creative package. Editing segment 1 marks segments 2-3 stale; editing segment 2 marks segment 3 stale. Preserve old content for comparison; never silently overwrite user edits.
6. Export: copy each prompt with immediate acknowledgement and failure fallback; download validated assets and production text. Missing/stale required deliverables prevent a ready package. Export does not mark video complete.
7. Concurrency: revision-based writes return conflict on stale edits. Generation results carry input revision and operation ID; discard late results after cancellation/revision changes. Retry only failed components; deduplicate repeated submissions.
8. Desktop uses concise multi-column reference/review layout; mobile uses stacked content and three segment tabs. Keyboard/touch access, reduced motion, no title periods, no redundant helper copy. Reuse existing footer subject to the language conflict above.

## Contract Shape

Create `packages/shared/src/shortReel/shortReel.types.ts` and `shortReel.schema.ts`; export through `packages/shared/src/index.ts`. Use Zod validation and inferred public DTOs in actual implementation.

```ts
type ReelArchetype = "versus_faceoff" | "deep_trivia";
type DeliverableStatus = "missing" | "pending" | "ready" | "stale" | "failed";
type TextCue = { text: string; startSeconds: number; endSeconds: number };
type Continuity = {
  character: string;
  position: string;
  action: string;
  camera: string;
  environment: string;
  visibleText: string[];
};
type ReelSegment = {
  index: 1 | 2 | 3;
  mode: "generate" | "extend";
  durationSeconds: number;
  narrative: string;
  textCues: TextCue[];
  audioDirection: string;
  startState: Continuity;
  endState: Continuity;
};
```

The record stores channel/topic IDs, immutable bank snapshot, revision, exactly three segments, reference asset IDs, model note and independent deliverable states. Reuse the existing bank question schema for the snapshot rather than duplicating its answer representation. Add exact validation for 1/generate, 2/extend, 3/extend; finite durations; 0 <= cue start < cue end <= duration; non-empty question and answer coverage; supported archetype. Prompts and cumulative timing are derived from structured content, not a second editable source of truth.

## Task 1: Inventory And Removal Manifest

**Files:** Create `docs/short-reel/portrait-removal-manifest.md`. Inspect existing shared layout catalog/policy/types, Episode schemas, topic planner/repository, mascot contracts, Sandbox, stage settings, render adapters/layouts and tests. This task does not delete product files.

- [ ] Use CodeGraph first to trace portrait consumers, then `rg -n '9:16|9x16|portrait_|isPortrait' apps packages scripts` to catch configuration, fixtures and scripts.
- [ ] Record every affected concrete path as remove, narrow-to-landscape, retain-for-short-reel, or retain-generic-media, with dependents and tests. Expand the later task file lists from this manifest before claiming; no wildcard claims.
- [ ] Inventory obsolete generated products by resolved absolute path and record ID; exclude reusable assets and Question Bank. Separate record deletion from source removal.
- [ ] Record baseline test results and overlapping dirty files. Review the manifest before any destructive work.

**Exit:** Every legacy portrait path has an explicit disposition; no assumption that a global text replacement is safe.

## Task 2: Contracts And Persistence

**Create:** shared shortReel files above; `packages/shared/test/shortReel.test.ts`; `apps/server/src/repository/shortReels.ts`; `apps/server/test/shortReelRepository.test.ts`.
**Modify:** shared index, repository `types.ts`, `service.ts` and bindings only as required by current composition pattern. Register every concrete path in claims. New application modules proposed below need a dedicated zone before creation.

**Interfaces:** Repository exposes create/get/list/save Short-Reel with expected revision; creation is idempotent for a channel/topic/request key. Store under the resolved channel directory in `short-reels/<id>/`, not `episodes/`.

- [ ] Write failing schema cases for 0/2/4 segments, unsupported archetype, invalid cue bounds, wrong segment mode and nonfinite duration.
- [ ] Run `pnpm --filter @studio/shared exec node --import tsx --test test/shortReel.test.ts` and confirm failures before implementing.
- [ ] Implement schemas and source snapshot validation. Test a question with exactly one canonical answer remains unchanged through save/load.
- [ ] Write repository tests for round-trip, cross-channel access rejection, path traversal rejection, duplicate creation, revision conflict and interrupted-write recovery.
- [ ] Implement atomic writes using repository primitives and an explicit serialized compare-and-write boundary. Run `pnpm --filter @studio/server test -- test/shortReelRepository.test.ts`.

**Exit:** New records are separate from Episodes, validated and revision-safe. No legacy reader is introduced.

## Task 3: Mixed Topics And Bank Allocation

**Modify:** `packages/shared/src/schemas/channel.ts`, `packages/shared/src/api/channel.ts`, `apps/server/src/context/topicMatrixPlanner.ts`, `apps/server/src/repository/topics.ts`, `apps/server/src/routes/channels.ts`, channel TopicCard/ChannelTopicsTab consumers.
**Create:** `apps/server/src/shortReel/questionSelection.ts`, `apps/server/test/shortReelQuestionSelection.test.ts`.
**Tests:** existing `topicSuggestionMatrix.test.ts`, `topicConfirmRoute.test.ts`, `topicToEpisodePipelineE2E.test.ts`.

**Interfaces:** Topic candidate is discriminated by `content_kind: "episode" | "short_reel"`; only Episode candidates have a quiz layout. Short-Reel confirmation returns a Short-Reel record, not an Episode-shaped substitute.

- [ ] Add failing tests asserting five candidates, 3:2 split, keyword allocation of one per pillar, and only supported Short-Reel archetypes.
- [ ] Test that a landscape topic whose title contains `shorts` still creates a landscape Episode; a Short-Reel topic without that word creates no Episode.
- [ ] Implement server validation and a focused allocation service using existing bank queries and approval/eligibility semantics. Snapshot the selected question; do not regenerate or modify the bank.
- [ ] Test empty matches, missing selected question, cross-channel requests and duplicate confirmation. Return structured recoverable errors.
- [ ] Run the three existing topic tests and new selection tests; verify Episode question-count policy is unchanged.

**Exit:** Both topic kinds route correctly and the Short-Reel has one traceable source question.

## Task 4: Three-Segment Creative Generation

**Create:** `apps/server/src/shortReel/scriptService.ts`, `scriptPrompt.ts`, `flowPromptCompiler.ts`, `revisionPolicy.ts`; matching `apps/server/test/shortReelScript.test.ts`, `shortReelPrompt.test.ts`, `shortReelRevision.test.ts`.

**Interfaces:** Script service consumes topic, bank snapshot, channel style and references through injected existing LLM client; returns validated three-segment content. `compileFlowPrompts` consumes validated segments plus reference instructions and returns an exact three-string tuple. `revisionPolicy` derives stale dependents from edited segment index.

- [ ] Write tests using a stub LLM: accepted valid response, malformed JSON, answer drift, missing text cues, four segments, timeout and cancellation.
- [ ] Implement one bounded correction attempt for schema-invalid output; surface structured failure after it, retaining the last accepted content. No infinite creative retries.
- [ ] Compile segment 1 as initial generation; compile segments 2/3 as continuation from the preceding end state. Include exact text, local timing, explicit removal/retention across boundaries and no premature answer reveal.
- [ ] Test answer text against canonical source data; flag semantic rewrites for human review rather than claiming machine proof of meaning.
- [ ] Test downstream stale marking, explicit regeneration and late-result rejection after user edits. Audio is prompt direction only, with no TTS job submission.
- [ ] Run the three new server test files.

**Exit:** Three copyable prompts communicate continuous action, exact requested text and intended timing without asserting output guarantees.

## Task 5: References, Cover And Export

**Create:** `apps/server/src/shortReel/packageService.ts`, `referenceResolver.ts`, `publishingService.ts`, `exportService.ts`; `apps/server/test/shortReelPackage.test.ts`.
**Inspect/reuse:** existing thumbnailService, thumbnail contracts, media provider clients and zip helper. Modify only the extracted reusable thumbnail boundary when an Episode assumption blocks integration.

- [ ] Test missing mascot/style image, inaccessible reference path, cover failure, retry after partial success and stale export rejection.
- [ ] Resolve actual single-frame reference images, not sprite atlases; validate image bytes and usable dimensions. Preserve channel originals and record asset identity/revision.
- [ ] Generate a 1080x1920 cover consistent with the selected topic/style; keep generic portrait thumbnail capabilities during cleanup.
- [ ] Export manifest, script, three numbered prompt text files, references, cover and publishing copy. Avoid duplicate asset filenames and reject unsafe paths.
- [ ] Test that retrying a failed cover does not overwrite approved script; validate archive contents and cover dimensions. Run the package test and existing thumbnail tests.

**Exit:** All four deliverable groups are downloadable; missing components are explicit, not silently omitted.

## Task 6: Routes, Jobs And Studio

**Create:** `apps/server/src/routes/shortReels.ts`; `apps/web/src/api/shortReels.ts`; `apps/web/src/features/shortReel/ShortReelStudio.tsx`; feature `components/SegmentEditor.tsx`, `components/ReelAssets.tsx`, `components/PublishingPanel.tsx`, `hooks/useShortReel.ts`; corresponding route/hook/component tests.
**Modify:** `apps/server/src/app.ts`, app navigation/state owners discovered from topic selection, and existing task registration only after concrete dependency tracing. Do not add Short-Reel render stages to useEpisodePipeline.

**Interfaces:** Channel-scoped list/create/get/update/generate/export routes. Mutations require expected revision and request key; background results include input revision and job ID. Web API adapter translates structured errors; hooks own requests and reconciliation.

- [ ] Add route tests for validation, nonexistent channel/record, conflict, duplicate submission and cancelled generation. Implement thin route translation into services.
- [ ] Use existing task manager and event conventions; add required task contracts under exclusive claims. Limit task scope to package generation and do not infer external Flow progress.
- [ ] Implement the interaction/state plan above. Group secondary regenerate/export actions; use existing icons and accessible tooltips only where needed.
- [ ] Test slow success, empty content, failure/retry, reconnect, stale responses, double-click, user edits during generation and route changes during pending work.
- [ ] Run server route tests, web tests and web build. Restart affected processes before exercising topic -> studio -> edit -> export on desktop and mobile.

**Exit:** A user can complete preparation without refresh; pending/stale/error states preserve work and never claim a finished video.

## Task 7: Controlled Portrait Retirement

**Seed paths:** `packages/shared/src/quizLayouts.catalog.ts`, `quizLayouts.policy.ts`, `quizLayouts.types.ts`, `schemas/episode.ts`; server portrait layout files `portraitHeroChoices.ts`, `portraitSplitVersus.ts`, `portraitStackList.ts`, `portraitVerdictTf.ts`; Sandbox and mascot-stage consumers identified in Task 1. The reviewed removal manifest is the authoritative complete file list.

- [ ] Add rejection tests for legacy Episode portrait settings and assertions that Episode/Stage/Sandbox expose landscape only.
- [ ] Remove legacy portrait render registrations and layouts; narrow Episode/stage-specific contracts, settings and defaults. Preserve generic image ratios and Short-Reel contracts.
- [ ] Replace obsolete portrait tests with explicit rejection tests and retain landscape visual regression coverage. Never mass-update landscape snapshots to hide a regression.
- [ ] Remove title-based aspect inference and stale fixtures/docs. Audit remaining portrait references against the retained-use allowlist.
- [ ] Execute generated-data cleanup only against reviewed exact paths/IDs after containment checks. Record removed items; no broad directory deletion or Question Bank reset. Stop if a candidate contains reusable assets not captured in the manifest.
- [ ] Run targeted contract/render/mascot/Sandbox tests, full typecheck and zone coverage validation. Exercise a fresh 16:9 Episode and a Short-Reel package with restarted processes.

**Exit:** No reachable legacy portrait quiz workflow; new portrait media works; test products need no compatibility layer.

## Task 8: Integration And Human Flow Acceptance

- [ ] Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` and `pnpm test:visual`. Explicitly run the new shared contract test command from Task 2.
- [ ] Run `node scripts/agent-validate-zones.mjs --json`; ensure new shortReel server modules have exactly one zone. Add that focused zone in an approved coordination change before creating those product files.
- [ ] Audit desktop/mobile strings, keyboard/touch actions, status synchronization and reduced-motion behavior. Capture screenshots of ready, empty and failed Studio states.
- [ ] With the user, test one real question per supported archetype in Flow: initial prompt, two extensions, references, visible question/answer, continuity and actual duration. Record requested versus observed timing and revision notes; do not auto-submit or publish.
- [ ] If Flow produces a different extension duration, adjust the editable creative duration profile and revalidate the three-part plan rather than falsifying completion. No new provider API is required.
- [ ] Produce phase handoff listing checks and limitations, verify claim, release without subsequent edits. Commit only if requested and the integrator gate is clear.

**Acceptance:** Preparation workflow works end-to-end; manual Flow validation is explicitly passed or outstanding. A package-ready badge is never evidence that footage has passed human review.

## Plan Review

- Covered original 3:2 topic allocation, keyword distribution, bank filtering, references, cinematic direction, cover and publishing bundle.
- Incorporated later corrections: in-video text, three consecutive segments, manual Flow operation and no legacy compatibility.
- No Flow automation, synthetic performance guarantees, automatic publishing or product deletion is authorized by this planning document alone.
- Complete removal scope is deliberately established by Task 1 before destructive work; seed paths are not represented as an exhaustive dependency audit.
