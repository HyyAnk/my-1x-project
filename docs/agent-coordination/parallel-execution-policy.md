# Parallel-First Execution Policy

## Purpose And Applicability

Reduce end-to-end completion time through safe parallel work while preserving correctness, maintainability, and verified integration. This policy applies to every project task, including investigation, planning, implementation, testing, review, and documentation, regardless of provider: Codex, Antigravity, Claude, Grok, Z AI, or any other agent.

This is a mandatory project instruction, not a requirement to maximize agent count. It supplements `AGENTS.md` and the existing coordination protocol. It does not override higher-priority host restrictions, expand the user's task authority, authorize external side effects, or permit unrequested branches, worktrees, commits, or separate user-facing tasks.

## Default Decision

At the start of every task, and when new independent work appears:

1. Identify bounded outcomes, dependencies, shared contracts, and the critical path.
2. Assess whether multiple workers can make useful progress concurrently without conflicting writes, unstable assumptions, or shared runtime contention.
3. Compare the expected completion-time benefit against startup, context transfer, resource use, review, and integration costs.
4. When the benefit is credible, quality can be preserved, and real delegation is available, use multiple subagents by default without waiting for another user request. Choose only as many useful workers as the work and available capacity support; a small task may justify only one helper alongside the main agent.
5. Otherwise work directly or sequence the dependent steps. Briefly state the concrete reason in the plan or progress update, such as a tiny change, a shared contract dependency, unavailable delegation, or coordination overhead. Do not add a planning ceremony to trivial tasks.

Different filenames alone do not establish independence. Account for API/schema changes, read-stable dependencies, generated files, databases, ports, running processes, test fixtures, and output directories.

## Delegation Contract

The main agent remains the coordinator and final integrator. Before dispatch, provide each subagent with:

- A unique identity, one bounded objective, relevant source-of-truth context, and explicit exclusions.
- Read-only or write permission, exact responsibility, concrete planned files for writes, and required zones.
- Dependencies and public contracts that must remain stable; the order for any prerequisite work.
- Expected deliverables, acceptance criteria, verification commands, and reporting requirements.
- A stopping condition: report ambiguity, scope expansion, unavailable prerequisites, or unsafe side effects rather than improvising outside scope.

Keep the main agent on useful non-overlapping work while workers run. Avoid duplicating a delegated implementation locally. Independent review may intentionally inspect the same material, but must remain read-only. Bound concurrency to available worker slots, resource limits, and review capacity; nested delegation must remain within the coordinator's agreed scopes and total concurrency budget.

## Ownership And Dependency Safety

- Every writing agent must independently follow the existing startup, baseline, successful claim, concrete planned-file, heartbeat, verification, handoff, and release lifecycle. A parent claim does not authorize a child's writes; never share lease tokens or place them in prompts or artifacts.
- Never allow concurrent writers to the same file, shared contract, or runtime resource, including the main agent. Respect exclusive zones even when proposed files differ. Use `shared-disjoint` concurrency only where the zone map permits it and planned files do not overlap.
- Stabilize shared contracts first under the proper exclusive owner, then dispatch dependent work. Keep dependent steps sequentially ordered when the boundary cannot yet be fixed safely.
- Use the existing read-stable and runtime protections where required. Do not concurrently run checks or generators that mutate the same fixtures, build outputs, database, or server state.
- Claim expansion must succeed before any added path is edited. If ownership is denied, stop the conflicting work and report or resequence it; never bypass the gate.
- Stay on the current main checkout. Do not use branches, worktrees, or a different checkout as an implicit escape from coordination rules.
- For bounded read-only advisory subtasks, the main agent incorporates the returned findings into its own required handoff. Such helpers must not write a separate handoff or any other repository file; a helper that needs to write must first acquire its own scoped claim and complete the writing-agent lifecycle.

## Integration, Recovery, And Completion

1. Track assigned owners, dependencies, progress, and blockers. Require workers to report changed files, actual check results, assumptions, and unresolved risks.
2. Inspect returned diffs and evidence instead of accepting completion claims at face value. Reconcile contract compatibility and integrate in dependency order through the owning agent.
3. If a worker fails or stalls, establish that its writes have stopped and inspect partial changes before retrying or reassigning. Resolve existing ownership through the protocol; never start a replacement writer against an active conflicting claim or discard recoverable work blindly.
4. Re-run affected checks and the updated primary workflow against the integrated result. For instruction-only work, verify reference resolution, policy consistency, and the coordination checks rather than claiming application runtime coverage.
5. Re-baseline through the authenticated command when concurrent released work causes out-of-scope drift, then verify again. Do not edit after successful verification; release only with fresh evidence and obey the existing commit gate.
6. The main agent reports the actual outcome, verification limits, and remaining blockers. Speed never justifies skipped tests, silent failures, weakened acceptance criteria, or unverified integration.

## Provider And Environment Fallback

Use only subagent or delegation capabilities actually exposed and permitted by the current environment. This policy does not install tools, enable unsupported features, or guarantee that every provider automatically reads project instruction files.

If delegation is unavailable, continue with the same bounded work plan sequentially and state the limitation when relevant. Never fabricate worker activity or claim parallel execution that did not occur.

`AGENTS.md`, `GEMINI.md`, and `.agents/rules/agent-coordination.md` reference this canonical policy. For another environment, load or reference this document through its supported project-instruction mechanism; do not duplicate the full policy into divergent provider-specific copies.
