# Independently Review Stage A, Then Execute Stage B If Accepted

Work in D:/1a Cursor Project/My 1x Project or the actual mounted repository root. This prompt authorizes a fresh independent Stage A review followed by Stage B implementation only if the predecessor gate passes. Do not skip the review or infer acceptance from passing tests alone.

## Read First

Read AGENTS.md, docs/agent-coordination/README.md, master-spec.md, phase-roadmap.md and the latest relevant handoff. Then read the Short-Reel README, agent-runbook.md, specification.md, architecture.md, contracts.md, decisions.md, progress.md, verification/test-cases.md and acceptance-matrix.md.

Read these exact task inputs:

- docs/superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md
- docs/short-reel-implementation/verification/evidence/phase-02-repair-03.md
- docs/short-reel-implementation/verification/evidence/phase-02-repair-03-self-review.md
- docs/short-reel-implementation/verification/evidence/phase-02-repair-02-recheck-codex.md
- docs/agent-coordination/handoffs/short-reel-phase-02-repair-03.md
- docs/short-reel-implementation/verification/evidence/phase-03-review.md
- docs/short-reel-implementation/phases/03-topics-selection.md

## Gate 1: Independent Stage A Review

1. Capture git status --porcelain and HEAD, query node scripts/agent-status.mjs --json and inspect released claim claim-codexstageafinalrepair-mtr1d2x4. Confirm current code/delta and exact file scope against its recorded evidence. Do not reuse previous tokens.
2. If you implemented Repair 03 or this is its ongoing implementation session, do not call this independent review. Stop for a genuinely fresh reviewer or explicit user/integrator acceptance.
3. Inspect source-write provenance, canonical answer/hash fidelity, legacy read-only recovery, atomic replacement, CAS/replay, owner admission, pending queues, close/root-switch races and child-process exclusion. Check that no timeout releases a lock under running work and that all current consumers honor the contract.
4. Rerun the focused shared/server commands from Repair 03 evidence plus typecheck, relevant lint/format and zone validation. Inspect actual code and tests, including coverage gaps; the preceding self-review is context, not acceptance. Safely isolate fixtures before broader checks; do not use live channel/bank roots or ignore failing required gates.
5. If blocking findings remain, stop before Stage B. Under a concrete documentation claim write docs/short-reel-implementation/verification/evidence/phase-02-repair-03-review.md and a unique coordination handoff, update progress as rejected/blocked, then verify/release. Do not fix a major Stage A contract issue inside Stage B.
6. If the independent review passes and the implementation is verified/released, write the same review report using templates/review-report.md, record reviewer/session/fingerprint/tests, mark Stage A accepted in progress under the documentation claim, verify and release it. No edits after verification. Only then continue below with a new implementation claim.

If that report filename already exists, inspect it and use a numbered follow-up rather than overwriting prior evidence.

## Gate 2: Execute Stage B Only

Follow tasks B1 through B6 of the repair plan, accounting for fixes already present. Reproduce each remaining finding before changing it. Stabilize contracts before dependent work and inspect every affected producer/consumer. Do not recreate old bugs to match outdated plan descriptions.

- B1: stored-topic discrimination before kind-specific validation; real one-question card payload confirms successfully; keep Episode limits/routing independent; remove prohibited legacy topic coercion without resetting data; use explicit response types.
- B2: explicit English or complete verified translation, exact source/answer fidelity, bounded pagination, stable suitability selection and existing cooldown exclusions. Reuse reviewed source constructors and never fabricate bank content or provenance.
- B3: atomic topic-run selection projection; concurrent sibling selections survive; report write failure honestly; restart/retry returns the same persisted reel and repairs incomplete projection.
- B4: validate generation output against the assigned 3-Episode/2-Short-Reel slot plan; slots 1/4 are keyword-directed only when a hint exists; bounded correction preserves prior valid suggestions. Do not silently relabel a conflicting concept or claim semantic relevance from labels alone.
- B5: focused draft hook/components, retryable errors, stale response rejection, responsive 1440/390/320 layouts, accessible keyboard/touch actions and concise English copy. Preserve input/context and refresh affected views automatically. No fake generation action or phase-number promises.
- B6: actual isolated keyword suggestion -> HTTP confirmation -> draft -> refresh/reopen -> restart workflow, plus Episode regression. Stub external providers only. Save/inspect desktop/mobile screenshots and record success/slow/empty/error/retry/reconnect/concurrency evidence. Correct scope/evidence discrepancies without inventing historical permission.

## Safety and Ownership

- Main-direct only; no branches/worktrees, unsolicited commits or automatic subagent spawning.
- Each claim lists exact comma-separated files and verified zones. Capture tokens only in session memory. Expand before extra edits. Preserve pre-existing unrelated dirty work.
- Keep complete-source write gates and draining admission semantics from Stage A. Do not remove them to make fixtures pass.
- No paid/live Flow, bank mutation/translation, data reset/migration, portrait retirement or kit deletion/archive without separate explicit authority.
- All new repository text and UI are English. Retain the documented footer conflict; do not invent a resolution or silently change existing credit copy.
- Do not use unknown default Playwright servers at 2244/4310. Start test-owned isolated storage/provider stubs on free ports and close those processes afterward.
- Test first: observe the expected red behavior, make the focused change, then green. Run the updated artifact after rebuild/restart; a build alone is not workflow evidence.

## Deliver and Stop

Run all relevant shared/server/web tests, typecheck, lint/format/build, zones and the updated primary workflow. Report pre-existing failures honestly; they are not passes. Follow the repair plan's evidence requirements and do not reduce the suite to hide a required failing gate.

Write numbered Stage B repair evidence and a unique handoff, mapping remaining F03 findings to code/tests/observed workflow. Update Phase 03 to ready_for_review only after implementation verification is prepared. Verify/release the Stage B claim and stop without later edits. Do not self-accept Stage B, start Phase 04, grant final project acceptance or delete the kit.

Final response: Stage A review decision and released review claim; Stage B changes and unresolved findings; exact tests/results and screenshots/evidence links; released implementation claim; next review prompt. If Gate 1 failed, report only the rejection and bounded repairs needed.
