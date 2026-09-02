# Prompt: Phase 5 Final Integration And Cleanup

Use this prompt after the protocol has been implemented and verified.

```text
You are implementing Phase 5 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- docs/agent-coordination/cleanup-and-archive.md
- .agent-orchestrator/zones.yml if it exists
- The current handoff summaries plus completed phase summaries in `docs/agent-coordination/archive/`
- docs/agent-coordination/templates/integration-report.md
- docs/agent-coordination/templates/cleanup-manifest.md

Goal:
- Verify the completed coordination protocol, document final behavior, and clean or archive temporary implementation artifacts.

Allowed scope:
- Integration report.
- Cleanup manifest.
- Archive folder for old handoff summaries if needed.
- Documentation updates that reflect the final implemented commands.
- Removal of stale temporary state after confirming it is not active.

Forbidden scope:
- Do not delete active claims.
- Do not remove durable docs, zone maps, tests, or scripts that the protocol still uses.
- Do not modify product runtime behavior.
- Do not hide failed verification.

Required workflow:
1. Review every phase handoff summary.
2. Confirm all claims are released or intentionally archived.
3. Run the final coordination verification commands.
4. Write an integration report.
5. Write a cleanup manifest before deleting or archiving anything.
6. Clean only artifacts listed in the cleanup manifest.
7. Update docs if paths or commands changed during implementation.

Verification:
- agent-status shows no unexpected active claims.
- agent-verify-claim behavior is documented and tested.
- Durable docs point to real implemented commands.
- Cleanup manifest records all removed or archived artifacts.

Exit criteria:
- A fresh agent can use the protocol from the durable docs.
- Temporary state is removed or archived.
- The user can see exactly what remains and why.
```
