# Cleanup And Archive Guide

The coordination system should not leave a pile of stale working files after implementation.

## Keep Long Term

Keep these files if the protocol is useful:

- `docs/agent-coordination/README.md`
- `docs/agent-coordination/master-spec.md`
- `docs/agent-coordination/phase-roadmap.md`
- `docs/agent-coordination/runtime-layout.md`
- `docs/agent-coordination/prompts/`
- `.agent-orchestrator/zones.yml`
- Stable agent coordination scripts and tests.

## Archive Or Remove After Completion

Review these after Phase 5:

- Phase handoff summaries.
- Temporary claim records.
- Local SQLite databases.
- Heartbeat files.
- Stale lock files.
- Generated status reports.
- Experimental scripts that were superseded by stable commands.

## Cleanup Rules

- Never delete active claims.
- Never delete handoff summaries until the integrator has written the final integration report.
- Never remove a script that is referenced by `AGENTS.md`, `zones.yml`, a hook, or CI.
- Prefer archiving over deleting when the artifact explains an architectural decision.
- Before cleanup, record the action in `templates/cleanup-manifest.md`.

## Final Cleanup Checklist

- All claims are released or archived.
- No active heartbeat belongs to a completed phase.
- All temporary files are either removed or listed in the cleanup manifest.
- Durable docs point to current commands and paths.
- The final integration report says which verification commands passed.
