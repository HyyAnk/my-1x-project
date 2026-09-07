# Phase 02: Contracts And Storage

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Contracts And Storage for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-01, SR-03, SR-04, SR-05, SR-08, SR-09, SR-10, SR-16.

**Prerequisite:** Phase 01 reviewed; inventory and storage/nav/task findings available.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Freeze the public Short-Reel contract and implement channel-contained persistence without touching Episode generation behavior.

**Create:** `packages/shared/src/shortReel/shortReel.schema.ts`, `shortReel.types.ts`, `shortReel.api.ts`; `packages/shared/test/shortReel.test.ts`; `apps/server/src/repository/shortReels.ts`, `shortReelStorage.ts`, `bindings/shortReelBindings.ts`; `apps/server/test/shortReelRepository.test.ts`.

**Modify:** exact shared index/repository facade/type/binding files found in Phase 01; `contracts.md` and evidence docs. New application-zone registration is handled only with integrator authority, not by bypassing validation.

**Interfaces:** all record/script/DTO/repository boundaries in contracts.md. Do not activate the TopicCandidate union before all of its consumers can be updated together in Phase 03.

## Work Slices

- [ ] Review Phase 01 and claim shared-contracts, artifact-contracts, server-tests and documentation paths as required.
- [ ] Add test fixtures using the real BankQuestionSchema; keep deep-trivia three choices and versus two. Explicitly test draft-without-script separately from invalid empty script.
- [ ] Add failing schema tests SC-01 through SC-06 from test-cases. Run the explicit shared test command below and confirm intended failures.
- [ ] Implement strict schemas, exact segment tuple/modes, source snapshot provenance, cue bounds and canonical answer resolution. Avoid duplicate source answer fields.
- [ ] Define edit commands as a discriminated union; do not expose an unrestricted Partial<Record> patch. Freeze implementation names and exported signatures in contracts.md.
- [ ] Write repository tests RP-01 through RP-06 before implementation. Include concurrent same-revision writes, replay after repository restart and cross-channel lookup.
- [ ] Implement atomic serialized compare-and-write, server-derived paths and topic idempotency. Make lock ownership explicit at composition. Protect shared roots from multi-process writes according to the verified architecture.
- [ ] Inject failure between temporary write and rename; demonstrate the previous valid record remains readable. Reconcile interrupted creation without marking the topic selected prematurely.
- [ ] Verify that creating/saving a Short-Reel never creates an Episode folder, submits a render or mutates the bank.
- [ ] Run repository round-trip through the actual filesystem adapter in a temporary isolated root, then restart/reopen it and read the same record.
- [ ] Run contracts/repository tests, typecheck and required zone checks. Review source snapshot/input boundaries and explicit error mapping.
- [ ] Record final contract version, concurrency guarantees and limitations; write handoff and release.

## Verification

`pnpm --filter @studio/shared exec node --import tsx --test test/shortReel.test.ts`

`pnpm --filter @studio/server test -- test/shortReelRepository.test.ts test/repository.test.ts`

`pnpm typecheck` and `node scripts/agent-validate-zones.mjs --json`.

## Acceptance And Stop Conditions

A valid draft and generated record survive restart; only one of two conflicting writes succeeds; idempotent creation survives retries; one channel cannot address another channel's reel; source remains intact.

Stop if current storage primitives cannot provide the promised concurrency guarantees. Do not pass by testing only sequential calls. Contract review is mandatory before Phase 03. Public changes after this gate require a recorded contract revision and updated consumer tests.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-02-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-02.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
