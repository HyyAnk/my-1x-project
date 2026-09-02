# Agent Coordination Protocol Master Spec

## Goal

Create a lightweight coordination system that lets multiple coding agents work on the same repository without overwriting each other, causing silent contract drift, or losing continuity when one chat window runs out of context.

## Non-Goals

- Do not build a heavy enterprise workflow before the lightweight version proves useful.
- Do not lock every file or every small edit.
- Do not replace Git, tests, review, or human judgment.
- Do not let the coordination system modify product runtime behavior unless a later phase explicitly implements tooling.

## Core Model

Each agent works directly in the current main checkout and declares its intended impact before editing. Agents must not create new branches or worktrees unless the user explicitly changes that rule. A claim records the zones the agent can write, the zones it depends on staying stable, the dirty workspace baseline at claim time, and the verification required before release.

The protocol has three layers:

- **Process layer:** Agent instructions, phase prompts, handoff summaries, and integrator review.
- **Metadata layer:** Zone map, claim registry, change requests, release records, and cleanup manifests.
- **Enforcement layer:** Diff guard, pre-commit or CI checks, and later an orchestrator with heartbeat and TTL.

## Terms

| Term                   | Meaning                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Agent                  | Any coding worker such as Codex, Claude, Antigravity, or another AI coding tool.                                     |
| Integrator             | The owner of merge order, final verification, and cross-phase decisions.                                             |
| Phase                  | A bounded implementation stage with its own prompt and handoff summary.                                              |
| Zone                   | A named area of responsibility such as shared contracts, render, pipeline, or web API.                               |
| Claim                  | A record that an agent is allowed to write specific zones for a task.                                                |
| Lease token            | A one-time secret returned at claim creation and required for every claim mutation; only its SHA-256 hash is stored. |
| Expand                 | A request to add more zones to an active claim before editing outside the current scope.                             |
| Release                | The act of returning claimed zones after verification and handoff.                                                   |
| Read-stable dependency | A zone the agent does not write but depends on remaining unchanged while it works.                                   |
| Hard lock              | A rule that blocks overlapping write access.                                                                         |
| Soft claim             | A visible declaration that warns about overlap but may allow disjoint low-risk work.                                 |

## Operating Invariants

- Agents must not edit product code before identifying their phase, scope, and source-of-truth files.
- Agents must work in main-direct mode and must not create branches or worktrees unless the user explicitly asks for that.
- Agents must record the dirty workspace baseline before editing so later verification can distinguish pre-existing changes from the agent's own work.
- Claim acquisition and expansion must perform conflict checking and writes in one SQLite `BEGIN IMMEDIATE` transaction.
- Planned files must be concrete repository-relative paths. Wildcards are invalid, and an omitted list owns the whole zone.
- Expand, heartbeat, verify, and release require the matching lease token. Legacy tokenless claims cannot mutate.
- Verification must store non-empty evidence plus the current Git repository fingerprint. Any later file or `HEAD` change makes verification stale.
- Release must re-inspect scope and fingerprint inside an immediate transaction. A claim without fresh successful verification cannot release.
- Agents must not edit after verification or commit while an implementation claim remains active.
- Every implementation phase must end with a handoff summary.
- Shared contracts, task status, progress DTOs, artifact naming, invalidation rules, pipeline orchestration, and render input schemas are high-risk zones.
- High-risk zones require exclusive ownership or integrator approval.
- If an agent discovers it must edit outside its scope, it must stop and request claim expansion before changing files.
- A clean Git merge is not enough. Contract compatibility and runtime behavior still need verification.
- Main-direct mode has no Git isolation, so zone ownership, baseline snapshots, and diff verification are the safety boundary.
- Every tracked or non-ignored product file below `apps/`, `packages/`, and `services/` must map to exactly one zone.

## Claim Types

| Claim Type        | Purpose                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `write`           | The agent may edit files in the claimed zone.                                                                   |
| `read-stable`     | The agent depends on the zone not changing during its task.                                                     |
| `exclusive`       | Only one active claim may write the zone.                                                                       |
| `shared-disjoint` | Multiple claims may coexist when planned files do not overlap.                                                  |
| `runtime`         | Protects shared runtime resources such as dev servers, generated artifacts, databases, and render output paths. |

## Recommended High-Risk Zones

| Zone                   | Why It Is High Risk                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `shared-contracts`     | Types and schemas are consumed by server, web, tasks, and tests.                       |
| `server-pipeline`      | Pipeline changes affect generation, rendering, artifacts, invalidation, and progress.  |
| `task-status-progress` | Task events and progress shape affect UI, task runners, and repositories.              |
| `api-contracts`        | DTO and route behavior must stay compatible with web API clients.                      |
| `artifact-contracts`   | Artifact names, paths, and invalidation rules can silently break generation and reuse. |
| `render-inputs`        | Render composition inputs connect style, layout, scenes, timing, and progress.         |

## Success Criteria

The system is successful when:

- A new agent can start a later phase by reading files in this folder and the latest handoff summary.
- Active ownership is visible before work starts.
- Agents can determine whether their planned work conflicts with another active claim.
- Diff verification can detect edits outside the claimed zones while ignoring unrelated pre-existing dirty files captured in the claim baseline.
- Completed coordination artifacts can be archived or removed using a cleanup manifest.
- The overhead stays small for one or two agents and scales only when concurrency increases.
- Status, history, queue, and persisted JSON never expose raw lease tokens or token hashes.

## Enforcement Boundary

The protocol is cooperative and transactional, not an operating-system file lock. An unrestricted editor or agent can bypass the CLI. Repository instructions require compliant behavior, while verification, release, zone validation, code review, and integration checks must refuse work that is active, unverified, stale, unmapped, or overlapping.

## Adoption Strategy

Implement the protocol in small stages:

- Start with documentation and phase prompts.
- Add a zone map.
- Add lightweight claim and release.
- Add diff guard after the workflow proves useful.
- Add an advanced orchestrator only when repeated multi-agent work justifies it.
