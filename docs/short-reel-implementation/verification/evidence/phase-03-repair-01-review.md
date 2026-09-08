# Phase 03 Stage B Repair Attempt 01 Review

## Review Identity

- Reviewer: Codex, 2026-09-07
- Review type: independent of the Stage B implementer; not an implementer self-review
- Implementation evidence: [phase-03-repair-01.md](phase-03-repair-01.md)
- Implementation claim: `claim-antigravityp03repair01-mtr2ah7m`, released
- Review claims: `claim-codexstagebreview-mtr4mvt8` expired after a heartbeat timeout during session continuation; documentation was finalized under recovery claim `claim-codexstagebreviewrecovery-mtr7ozla`.

## Findings First

### F03-BR01 — Blocker: validator accepts and relabels missing or foreign slot metadata

- Location: `apps/server/src/context/topicCandidateValidator.ts:84-110, 144-147`
- Reproduction: the validator rejects only supplied mismatching kind/archetype; absent values are accepted. `domain_id` is copied without comparison to the assigned slot, and duplicate `topic_id` values are not rejected.
- Expected: every candidate explicitly matches assigned kind, archetype, domain, and unique identity; invalid model output is rejected, never normalized.
- Actual: missing metadata can be replaced and foreign metadata can be persisted.
- Required test: fail-first cases for missing/foreign kind, archetype, domain, and duplicate IDs, asserting no topic run is written.
- Disposition: blocking; reject.

### F03-BR02 — Blocker: runtime validation does not use the assigned matrix plan

- Location: `apps/server/src/tasks/parsers.ts:50-53`; `apps/server/src/tasks/handlers/textArtifactHandlers.ts:15-20`
- Reasoning: the handler passes only `topicHint`; parsing creates a new fallback plan. The immutable plan assigned to the task is not carried into validation, so taxonomy/index-derived domains and slot instructions can drift.
- Required test: persist/pass a typed `TopicMatrixPlan`, then prove a candidate matching fallback but not the assigned domain is rejected.
- Disposition: blocking; reject.

### F03-BR03 — Blocker: projection durability is only process-local and has an unhandled rejection path

- Location: `apps/server/src/repository/topicSelectionProjection.ts:9-25, 34-91`; `apps/server/src/repository/topics.ts:221-223`
- Reasoning: a module-level `Map` cannot coordinate separate server processes. The stored `next.finally(...)` promise may reject independently after the returned operation is handled. No cross-process writer admission/lock is used here.
- Required tests: barrier-driven multi-process projection with conflicting files, plus failure injection asserting typed propagation and zero `unhandledRejection` events.
- Disposition: blocking; reject.

### F03-BR04 — Blocker: required UI/browser evidence is absent and a Phase 04 promise remains

- Location: `apps/web/src/features/shortReel/ShortReelStudio.tsx:130-136`
- Reproduction: no current desktop/mobile screenshot artifacts are in the evidence directory; production UI renders “Script generation and prompt compilation will activate in Phase 04.”
- Expected: current primary-flow evidence at mobile and desktop widths, without phase-number promises.
- Required tests: browser flow at 320px, 390px, and desktop covering loading, retry, input preservation, and loader termination; assert no Phase 04 promise.
- Disposition: blocking; reject.

### F03-BR05 — Major: source/translation edge cases and async UI behavior remain unproven

- Locations: `apps/server/src/shortReel/questionEligibility.ts`; confirmation error mapping; `apps/web/src/features/shortReel/hooks/useShortReelDraft.ts`
- Reasoning: evidence does not cover whitespace-exact source preservation, translation metadata/choice edge cases, out-of-order requests, reconnect, or structured retry classification. Current focused tests pass but do not cover these gates.
- Required tests: exact-string/provenance, stale-response/cancellation, reconnect/retry, and stable error-code cases.
- Disposition: unresolved verification gap; keep blocked.

## Requirement Checks

| Requirement | Result |
|---|---|
| F03-01, F03-06 route discrimination and strict schemas | Partial; focused tests pass, malformed error contract not fully audited |
| F03-02, F03-03 English eligibility and translation fidelity | Not proven |
| F03-04 durable selection projection | Fail; process-local only |
| F03-05 assigned 3:2 matrix | Fail; F03-BR01 and F03-BR02 |
| F03-07, F03-09 UI/workflow | Fail; F03-BR04 |
| F03-10 ownership/file scope | Not accepted; integrator reconciliation remains required |

## Verification Performed By Reviewer

- Focused server Stage B suite: passed, 45 tests.
- Focused web suite: passed, 19 tests.
- Server regression suite: passed, 31 tests.
- Shared tests, typecheck, and web build passed in this review chain.
- Zone validation passed with 0 unmapped and 0 overlapping files.
- `git diff --check` passed.
- No paid/live Flow action, manual browser review, or screenshot evidence is claimed.

## Decision

Reject Stage B Repair Attempt 01. Passing tests do not cover the blocking validator, plan-propagation, durability, and UI-evidence failures. Phase 04 must not start. This review does not grant final project acceptance.

## Progress And Handoff

Progress and a unique review handoff are updated under the documentation claim. The next prompt must be a bounded Stage B repair prompt addressing F03-BR01 through F03-BR05 and must not start Phase 04.
