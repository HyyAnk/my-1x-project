# Phase 01: Portrait Inventory And Baseline

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Portrait Inventory And Baseline for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-11, SR-12, SR-13, SR-16.

**Prerequisite:** None; this is the first product phase.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Create an evidence-backed inventory, not a portrait removal implementation. Read all current callers because the repository has recently extracted render styles, mascot services and Sandbox hooks.

**Write scope:** `inventory/portrait-removal-manifest.md`, `inventory/generated-data-cleanup.md`, `file-map.md`, `decisions.md`, `progress.md`, this phase's evidence, and `docs/agent-coordination/handoffs/short-reel-phase-01.md`. All kit paths are relative to `docs/short-reel-implementation/`.

**Read scope:** shared schema/layout/mascot contracts, topic planner/confirmation, repository/bank, task pipeline, thumbnail adapter, render/Sandbox/Stage Studio, fixtures, scripts and generated products. No product deletion, provider calls or code edits.

## Work Slices

- [ ] Read current instructions/status and establish a documentation claim with the full concrete list.
- [ ] Use CodeGraph to trace topic confirmation through Episode creation and render ratio resolution. Record caller relationships and any title-based heuristic.
- [ ] Trace layout IDs through enum/catalog/schema, production render adapters, Sandbox presets and all UI ratio selectors. Search source/config/tests/scripts after graph discovery.
- [ ] Inspect newly extracted `layouts/styles/`, `layouts/portrait/styles/`, render mascot/sandbox helpers and web Sandbox hooks. Do not audit only the previous monolithic entry files.
- [ ] Populate one classified manifest row for each relevant path, including retained generic portrait media and bank visual hints. Record concrete regression tests for each affected boundary.
- [ ] Inventory obsolete development products read-only. Resolve reusable mascot/style dependencies and active task references. Do not infer that all channel products are disposable.
- [ ] Inspect existing task event/cancellation registration, repository serialization and app navigation. Document exact symbols, current arguments and file paths in file-map.
- [ ] Check multiple-writer assumptions and current bank lookup pagination. Record the need for bounded pagination rather than assuming the current first-10,000 lookup is complete.
- [ ] Run the baseline commands below and classify failures as existing, environment-related or newly caused. This phase must not repair unrelated failures.
- [ ] Prepare the new server application zone proposal through the existing coordination change-request process if coverage is missing. Obtain a separate concrete claim for any change-request artifact; do not edit zone definitions without integrator approval.
- [ ] Refresh the later phases' concrete integration path map where files moved, without changing product scope. Record version/revision and unresolved review points.
- [ ] Write evidence and handoff, self-review manifest completeness, verify/release the documentation claim.

## Baseline Commands

Run from repository root: `pnpm typecheck`, `pnpm --filter @studio/server test -- test/topicSuggestionMatrix.test.ts test/topicConfirmRoute.test.ts test/topicToEpisodePipelineE2E.test.ts`, `pnpm --filter @studio/web test -- src/features/sandbox`, `node scripts/agent-validate-zones.mjs --json`. Also run existing shared layout tests and the targeted render test discovered for each portrait dispatcher. Inspect test scripts before assuming positional filtering is honored.

Record exact counts and exit codes. For read-only runtime verification use an already-running app or isolated test data; do not generate paid media or mutate user products.

## Acceptance And Stop Conditions

Every portrait match has a disposition, every removal has reverse dependencies, and protected data has a clear retention rule. Record an actual zero when no obsolete data exists. No compatibility migration is planned.

Stop before product work if the zone proposal needs integrator approval. Phase 01 can hand off a completed inventory while recording that Phase 03 application-file creation remains blocked on approval. Do not mark an unexecuted baseline test passed.

**Reviewer checks:** search coverage, fresh baseline, extracted modules, exact path containment, zone proposal and no deletions. Next prompt: Phase 02 after review.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-01-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-01.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
