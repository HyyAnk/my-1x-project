# Bank-First Topic Upgrade Implementation Plan

> Execute with subagent-driven development. The root conversation is the coordinator; implementation and review workers use `gpt-5.6-luna` as explicitly requested by the user. Repository main-direct and authenticated claims override skill branch/commit/scratch-cleanup defaults.

**Goal:** Make every new topic suggestion grounded in currently eligible English Bank questions, then localize only permitted audience-facing product fields for the channel language.

**Architecture:** Use an immutable English Bank source boundary, source-first Topic allocation, safe bound confirmation, and product-owned localization. Separate localization from Bank persistence so quiz display strings, video description, and thumbnail text can follow the channel language while UI, Topic, scripts, prompts, and source content remain English.

**Tech Stack:** Existing TypeScript, Zod, Fastify, React, Vitest, Node test runner and Playwright.

**Spec:** [Approved design](design.md)

## Global Constraints

- Work on current main; no commits, pushes, branches or worktrees.
- User requested `gpt-5.6-luna` subagents. Root plans, coordinates, reviews and runs final integration; workers do not spawn their own agents.
- Before editing, read applicable AGENTS and coordination sources, capture dirty baseline, claim concrete comma-separated paths in correct zones, and retain lease token only in session memory.
- Expand before editing extra files, heartbeat long claims, rebaseline only legitimate external drift, verify/release with truthful evidence. Never edit after verification.
- Preserve all pre-existing dirty work and existing Short-Reel kit. New code/docs/UI are English; preserve existing footer.
- Live Bank mutation is limited to the separately verified missing-language metadata migration authorized by the user. No provider spending, Flow operation or publication.
- Question Bank is English-only. Do not store localized questions or translations in Bank. Reject Vietnamese targets. Persist base channel language codes only.
- Add failing behavioral tests before product changes. Do not suppress checks or regenerate visual baselines to hide failures.
- Proposed new modules below must map to an existing zone before creation. Workers return exact selected paths before their first edit if a current local seam changes this mapping.

## Stage 1: Inventory And Root Cause

**Owner:** read-only Bank auditor; root records the report.

**Inspect:** `apps/server/src/shortReel/questionSelection.ts`, `questionEligibility.ts`, `apps/server/src/repository/quiz/bank/bankQueryEngine.ts`, Bank generation/import producers and safely resolved configured Bank storage.

**Outputs:** actual counts by archetype/status/language/choice validity, channel cooldown where observable, unknowns, and evidence-backed producer seams. Never store raw user questions or secrets in the report unless needed and approved.

- [ ] Identify the active storage root without starting a mutating application instance.
- [ ] Count raw/approved/English/verified-translation/structurally valid records and explain the observed Deep Trivia failure.
- [ ] Compare Topic planner availability criteria with confirmation criteria and enumerate divergence.
- [ ] Identify metadata lost on new generation/import and distinguish it from legacy unknown provenance.
- [ ] Root reviews counts and records safe data-repair limitations.

**Gate:** exact root/counter evidence or an explicit read-access limitation; no speculative global language migration.

## Stage 2: Shared Contracts And Eligibility

User-approved addition: existing audited Bank content is confirmed English. Implement a safe preview/backup/apply metadata repair for missing language to `en`, preserving source text and unrelated fields. All new Bank producers must request and persist English only. Remove target-language and stored-translation eligibility from the upgraded path; reject Vietnamese and unsupported targets before providers. Apply live repair only after tests, backup verification, quiescence/shared mutation coordination, and an exact manifest review.

**Owner:** contract/backend Luna worker with exclusive `shared-contracts`, relevant server zones and concrete tests.

**Files:** additive contracts under `packages/shared/src/` near `schemas/channel.ts`; shared barrel exports; existing `apps/server/src/shortReel/questionEligibility.ts`; focused inventory/eligibility modules under zone-covered `apps/server/src/quiz/bank/`; tests under `packages/shared/test/` and `apps/server/test/`.

**Consumes:** existing BankQuestion, channel settings and cooldown projection.

