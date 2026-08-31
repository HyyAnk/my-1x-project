# Quiz Visual Refactor Dossier

Status: Core 7-phase refactor and Phase 8 stabilization COMPLETE; four-choice project DEFERRED

This dossier carries durable context for the quiz visual-layout and style refactor across separate Codex tasks. It is a navigation and decision layer; current source code and executable tests remain authoritative.

## Start here

A user running the phases sequentially should start with:

1. `operator-runbook.md`
2. `roadmap-status.md`
3. The prompt for the current `READY` phase in `prompts/`

The current roadmap has no `READY` phase. For the accepted final state, read `handoffs/phase-08d-2026-08-31.md`; the separate four-choice project remains `DEFERRED`.

A fresh implementation task must read these files in order:

1. Repository AGENTS.md
2. This README and `phase-execution-protocol.md`
3. `roadmap-status.md`
4. Latest completed preceding-phase handoff, when applicable
5. `as-is-system-map.md`
6. `source-inventory.md`
7. `compatibility-matrix.md`
8. `target-architecture.md` and the accepted ADRs
9. The active phase brief, test matrix, and interaction plan when present
10. `verification-runbook.md`

The active prompt lists the exact subset and dependency gate. Do not begin a later phase merely because its brief already exists.

## Dossier structure

    docs/quiz-visual-refactor/
    ├── README.md
    ├── operator-runbook.md
    ├── phase-execution-protocol.md
    ├── as-is-system-map.md
    ├── source-inventory.md
    ├── target-architecture.md
    ├── compatibility-matrix.md
    ├── roadmap-status.md
    ├── verification-runbook.md
    ├── decisions/
    │   ├── README.md
    │   ├── ADR-001-layout-preset-separation.md
    │   ├── ADR-002-unified-choice-renderer.md
    │   ├── ADR-003-css-ownership.md
    │   ├── ADR-004-background-axis.md
    │   ├── ADR-005-four-choice-migration.md
    │   └── ADR-006-proof-layouts-explicit-only.md
    ├── phases/
    │   ├── README.md
    │   ├── phase-01-baseline.md
    │   ├── phase-01-test-matrix.md
    │   ├── phase-02-layout-capability-contract.md
    │   ├── phase-02-test-matrix.md
    │   ├── phase-03-shared-scene-pipeline.md
    │   ├── phase-03-test-matrix.md
    │   ├── phase-04-unified-choice-rendering.md
    │   ├── phase-04-test-matrix.md
    │   ├── phase-05-css-preset-boundaries.md
    │   ├── phase-05-test-matrix.md
    │   ├── phase-06-new-layouts-scalable-ui.md
    │   ├── phase-06-test-matrix.md
    │   ├── phase-06-interaction-plan.md
    │   ├── phase-07-background-registry.md
    │   ├── phase-07-test-matrix.md
    │   ├── phase-07-interaction-plan.md
    │   ├── phase-08-end-to-end-stabilization.md
    │   └── phase-08-test-matrix.md
    ├── prompts/
    │   ├── README.md
    │   ├── phase-01-codex-prompt.md ... phase-07-codex-prompt.md
    │   └── phase-08b-codex-prompt.md ... phase-08d-codex-prompt.md
    ├── handoffs/
    │   ├── README.md
    │   ├── phase-01-handoff-template.md ... phase-07-handoff-template.md
    │   └── phase-08a-2026-08-31.md ... phase-08d-2026-08-31.md
    └── artifacts/
        └── README.md

Phase 2–8 briefs are dependency-locked planning snapshots. Each fresh task must reconcile its brief with the latest preceding handoff and current code. It may adapt implementation details and update stale documentation, but it may not bypass the phase outcome, acceptance matrix, ADRs, or dependency gate.

## Source-of-truth order

When information conflicts, use this order:

1. AGENTS.md and explicit user instructions
2. Current schemas, types, production code, and tests
3. Latest factual phase handoff
4. Accepted ADRs
5. Active phase brief and matrix
6. As-Is map and inventory
7. Earlier chat summaries

The As-Is documents are snapshots, not permission to skip repository inspection. Every fresh task must check git status and use CodeGraph first when the .codegraph directory exists.

## Phase lifecycle

Each phase progresses through NOT_READY, READY, IN_PROGRESS, BLOCKED, or COMPLETE in roadmap-status.md. `PARTIAL` is a handoff outcome used to resume the same `IN_PROGRESS` phase; it never unlocks the next phase. A phase is complete only when:

- its acceptance criteria are satisfied;
- required tests, type checks, builds, and workflow verification pass;
- unrelated user changes remain untouched;
- the handoff record contains exact commands and results;
- roadmap-status.md reflects the real repository state.

One Codex task should own one phase. If a phase ends `PARTIAL`, rerun that phase's prompt in a new task using the latest partial handoff; never advance to the next prompt. Phase 4 may be organized internally as 4A and 4B, but it is not `COMPLETE` until both renderer and caller/slot migration are integrated.
