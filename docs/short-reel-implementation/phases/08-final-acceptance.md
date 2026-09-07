# Phase 08: Integration And Final Acceptance

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Integration And Final Acceptance for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: All SR-01 through SR-16.

**Prerequisite:** Phase 07 reviewed and released with deletion evidence and protected-data checks.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Prove the integrated product meets the specification. Do not turn final QA into unbounded new feature work. Claim only evidence and concrete defect-fix files approved within the relevant responsibility.

## Work Slices

- [ ] Review Phase 07 release and actual code/data inventory. Check every prior phase is reviewed with evidence and no unresolved blocking finding.
- [ ] Fill acceptance-matrix actual evidence links without treating planned tests as executed tests. Confirm production/test code does not depend on this temporary folder.
- [ ] Run lint, format, typecheck, shared contract test, server/web tests, build, E2E, visual regression and zone validation on the current integrated code. Use the command matrix below.
- [ ] Restart/rebuild affected processes. Execute both a fresh Episode workflow and complete Short-Reel preparation workflow with current configuration; record server/web revision/ports and exact sample records.
- [ ] Verify success, slow response, empty bank, provider failure/retry, cancellation, restart interruption, reconnect, stale save, sibling completions and concurrent update cases. Check no pending state stays stuck.
- [ ] Audit desktop/mobile strings, focus/touch behavior, reduced motion, text fitting and retained footer handling. Capture current screenshots; do not reuse old images as current proof.
- [ ] Review export archive contents and render/reference dimensions. Verify no deleted test product is listed and protected reusable data remains readable.
- [ ] Follow manual-flow-checklist with the user for one actual question of each supported archetype. The user performs generation and extensions. Record requested/observed text, duration, continuity, reference adherence and any retries.
- [ ] If user/Flow access is not available, set awaiting_user_acceptance with manual evidence outstanding. Do not fabricate a successful generation, model capability or user sign-off.
- [ ] For defects, record findings with reproduction. Repair only after ownership/contract scope is clear and rerun affected checks plus integration regression. Do not waive a failing requirement merely to finish.
- [ ] Write final evidence, unresolved limitations and phase handoff. Verify/release the claim; ask the user for acceptance based on evidence. Never delete/archive this folder.

## Command Matrix

Run from root:

- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm --filter @studio/shared exec node --import tsx --test test/shortReel.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm test:visual`
- `node scripts/agent-validate-zones.mjs --json`

Inspect scripts/config first. If a command changes or targeted shared tests were added, record the exact replacement and run it. Do not omit new tests because the old default shared script discovers only layout tests.

## Acceptance And Stop Conditions

Every acceptance ID has real passing evidence or an explicitly unresolved status. There are no unresolved correctness/data-safety/critical workflow defects. Technical acceptance alone leaves final user acceptance pending.

If Flow output duration differs from the intended profile, record actual behavior and request a user-approved creative adjustment; do not silently add segments or change providers. The user alone accepts final output and later deletes the folder. Final response must distinguish product checks, manual footage review and user acceptance.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-08-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-08.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