**Produces:** validated source bindings (question IDs plus content hashes), typed exclusion/shortage diagnostics, and an eligibility/inventory result reused by suggestion and confirmation. Freeze exact exported names in the worker handoff before Stage 3.

- [ ] RED: test missing/foreign language, approved status, exact archetype choice count, contradictory correctness flags, cooldown, and English-only eligibility for both product kinds.
- [ ] RED: reject duplicate source IDs, malformed hashes and inconsistent binding counts; accept reading old runs without bindings.
- [ ] GREEN: extract/reuse the current Short-Reel policy; add the Episode policy without importing transport or persistence into pure code.
- [ ] Add bounded complete inventory traversal with an explicit limit condition, not a false empty result after a silent page cutoff.
- [ ] Force new Bank generation/import to English and persist `language: "en"`; never accept channel target language as Bank generation language.
- [ ] Implement and test the manifest-based metadata migration, but do not apply it until the shared mutation boundary/quiescence gate is satisfied.
- [ ] Run focused tests, shared build/test, consumer typecheck and scoped lint/format. Verify/release, then independent task review.

**Gate:** one consistent eligibility boundary; no duplicate source-policy implementation; legacy reads remain valid.

### Stage 2B Gate: Canonical Bank Boundary And Metadata Migration

Stage 2 cannot advance to Stage 3 after contracts alone. A separate Luna worker must claim the exact repository and migration files after Stage 2A releases its claim.

- [ ] Enumerate every cooperating Bank writer and publish the exact writer list plus non-reentrant lock order before edits.
- [ ] RED/GREEN: place generation/import, JIT seeding, edit/delete/clear, migration and bound source reads behind one canonical Bank read/write serialization boundary. Use a race barrier to prove a confirmation read cannot observe a mixed cooperating mutation. External direct filesystem edits remain outside the transaction and are detected by revision/hash drift.
- [ ] Build a frozen migration manifest containing canonical configured root, exact relative batch paths/question IDs, byte preimage hashes, semantic hashes, missing-language membership, backup locations and expected postimage hashes.
- [ ] Correlate configured root with the server repository root before any write. Back up exact bytes, reject preimage or membership drift, add only missing/null/blank `language: "en"`, preserve every other field, leave `index.json` unchanged, and verify semantic equivalence excluding only the added field.
- [ ] Apply and record the reviewed manifest before Stage 3 creates bindings. Record the post-migration Bank manifest/revision as the source-hash baseline. Idempotent replay must verify existing backups/postimages and make no further changes.
- [ ] Recover, freshly verify and release any previous Stage 2 claim before Stage 3. No active or stale implementation claim may be bypassed.

**Gate:** the live audited metadata repair is backed up and verified; all 1,262 attested records are explicitly English or an exact discrepancy is reported; Stage 3 hashes only the post-migration state.

## Stage 3: Source-Backed Topic Generation

**Owner:** planner Luna worker after Stage 2 acceptance.

**Files:** `apps/server/src/context/topicMatrixPlanner.ts`, `topicCandidateValidator.ts`, focused extracted allocation/prompt modules; actual Suggest Topic task runner; `apps/server/src/repository/topics.ts`; corresponding planner/validator/assigned-plan tests.

**Consumes:** Stage 2 inventory and binding contracts.

**Produces:** persisted source-backed topic run with target/actual counts and shortages. Feasible slots retain their stable assigned identities even if intervening slots are absent.

- [ ] RED: full inventory yields up to three Episode/two Short-Reel slots; scarce inventory yields partial; empty inventory invokes no provider.
- [ ] Use a full-capacity fixture proving exactly three coherent Episode allocations at the declared per-Episode source count plus two Short-Reel sources, globally disjoint source IDs, stable slot IDs, steered-slot priority and stable holes under partial availability.
- [ ] Treat `incomplete` and `unavailable` scans as typed failures that invoke no provider and preserve the previous successful run. Keep provider/parse failure distinct from a genuine complete inventory shortage.
- [ ] RED: keyword has no match; original slot/provenance survives partial allocation; two slots cannot duplicate the same source solely to fill quota.
- [ ] RED: reject AI output that changes slot kind/archetype/group, injects source bindings, duplicates IDs or returns an incorrect allocated count.
- [ ] GREEN: allocate exact sources first, build bounded source-grounded prompts, merge only creative output into server-owned bindings and persist them.
- [ ] Episode grouping must be coherent and have enough sources for its count. No weak-score fallback into unrelated groups.
- [ ] Keep old stored runs readable; new runs follow BF rules. Update exact-five tests to assert approved full/partial/empty behavior rather than deleting coverage.
- [ ] Execute real task/storage integration using an injected provider double; focused regression, typecheck, lint/format, claim release and review.

