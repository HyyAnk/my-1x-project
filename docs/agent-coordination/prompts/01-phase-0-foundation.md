# Prompt: Phase 0 Foundation

Use this prompt in a fresh chat to establish the project-level operating rules.

```text
You are implementing Phase 0 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- docs/agent-coordination/templates/phase-handoff-summary.md

Goal:
- Establish durable instructions that future coding agents can follow without relying on chat history.

Allowed scope:
- Agent coordination docs.
- Agent-facing instruction files if the repository already uses them.
- Handoff folder creation.
- Cleanup guidance.

Forbidden scope:
- Do not implement claim CLI.
- Do not implement diff guard.
- Do not create a runtime orchestrator.
- Do not modify product application behavior.
- Do not edit render, prompt, image generation, pipeline, web UI, or shared product schemas.

Required workflow:
1. Inspect the existing project instruction files and docs structure.
2. Decide where the permanent coordination instructions belong.
3. Add or update only the minimal files needed for Phase 0.
4. Create docs/agent-coordination/handoffs/ if it does not exist.
5. Write docs/agent-coordination/handoffs/phase-0-foundation.md using the handoff template.

Verification:
- Confirm the docs can be followed from a fresh chat.
- Confirm no product runtime files were changed.
- Run git diff --name-only and list the changed files in the handoff.

Exit criteria:
- Future agents know which files to read.
- Future agents know they must edit directly on main and must not create branches or worktrees unless the user explicitly changes that rule.
- Future agents know they must record the dirty workspace baseline before editing.
- Future agents know that high-risk zones need ownership.
- The next phase can build the zone map without asking for missing context.
```
