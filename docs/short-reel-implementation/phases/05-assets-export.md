# Phase 05: References, Cover And Export

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** References, Cover And Export for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-07, SR-09, SR-10, SR-12, SR-13, SR-14.

**Prerequisite:** Phase 04 reviewed and released; script/compiler and revision policy are stable.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Produce four complete deliverable groups with safe partial retry and consistent export.

**Create:** `apps/server/src/shortReel/packageService.ts`, `referenceResolver.ts`, `thumbnailAdapter.ts`, `publishingService.ts`, `exportService.ts`; `apps/server/test/shortReelPackage.test.ts`.

**Inspect/reuse:** `apps/server/src/quiz/thumbnail/thumbnailService.ts`, existing image/thumbnail contracts, media clients, zip helper and repository asset resolution. Extract a focused generic boundary only where an Episode assumption actually blocks reuse; no dummy Episode.

## Work Slices

- [ ] Review Phase 04 and add failing PK-01 through PK-06 tests with real image bytes and an isolated asset root.
- [ ] Resolve two actual reference images by role. Validate signatures, decoded dimensions and configured byte/pixel limits using existing image tooling. An animation atlas is not a usable single-frame reference.
- [ ] Use existing user-assigned/selected mascot and style assets. Missing images return a recoverable state; never select an unrelated image silently.
- [ ] Copy or reference immutable revisioned assets without modifying originals; store checksums/provenance. Do not fetch arbitrary client-supplied remote URLs.
- [ ] Adapt thumbnail input to the source/topic/style and generate a true 1080x1920 cover. Do not stretch a landscape image or reuse a landscape template without review.
- [ ] Generate concise publishing copy from the source and story. Keep hashtags as suggestions, not verified trends; avoid style-based policy guarantees.
- [ ] Implement per-unit acceptance and failure records. Cover failure retains valid script/publishing; a retry of cover affects only its dependencies and export readiness.
- [ ] Build a ZIP from one validated record revision: manifest.json, script.json, script.md, prompts/01-generate.txt, 02-extend.txt, 03-extend.txt, references/mascot image, references/style image, cover image, publishing.txt. Use decoded MIME-consistent extensions.
- [ ] Validate archive entry names, no traversal/absolute paths, duplicate names, stale outputs or secrets. Manifest records content hashes, source ID, script revision, dimensions and requested durations.
- [ ] Test export racing with edit: either export an internally consistent requested snapshot or return revision conflict. Never mix prompts from one revision with a cover/reference from another.
- [ ] Run a full package fixture through storage, generation stubs, ZIP extraction and image decoding. Record precisely what was mocked.
- [ ] Run tests, existing thumbnail regression checks and typecheck; hand off and release.

## Verification

`pnpm --filter @studio/server test -- test/shortReelPackage.test.ts test/thumbnailService.test.ts test/thumbnailPromptEngine.test.ts`

Verify the actual discovered existing test filenames before execution and record any renamed equivalent. Run `pnpm typecheck` and zone validation after extracted/new files.

## Acceptance And Stop Conditions

Four groups are present and current; reference identity and dimensions verified; failures are explicit; retries preserve approved work. No export claims final video readiness. Missing image provider access blocks only live provider validation, not a falsely reported passing real cover generation.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-05-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-05.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
