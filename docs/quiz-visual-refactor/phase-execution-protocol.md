# Phase Execution Protocol

Every implementation task follows this protocol in addition to its phase brief.

## Dependency gate

Before editing, the task must prove that:

1. the immediately preceding phase is `COMPLETE` in `roadmap-status.md`;
2. a non-template handoff for that phase exists and reports the next phase as `READY`;
3. required checks in that handoff passed or any accepted exception is explicit;
4. the current phase is `READY`, or it is the same `IN_PROGRESS` phase being resumed from its newest `PARTIAL` handoff with no competing implementation task.

Phase 1 uses dossier readiness instead of a preceding handoff. If a dependency gate fails, inspect and report the exact evidence, but do not begin implementation.

## Preflight

1. Read repository `AGENTS.md`, the dossier README, roadmap, accepted ADRs, active phase brief and matrix, verification runbook, and latest preceding handoff. When resuming, also read the newest `PARTIAL` handoff for the active phase and do not repeat completed work.
2. Record branch, HEAD, and full `git status --short`.
3. If `.codegraph/` exists, use CodeGraph before grep or direct source reads to verify active symbols and blast radius.
4. Reconcile the future-written brief with current code. Update stale navigation facts before relying on them.
5. Map every matrix case to existing evidence, a planned test, or an explicit record-only observation.

## Execution

- Change the active phase from `READY` to `IN_PROGRESS` only after the dependency gate passes.
- Keep production entry points thin and place new responsibilities in cohesive feature modules.
- Preserve persisted contracts unless the phase explicitly owns their migration.
- Add tests at the narrowest useful layer and rerun focused checks after each cohesive change.
- Do not stage, commit, revert, delete, or absorb unrelated user changes without explicit authorization.
- Do not begin work assigned to a later phase merely because a convenient adjacent issue is visible.

## Verification

Run the active phase's targeted checks and all applicable workspace gates in `verification-runbook.md`. Rebuild or restart affected processes and rerun the primary workflow when production, web, CLI, or configuration code changed.

For web UI changes, verify the interaction plan, immediate feedback, pending/error/retry states, state synchronization, keyboard/touch access, reduced motion, desktop/mobile behavior, visible-copy audit, and required responsive footer credit from `AGENTS.md`.

## Handoff

Create a dated handoff from the active template or active subphase prompt:

    handoffs/phase-NN-YYYY-MM-DD.md
    handoffs/phase-NNa-YYYY-MM-DD.md

The letter form applies to Phase 8A–8D. If that path already exists, add a short descriptive suffix rather than overwriting evidence. The handoff must contain repository state, matrix coverage, exact commands and outcomes, changed files, behavior changes, deviations, unrelated paths preserved, risks, and next-phase readiness.

## Completion gate

Mark a phase `COMPLETE` only when:

- all required matrix cases are satisfied;
- applicable targeted and workspace checks pass;
- primary updated workflows have been rerun;
- no required work remains;
- the handoff is complete;
- As-Is, ADR, inventory, runbook, and roadmap documents affected by reality are current;
- only the next dependency-satisfied phase becomes `READY`.

Use `PARTIAL` in the handoff without advancing the roadmap when useful work is complete but the phase exit gate is not. Use `BLOCKED` only when progress cannot continue safely without user authority or an external state change.

## Stop rules

Stop before implementation or before a risky subpart when:

- the dependency gate is not satisfied;
- a pre-existing change overlaps a file that must be materially rewritten;
- the brief conflicts with current accepted architecture or would require a breaking contract outside phase scope;
- required deterministic evidence cannot be produced without unrelated behavior changes;
- an external write, destructive action, purchase, secret, or material scope expansion would be required.
