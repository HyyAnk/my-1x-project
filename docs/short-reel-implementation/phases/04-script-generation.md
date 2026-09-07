# Phase 04: Three-Segment Script Generation

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Three-Segment Script Generation for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-03, SR-04, SR-05, SR-08, SR-09, SR-10, SR-14.

**Prerequisite:** Phase 03 reviewed and released; source snapshots and draft records exist.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Create a validated story and deterministic Flow prompts. No Flow integration, generated footage or post-production compositor.

**Create:** `apps/server/src/shortReel/scriptService.ts`, `scriptPrompt.ts`, `flowPromptCompiler.ts`, `revisionPolicy.ts`; server tests `shortReelScript.test.ts`, `shortReelPrompt.test.ts`, `shortReelRevision.test.ts`. Reuse the existing LLM adapter and frozen contracts.

## Work Slices

- [ ] Review Phase 03; add tests SG-01 through SG-07 with a stub LLM and controlled deferred results.
- [ ] Build the creative prompt from topic, source snapshot, channel art direction and named mascot/style references. Delimit source text as data so an embedded instruction cannot override the schema/source rules.
- [ ] Request exactly three segment objects with question/action, continuation/prediction, answer/explanation. Do not expand into a mandatory many-shot storyboard.
- [ ] Parse and validate output with public schemas and source fidelity checks. Allow at most one schema-correction attempt. Bound timeout and propagate AbortSignal through the existing adapter.
- [ ] Implement deterministic compilation with local segment seconds, duration target, exact text cues and boundary-state handoff. Prompt 1 uses initial generation; 2 and 3 continue, not restart.
- [ ] Ensure text is requested in footage; prohibit the obsolete no-text instruction. Include requested text clearing/continuation explicitly across boundaries. Avoid promising exact rendering/timing.
- [ ] Preserve source question/answer; explanatory embellishment cannot redefine the fact. Mark creative drafts for human review without blocking schema-valid draft storage on a claimed semantic proof.
- [ ] Implement dependency invalidation. Segment 1 changes mark 2/3 stale; segment 2 changes mark 3 stale. Old payload stays available; regenerate only after explicit action.
- [ ] Test cancellation against completion, editing during generation, and same-key newer attempts. Merge valid unrelated sibling results; discard stale target results using operation ID and dependency fingerprint.
- [ ] Execute the service and compiler through a filesystem-backed draft fixture with the injected fake LLM. Verify persisted/reloaded content and all three prompt files/projections.
- [ ] Run tests and typecheck; review prompt/source boundaries and evidence; hand off and release.

## Verification

`pnpm --filter @studio/server test -- test/shortReelScript.test.ts test/shortReelPrompt.test.ts test/shortReelRevision.test.ts`

Run explicit shared contract tests and `pnpm typecheck`. Record fake-provider integration as such; do not call it a successful Flow generation. A live configured LLM smoke run is optional and requires existing safe local configuration, not new credentials.

## Acceptance And Stop Conditions

Three continuous prompt strings derive from the exact saved structured script; source/text is intact; stale/cancelled work cannot overwrite edits. Prompt output is a generation request, not proof of actual video fidelity. Missing references may keep the package unready but must not trigger fabrication of a mascot asset.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-04-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-04.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
