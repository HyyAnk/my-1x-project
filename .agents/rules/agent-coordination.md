---
trigger: manual
---

# Agent Coordination Protocol (Deprecated)

> [!NOTE]
> The legacy token-based claim and release coordination system (`agent-claim.mjs`, `agent-verify-claim.mjs`, `agent-release.mjs`) has been decommissioned as part of the System Streamlining Master Plan.
> Agents do NOT need to acquire claims, manage lease tokens, or verify claims before editing or committing code.

## Operational Guidelines

1. Follow the clean code and modular architecture standards defined in `AGENTS.md`.
2. Adhere strictly to the English-only rules defined in `.agents/rules/english-only.md`.
3. Respect pre-existing dirty files in the workspace: modify only files within the assigned scope.
4. Run standard test and type-check verification suites relevant to your task before completion.

