# Prompt: Phase 2 Lightweight Claim And Release

Use this prompt in a fresh chat to implement the first working claim registry.

```text
You are implementing Phase 2 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- .agent-orchestrator/zones.yml
- docs/agent-coordination/archive/phase-1-zone-map.md
- docs/agent-coordination/templates/phase-handoff-summary.md
- docs/agent-coordination/templates/claim-record.md

Goal:
- Implement lightweight local commands that let agents view active claims, create claims, expand claims, release claims, and clean stale claims.
- Support main-direct mode by recording the dirty workspace baseline when each claim starts.

Allowed scope:
- Agent coordination scripts.
- Agent coordination tests.
- .agent-orchestrator local-state docs or samples.
- Handoff summary for Phase 2.
- Git ignore updates only if needed for local claim state.

Forbidden scope:
- Do not modify product application behavior.
- Do not edit render, prompt, pipeline, web UI, API behavior, or shared product schemas.
- Do not implement pre-commit or CI enforcement yet unless it is purely documented for Phase 3.
- Do not create a long-running service.

Required workflow:
1. Inspect existing script and test conventions.
2. Choose the smallest local registry format that supports atomic status, claim, expand, release, TTL, stale cleanup, and claim-time baseline snapshots.
3. Prefer SQLite if the repository already has a practical runtime path for it; otherwise use JSON with atomic write safeguards.
4. Implement commands with clear structured output.
5. Block conflicting writes to exclusive zones.
6. Require claim expansion before an agent can add zones to active scope.
7. Capture git status, changed file paths, and base revision at claim creation time.
8. Preserve completed or released claim history enough for handoff and cleanup.
9. Write Phase 2 handoff summary.

Required commands:
- agent-status
- agent-claim
- agent-expand
- agent-release
- agent-cleanup-stale

Verification:
- Show that an exclusive zone cannot be claimed by two active claims.
- Show that non-conflicting zones can be claimed independently.
- Show that an expired claim can be reported or cleaned.
- Show that a claim records the dirty baseline before edits.
- Run the focused tests or smoke commands and record output in the handoff.

Exit criteria:
- A future agent can claim and release zones without reading chat history.
- A future Phase 3 agent can query active claim scope and baseline data for diff verification.
```