**Gate:** every new candidate has traceable actual sources; zero hidden Bank generation.

## Stage 4: Safe Bound Confirmation And Product Localization

**Owner:** confirmation Luna worker after Stage 3 acceptance.

**Files:** `apps/server/src/routes/channels.ts` or actual extracted confirmation route, `apps/server/src/shortReel/topicConfirmation.ts`, focused bound-source resolver, `apps/server/src/quiz/bank/questionBankToQuizBridge.ts` and existing bootstrap/storage seams; route/repository/concurrency tests.

**Consumes:** persisted Stage 3 bindings; ignore client-supplied replacement IDs/hashes.

**Produces:** exact bound-source product with product-owned localized audience strings, or a typed unavailable/stale/count/language/localization error, with idempotent replay.

- [ ] RED: source edited/deleted/unapproved/cooling down after suggestion rejects before product creation.
- [ ] RED: confirm twice concurrently and after restart creates one product; successful replay still returns it when Bank later changes.
- [ ] RED: identical confirmation options replay before mutable Bank validation; different options return `CONFIRMATION_OPTIONS_CONFLICT` with no side effects.
- [ ] RED: cross-channel access, forged bindings and unsupported requested counts cannot create artifacts.
- [ ] RED: unbound old topics require regeneration; existing products remain reopenable.
- [ ] GREEN: use serialized confirmation/storage boundaries and exact snapshots; no reselection, JIT seeding, Bank translation lookup/writeback, or partial orphan product.
- [ ] RED/GREEN: localize only displayed quiz question/choices/reveal/explanation, video description, and thumbnail in-image text. Keep Short-Reel narrative/script, Topic, visual directions, image prompt, UI and model instructions English.
- [ ] Persist those three groups atomically as one versioned localization artifact. Failure preserves English source/product state and exposes idempotent retry without a partially localized publication.
- [ ] Preserve choice IDs and correct-answer mapping through localization; reject provider output that drops, duplicates, reorders ambiguously, or changes correctness identity.
- [ ] Store localization state and strings only in the Episode/Short-Reel product, linked to source IDs/hash. Make retry idempotent and invalidate only the affected product localization when source/channel language changes.
- [ ] English channels copy validated English strings without translation. Unsupported or Vietnamese targets fail before provider invocation.
- [ ] Test `en`, `de-DE` to `de`, `fr`, `vi`, `vi-VN` and an unknown code against an explicit supported-base allowlist. Assert English makes zero localization-provider calls.
- [ ] Remove upgraded Episode/Short-Reel calls that cache translated questions back into Question Bank; test Bank bytes/index remain unchanged through product creation.
- [ ] Test strict Episode conversion for two-choice multiple-choice incompatibility, overlong text and contradictory answer flags; reject rather than manufacture options or truncate meaning. Preserve the independent legacy quick-build path.
- [ ] The strict Episode bridge consumes only the bound English source snapshot. Ignore or reject Bank translation fields; localize only after conversion into product-owned storage.
- [ ] Verify Episode consumes its bound set and Short-Reel keeps source fidelity. Use real temporary storage and controllable race barriers.
- [ ] Run route/repository regression, typecheck, lint/format, release and independent review.

**Gate:** source changes cannot silently change the user's selected question; repeated requests cannot duplicate products.

## Stage 5: Availability Synchronization And UI

**Owner:** UI/synchronization Luna worker after Stage 4 contracts settle. Read-only test design may overlap Stage 4; conflicting implementation must not.

