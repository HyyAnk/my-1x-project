# Prompt: Phase 3 Diff Guard

Use this prompt in a fresh chat to prevent out-of-scope edits from slipping through.

```text
You are implementing Phase 3 of the Agent Coordination Protocol.

Required source-of-truth files to read before acting:
- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/runtime-layout.md
- .agent-orchestrator/zones.yml
- docs/agent-coordination/archive/phase-2-claim-release.md
- docs/agent-coordination/templates/phase-handoff-summary.md

Goal:
- Implement a diff guard that compares changed files against the active claim scope and baseline, then fails when an agent edited outside its authorized zones.

Allowed scope:
- agent-verify-claim command.
- Tests for diff-to-zone matching.
- Optional local hook documentation.
- Handoff summary for Phase 3.

Forbidden scope:
- Do not change product runtime behavior.
- Do not make hooks destructive.
- Do not auto-revert user changes.
- Do not force pre-commit installation unless explicitly approved.
- Do not expand the claim registry model beyond what the diff guard needs.

Required workflow:
1. Inspect the Phase 2 command interfaces.
2. Read active claim data.
3. Read the claim-time baseline snapshot.
4. Collect changed files with Git from the current main checkout.
5. Separate pre-existing baseline changes from new or modified files that appeared after claim creation.
6. Map changed files to zones using .agent-orchestrator/zones.yml.
7. Pass when every new or modified file outside the baseline is covered by the active claim.
8. Fail with a concise explanation when a file requires a missing zone.
9. Explain how to run agent-expand before continuing.
10. Write Phase 3 handoff summary.

Verification:
- A claimed zone with matching changed files passes.
- A changed file outside the claim fails.
- A pre-existing dirty file from the baseline does not fail unless it changed after claim creation or is inside the current agent's claimed work.
- A file matching no zone fails with a useful message.
- Released claims cannot authorize new changes.
- Tests or smoke checks are recorded in the handoff.

Exit criteria:
- Agents can verify scope before completion.
- Integrator can reject work that exceeds its declared claim.
```
