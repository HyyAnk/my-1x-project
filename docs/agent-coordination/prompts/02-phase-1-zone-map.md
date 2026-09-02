# Prompt: Phase 1 Zone Map

Use this prompt in a fresh chat to define the first real zone map.

```text
You are implementing Phase 1 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- docs/agent-coordination/archive/phase-0-foundation.md if it exists
- docs/agent-coordination/templates/phase-handoff-summary.md

Goal:
- Create .agent-orchestrator/zones.yml with named project zones, file globs, risk levels, lock policies, dependencies, and verification expectations.

Allowed scope:
- .agent-orchestrator/zones.yml
- .agent-orchestrator/README.md if helpful
- docs/agent-coordination/handoffs/phase-1-zone-map.md
- Small documentation notes directly supporting the zone map

Forbidden scope:
- Do not implement claim CLI.
- Do not implement diff guard.
- Do not modify product runtime code.
- Do not change shared schemas, render code, web UI, pipeline, or API behavior.

Required workflow:
1. Inspect the repository structure and current high-risk areas.
2. If CodeGraph is available for this repository, use it before manual grep-style code exploration.
3. Define zones at responsibility boundaries, not tiny file-by-file locks.
4. Mark high-risk zones as exclusive.
5. Mark lower-risk leaf work as shared-disjoint where safe.
6. Add read-stable dependencies for zones that depend on shared contracts.
7. Write the handoff summary for Phase 1.

Recommended starter zones:
- shared-contracts
- api-contracts
- task-status-progress
- artifact-contracts
- server-pipeline
- render-inputs
- render-implementation
- image-thumbnail-prompt
- web-api-state
- web-layout-style
- generated-artifacts
- runtime-resources

Verification:
- Confirm every high-risk area named in master-spec.md is represented.
- Confirm globs are not so broad that all work blocks all other work.
- Confirm git diff contains only coordination files.

Exit criteria:
- A future Phase 2 agent can map a requested task to one or more zones.
- A future claim tool has enough metadata to detect obvious conflicts.
```
