# Execute Short-Reel Phase 01: Portrait Inventory And Baseline

You are working in repository `D:\1a Cursor Project\My 1x Project`. If it is mounted elsewhere, resolve the actual repository root from AGENTS.md/package.json/scripts; do not create a second checkout.

Execute ONLY Phase 01 of the Short-Reel implementation kit. This prompt authorizes bounded work in that phase, not all later phases. You may be Codex, Antigravity or another coding agent; repository artifacts are the source of truth, not chat history or tool-specific memory.

## Read Before Acting

Read completely:

1. `AGENTS.md` and any applicable nested instructions.
2. `docs/agent-coordination/README.md`, `master-spec.md`, `phase-roadmap.md` and the phase-handoff template, all under `docs/agent-coordination/`.
3. The newest relevant repository handoff and the latest Short-Reel handoff, if one exists.
4. `docs/short-reel-implementation/README.md`, `agent-runbook.md`, `specification.md`, `architecture.md`, `contracts.md`, `roadmap.md`, `progress.md`, `decisions.md` and `file-map.md` within that folder.
5. `docs/short-reel-implementation/phases/01-portrait-inventory.md`.
6. `docs/short-reel-implementation/verification/acceptance-matrix.md` and the phase's applicable cases in `verification/test-cases.md`.
7. Both initial inventory documents under `docs/short-reel-implementation/inventory/`; they are not yet completed inventories.

## Entry Gate

No predecessor phase is required. Do not treat creation of this documentation kit as a completed Phase 01 inventory.

If Phase 01 is already partially implemented, reconcile current code/evidence and resume unfinished slices only. If it is already accepted, verify the record and report that fact; do not reimplement it or automatically start the next phase.

## Execution Rules

- Begin with `git status --porcelain`, `git rev-parse HEAD` and `node scripts/agent-status.mjs --json`. Work directly on current main. No branch, worktree, commit, push or unrequested agent spawning.
- Read current code before editing. If .codegraph exists, use CodeGraph before rg/file exploration; do not re-index without authorization.
- Declare exact responsibilities, interfaces, files, tests and side effects for this phase. Claim concrete paths and correct zones before any edit, including progress/evidence/handoff documents. CLI lists are comma-separated single arguments; check returned ownership.
- Keep the lease token only in session memory; pass it to expand/heartbeat/verify/release/rebaseline. No wildcard planned files. Expand successfully before new paths. Never take over an active claim without authorized recovery.
- Preserve pre-existing dirty work. Contract or scope changes require the decision/review process. New server application paths must be zone-covered before creation, not retroactively at final QA.
- Execute the phase's test-first slices. Run updated code/artifact and primary workflow after changes, not only build. Use existing libraries, thin UI/routes and focused modules. Do not add suppression/skip rules to conceal failures.
- Follow all source-fidelity, three-segment text/continuity and manual-Flow requirements. Never call or automate Flow, publish content, claim real video quality from a prompt, or mutate Question Bank to fill empty selection.
- All code, docs, tests and UI added to the repository are English. Respond to the user in their preferred language. Preserve existing footer while the documented instruction conflict is unresolved.
- Never delete, move or archive `docs/short-reel-implementation/`. The user will delete it personally after full acceptance.

## Phase-Specific Focus

Inventory only: classify every portrait dependency, protected asset and obsolete test product; run read-only baseline checks. Do not delete or refactor product code.

## Required Finish

Write `docs/short-reel-implementation/verification/evidence/phase-01-implementation.md` using the evidence template and `docs/agent-coordination/handoffs/short-reel-phase-01.md` using the repository handoff template. Include changed files, tests/exit codes, runtime workflow, mocked versus real boundaries, blockers and next-agent input. Update progress before final verification. Do not copy secrets into evidence.

Run all phase-required checks on the final code, review the diff, call agent-verify-claim with truthful evidence, then agent-release. No repository edits after successful verification. If concurrent drift invalidates verification, inspect it, use authenticated rebaseline and rerun verification; never hide out-of-scope edits.

Report result, evidence/handoff links, checks actually run, remaining issues and release status. Stop after this phase and name the next eligible prompt; do not execute it.
