# Agent Coordination Change Request

## Request

Add a provider-neutral parallel-first execution policy and mandatory references in existing project instruction entrypoints.

## Reason

The current protocol protects concurrent work but does not require agents to proactively select safe parallel execution. The user requested that agents prefer multiple subagents whenever this improves completion time without compromising quality or creating overlapping work.

## Affected Files

- `AGENTS.md`
- `GEMINI.md`
- `.agents/rules/agent-coordination.md` if the entrypoint review confirms a reference is needed.
- `docs/agent-coordination/README.md`
- `docs/agent-coordination/parallel-execution-policy.md`
- This approval record, the implementation plan, and the task handoff.

## Affected Zones

- `agent-coordination`
- `coordination-handoffs`

## Risk

- Low: documentation-only instructions; no product behavior, dependencies, zone definitions, or CLI contracts change.

## Compatibility

Existing main-direct, claim/token, zone ownership, baseline, verification, release, and commit gates remain mandatory. The policy does not grant additional task authority or bypass host restrictions. Unsupported delegation falls back to direct execution.

## Proposed Verification

- Independent read-only compatibility review and scenario walkthrough.
- Scoped Prettier and whitespace checks.
- Existing coordination test suite and zone coverage validation.
- Authenticated scope verification and release.

## Integrator Decision

- Approved by the user on 2026-09-07 after reviewing the proposed safeguards and explicitly requesting implementation.
- The main agent integrates the approved instruction-only change within the claimed scope; no protocol implementation or phase scope expansion is authorized.
