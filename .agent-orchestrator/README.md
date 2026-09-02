# Agent Orchestrator Zone Architecture

`zones.yml` is the ownership map used by the Agent Coordination Protocol. It defines one unambiguous owner zone for every product file under `apps/`, `packages/`, and `services/`, plus operational zones for coordination and generated resources.

## Lock Policies

- `exclusive`: one writer for high-risk contracts or shared orchestration.
- `shared-disjoint`: concurrent writers are allowed only when their concrete planned files do not overlap. An empty planned-file list owns the entire zone.
- `runtime`: exclusive coordination for processes, ports, databases, and generated outputs.

`shared-contracts`, `api-contracts`, `task-status-progress`, `artifact-contracts`, `server-pipeline`, `render-inputs`, `project-configuration`, and `agent-coordination` are high-risk exclusive zones. Lower-risk feature zones use `shared-disjoint`; runtime resources use `runtime`.

## Required Lifecycle

```powershell
node scripts/agent-status.mjs --json
node scripts/agent-claim.mjs --agent <agent> --task "<task>" --write <zones> --planned-files <concrete-paths> --json
node scripts/agent-heartbeat.mjs --claim <claim-id> --token <lease-token> --json
node scripts/agent-expand.mjs --claim <claim-id> --token <lease-token> --add-write <zones> --add-planned-files <concrete-paths> --json
node scripts/agent-verify-claim.mjs --claim <claim-id> --token <lease-token> --evidence "<commands and results>" --json
node scripts/agent-release.mjs --claim <claim-id> --token <lease-token> --json
```

The raw lease token appears only in the claim response. Keep it in the current agent session; SQLite stores only its SHA-256 hash. Status, history, and queue output are secret-free.

Do not edit beyond the claim. Expand first and proceed only after expansion succeeds. Do not edit after successful verification, and do not commit while the claim is active. Release requires fresh successful evidence and rechecks the repository fingerprint transactionally.

## Inspection And Recovery

- Status: `node scripts/agent-status.mjs --integrator --json`
- Queue: `node scripts/agent-queue.mjs --json`
- Zone coverage: `node scripts/agent-validate-zones.mjs --json`
- Stale preview: `node scripts/agent-cleanup-stale.mjs --dry-run --json`
- Stale cleanup: `node scripts/agent-cleanup-stale.mjs --json`

Windows `.cmd` wrappers exist for every command. Human output is structured and color-capable; JSON output contains no ANSI escapes.

## Local State And Limits

Local state lives in `.agent-orchestrator/state/claims.db` and is ignored by Git. Conflict checks and writes use SQLite immediate transactions, so concurrent claim attempts serialize without a daemon.

This is a cooperative enforcement layer, not an OS filesystem ACL. An unrestricted process can bypass it, so integrators must reject active, unverified, stale, unmapped, or overlapping work.