**Files:** channel Topic components, channel topic API/state hooks, focused availability client/hook, Bank committed-mutation/event seams only when needed, shared event contract only with exclusive ownership; web component/hook and Playwright tests.

**Consumes:** batch availability and shortage contracts; generation and confirmation outcomes.

**Produces:** automatic availability refresh, concise partial/empty/error states and capacity-safe confirmation controls.

- [ ] RED: partial and empty suggestions display accurate reasons without fake cards; unavailable sources disable creation. Channel language must not change English Bank availability counts.
- [ ] RED: committed Bank changes, focus/reconnect and cooldown expiry refresh visible availability without replacing topic text or user input.
- [ ] RED: slow earlier response cannot replace a newer one; unmount cancels requests/timers; duplicate confirms are prevented; retry is explicit.
- [ ] GREEN: reuse event transport with batched bounded refresh fallback; no per-card full Bank scan, permanent spinner or periodic provider calls.
- [ ] Keep count controls within valid source capacity and show localization pending/failure/retry near the affected product action. Group secondary diagnostics instead of adding repeated labels.
- [ ] Run real browser checks at 1440/390/320, keyboard and touch access, reduced motion, source/Bank changes and refresh without F5.
- [ ] Audit every visible functional string and control for English-only copy, concise labels, no title-ending periods, purposeful secondary controls, keyboard/touch access, and the required responsive footer. The mandated personal-name footer literal is an approved branding credit, not localized functional UI.
- [ ] Build/restart updated artifacts, focused tests, lint/format/typecheck, release and independent review.

**Gate:** UI matches current server state and preserves user context under slow/error/reconnect/concurrent cases.

## Stage 6: Integrated Acceptance

**Owner:** separate Luna reviewer plus root integration controller.

**Artifacts:** worker handoffs per stage, this plan/progress ledger, root final handoff, test screenshots in normal test output locations.

- [ ] Review all changed contracts and diffs, not only worker summaries; resolve Important/Critical findings before acceptance.
- [ ] Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, explicit shared source/binding tests, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm test:visual`, zones and `git diff --check` on final code.
- [ ] Rebuild/restart server/web against isolated temporary storage and provider doubles; never point acceptance workflows at the user's live Bank. Execute populated/partial/empty topic runs, both content kinds, exact source creation, stale rejection, concurrent replay, and `en`/`de`/`fr` product localization with Vietnamese rejection.
- [ ] Compare product creation with the recorded post-migration Bank baseline and prove Bank content/index remain unchanged. Report the authorized metadata migration separately against backed-up pre-migration bytes. Verify only the three permitted output groups differ by channel language; assert Topic, narrative/script templates, visual directions, image prompts, model instructions and UI remain English.
- [ ] Verify hash version/canonicalization for field order, Unicode/whitespace behavior, null handling and unsupported versions. Confirm legacy alias index buckets are not double-counted.
- [ ] Re-run read-only live Bank diagnostics and report remaining user-data limitations separately from software behavior.
- [ ] Inspect current desktop/mobile screenshots and no-refresh behavior. Preserve actual warnings/failures in evidence.
- [ ] Root updates progress, writes final handoff, verifies/releases documentation claim and confirms zero active implementation claims.

**Gate:** all BF requirements have passing evidence or a specifically reported external data blocker. No assertion of live data repair, paid-provider quality or Flow acceptance without evidence.

## Coordination And Review Rules

Stage dependency order is 1 -> 2 -> 3 -> 4 -> 5 -> 6. Stage 4 may be split into disjoint confirmation and localization slices only after shared contracts are frozen; integration remains sequential. Independent discovery/audit may run concurrently; only one implementer owns a high-risk shared chain at a time. Root may prepare documentation while workers own disjoint product files. Every implementation handoff includes exact files, red/green commands and exit codes, contract names, runtime evidence, claim/release status and unresolved risks. Reviewers are read-only and send spec-compliance and code-quality verdicts to root. Root routes fixes back to the responsible worker, not an unreviewed controller patch.
