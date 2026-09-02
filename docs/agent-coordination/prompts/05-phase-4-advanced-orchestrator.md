# Prompt: Phase 4 Advanced Orchestrator

Use this prompt only after Phase 2 and Phase 3 are useful in real work.

```text
You are implementing Phase 4 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- .agent-orchestrator/zones.yml
- docs/agent-coordination/archive/phase-3-diff-guard.md
- docs/agent-coordination/templates/phase-handoff-summary.md

Goal:
- Add advanced coordination only where the lightweight protocol has proven insufficient.

Allowed scope:
- Heartbeat support.
- Dead claim detection.
- Read-stable dependency conflict detection.
- Integration queue metadata.
- Status reporting for integrator review.
- Handoff summary for Phase 4.

Forbidden scope:
- Do not replace the existing claim CLI unless the migration is small and backward compatible.
- Do not add a long-running service unless the user explicitly approves it.
- Do not introduce external dependencies without a concrete benefit and compatibility check.
- Do not create a dashboard unless the user explicitly asks for one.

Required workflow:
1. Review pain points from Phase 2 and Phase 3 handoff summaries.
2. Add only the smallest advanced mechanism that solves a recorded pain point.
3. Implement heartbeat and stale-claim handling before adding optional queue features.
4. Add read-stable conflict checks for shared contracts and other high-risk dependencies.
5. Preserve existing command names and behavior where possible.
6. Write Phase 4 handoff summary.

Verification:
- A stale heartbeat is detected.
- A live heartbeat prevents accidental cleanup.
- A write claim conflicts with another claim that holds the same zone as read-stable when policy requires stability.
- Existing Phase 2 and Phase 3 checks still pass.

Exit criteria:
- Integrator can see active, stale, blocked, and releasable claims.
- Advanced coordination adds value without making one-agent work heavy.
```
